# -*- coding: utf-8 -*-
"""
Construit schema.sql + data.sql pour Postgres 16 + pgvector (VPS) a partir
de l'export JSONL/JSON de l'instance Supabase (scripts/export_*).

Principe :
- on remplace GoTrue par une table pont auth.users (memes colonnes utiles) :
  les FK existantes restent valides, better-auth (phase 3 frontend) ecrira
  dedans via un hook, et auth.uid()/auth.jwt() lisent request.jwt.claims.
- RLS conservee comme defense en profondeur (policies portees telles quelles).
- roles anon/authenticated/service_role recrees pour compat.

Usage :
    python scripts/build_vps_sql.py [--src output/migration-2026-09-04] [--out output/vps-sql]
"""

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Ordre d'import des donnees (referentielles d'abord)
TABLE_ORDER = [
    "user_profiles",          # FK -> auth.users (via pont)
    "user_settings",
    "stripe_events",
    "job_offers_v2",
    "search_history",
    "saved_jobs",
    "applications_v2",        # FK -> auth.users
    "chat_sessions",          # FK -> applications_v2
    "notifications",
    "usage_logs",
]

# Fonctions app a porter (le reste de functions.sql = internals pgvector)
APP_FUNCTIONS = {
    "cleanup_old_stripe_events",
    "get_user_id_by_email",
    "get_user_monthly_usage",
    "set_updated_at",
    "check_and_use_search_quota",
    "check_and_reset_credits",
    "debit_credit",
    "check_and_reset_jobyjoba_daily",
    "increment_jobyjoba_message",
    "match_jobs",
    "handle_new_user",
    "handle_new_user_settings",
    "handle_updated_at",
    "update_updated_at_column",
}

PG_TYPES = {
    "integer": "integer", "bigint": "bigint", "smallint": "smallint",
    "text": "text", "boolean": "boolean", "date": "date",
    "timestamp without time zone": "timestamp",
    "timestamp with time zone": "timestamptz",
    "time without time zone": "time",
    "uuid": "uuid", "json": "json", "jsonb": "jsonb",
    "character varying": "character varying",
    "character": "character",
}


def read_jsonl(path: Path):
    rows = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("--"):
            continue
        rows.append(json.loads(line))
    return rows


def pg_array_literal(items) -> str:
    """['a','b'] -> '{a,"b"}' (standard text[]), echappement backslash des quotes."""
    parts = []
    for it in items:
        if isinstance(it, (dict, list)):
            s = json.dumps(it, ensure_ascii=False)
            parts.append('"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"')
        elif isinstance(it, bool):
            parts.append("true" if it else "false")
        elif it is None:
            parts.append("NULL")
        elif isinstance(it, (int, float)):
            parts.append(str(it))
        else:
            s = str(it)
            if s == "" or any(ch in s for ch in ' ",{}\\\t\n'):
                parts.append('"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"')
            else:
                parts.append(s)
    return "'{" + ",".join(parts) + "}'"


def sql_str(v, array_col: bool = False) -> str:
    if v is None:
        return "NULL"
    if array_col and isinstance(v, list):
        return pg_array_literal(v)
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    s = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
    return "'" + s.replace("'", "''") + "'"


def col_type(row, udt_map) -> str:
    t = row["data_type"]
    if t == "ARRAY":
        udt = udt_map.get((row["table_name"], row["column_name"]), "")
        if udt.startswith("_"):
            return udt[1:] + "[]"
        return "text[]"
    if t == "USER-DEFINED":
        # enums/types composites : on garde le nom udt (crees par l'extension
        # vector ou par les enums publics portees ci-dessous)
        return udt_map.get((row["table_name"], row["column_name"]), t)
    if row.get("character_maximum_length") and t in ("character varying", "character"):
        return f"{t}({row['character_maximum_length']})"
    return PG_TYPES.get(t, t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(REPO / "output" / "migration-2026-09-04"))
    ap.add_argument("--out", default=str(REPO / "output" / "vps-sql"))
    args = ap.parse_args()
    src, out = Path(args.src), Path(args.out)
    sch = src / "schema"
    out.mkdir(parents=True, exist_ok=True)

    columns = read_jsonl(sch / "columns.sql")
    udt_map = {}
    udt_path = sch / "udt.jsonl"
    if udt_path.exists():
        for r in read_jsonl(udt_path):
            udt_map[(r["table_name"], r["column_name"])] = r["udt_name"]
    enums = read_jsonl(sch / "types.sql")
    constraints = read_jsonl(sch / "constraints.sql")
    indexes = read_jsonl(sch / "indexes.sql")
    functions = read_jsonl(sch / "functions.sql")
    trigger_defs = read_jsonl(sch / "trigger_defs.sql")
    policies = read_jsonl(sch / "policies.sql")

    tables = sorted({c["table_name"] for c in columns})

    S = []  # schema.sql
    S.append("""
-- ============ 0. extensions & roles ============
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
""")

    S.append("""
-- ============ 1. schema auth (pont better-auth / JWT) ============
CREATE SCHEMA IF NOT EXISTS auth;

-- Table pont : GoTrue-like minimale. better-auth y syncronise ses users via hook.
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    phone text,
    email_confirmed_at timestamptz,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    aud text DEFAULT 'authenticated',
    role text DEFAULT 'authenticated',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_sign_in_at timestamptz,
    banned_at timestamptz,
    encrypted_password text
);

-- Compat RLS/SQL : claims JWT injectes par PostgREST ou par l'API (SET request.jwt.claims)
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.role', true), ''), auth.jwt() ->> 'role', 'anon')
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() ->> 'email', nullif(current_setting('request.jwt.claim.email', true), ''))
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
""")

    # ---- enums publics (crees avant les tables) ----
    S.append("-- ============ 1.5 enums publics ============")
    for ty in enums:
        if ty.get("labels") and ty.get("typname"):
            vals = ", ".join(sql_str(v) for v in ty["labels"].split(","))
            S.append(
                f"DO $$ BEGIN CREATE TYPE public.{ty['typname']} AS ENUM ({vals}); "
                "EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    # ---- tables ----
    by_table = {}
    for c in columns:
        by_table.setdefault(c["table_name"], []).append(c)
    S.append("-- ============ 2. tables ============")
    for t in tables:
        cols = sorted(by_table[t], key=lambda c: c["ordinal_position"])
        defs = []
        for c in cols:
            d = f'    "{c["column_name"]}" {col_type(c, udt_map)}'
            if c.get("column_default"):
                d += f' DEFAULT {c["column_default"]}'
            d += " NOT NULL" if c["is_nullable"] == "NO" else ""
            defs.append(d)
        S.append(f'CREATE TABLE IF NOT EXISTS public."{t}" (\n' + ",\n".join(defs) + "\n);")

    # ---- constraints ----
    S.append("-- ============ 3. contraintes ============")
    for k in constraints:
        tbl = k["table"].replace("public.", "")
        # CASCADE : necessary pour les PK/UK referencees par des FK (imports idempotents)
        S.append(
            f'ALTER TABLE public."{tbl}" DROP CONSTRAINT IF EXISTS "{k["conname"]}" CASCADE;')
        S.append(
            f'ALTER TABLE public."{tbl}" ADD CONSTRAINT "{k["conname"]}" {k["def"]};')

    # ---- fonctions app (apres les tables, avant les triggers) ----
    S.append("-- ============ 4. fonctions ============")
    S.append("SET search_path TO public, auth, extensions;")
    seen = set()
    for f in functions:
        name = f["proname"]
        if name not in APP_FUNCTIONS or name in seen:
            continue
        seen.add(name)
        S.append(f["def"].rstrip(" ;") + ";")
    for name in sorted(APP_FUNCTIONS - seen):
        S.append(f"-- ATTENTION: fonction absente de l'export: {name}")
    S.append("RESET search_path;")

    # ---- triggers ----
    S.append("-- ============ 5. triggers ============")
    for t in trigger_defs:
        S.append(f'DROP TRIGGER IF EXISTS "{t["trigger"]}" ON public."{t["table"]}";')
        S.append(t["def"].rstrip(" ;") + ";")

    # ---- RLS + policies ----
    S.append("-- ============ 6. RLS & policies ============")
    for t in tables:
        S.append(f'ALTER TABLE public."{t}" ENABLE ROW LEVEL SECURITY;')
    for p in policies:
        roles_raw = p["roles"]
        if isinstance(roles_raw, list):
            roles = ", ".join(roles_raw)
        else:
            # pg_policies.roles arrivee en texte type '{authenticated,anon}'
            roles = str(roles_raw).strip("{}").replace(",", ", ")
        cmd = {"ALL": "ALL", "S": "SELECT", "I": "INSERT", "U": "UPDATE", "D": "DELETE"}.get(p["cmd"], p["cmd"])
        stmt = (
            f'CREATE POLICY "{p["policyname"]}" ON public."{p["tablename"]}" '
            f'AS {p["permissive"]} FOR {cmd} TO {roles}'
        )
        if p.get("qual"):
            stmt += f' USING ({p["qual"]})'
        if p.get("with_check"):
            stmt += f' WITH CHECK ({p["with_check"]})'
        S.append(f'DROP POLICY IF EXISTS "{p["policyname"]}" ON public."{p["tablename"]}";')
        S.append(stmt + ";")

    # ---- grants ----
    S.append("-- ============ 7. grants ============")
    S.append("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;")
    for t in tables:
        S.append(f'GRANT SELECT, INSERT, UPDATE, DELETE ON public."{t}" TO anon, authenticated, service_role;')
    S.append("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;")

    (out / "schema.sql").write_text("\n".join(S) + "\n", encoding="utf-8")

    # ---- data.sql (auth bridge + tables) ----
    D = []
    auth_path = src / "auth_users.jsonl"
    if auth_path.exists():
        D.append("-- ==== auth.users (pont) ====")
        for line in auth_path.read_text(encoding="utf-8-sig").splitlines():
            if not line.strip():
                continue
            u = json.loads(line)
            meta = u.get("user_metadata") or {}
            app = u.get("app_metadata") or {}
            email = (u.get("email") or "").strip() or None  # vides -> NULL (UNIQUE tolerant)
            D.append(
                "INSERT INTO auth.users (id, email, phone, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, last_sign_in_at, banned_at, encrypted_password) VALUES ({});".format(
                    ", ".join([
                        sql_str(u.get("id")), sql_str(email),
                        sql_str(u.get("phone")),
                        sql_str(u.get("email_confirmed_at")),
                        sql_str(meta), sql_str(app),
                        sql_str(u.get("aud") or "authenticated"),
                        sql_str(u.get("role") or "authenticated"),
                        sql_str(u.get("created_at")), sql_str(u.get("created_at")),
                        sql_str(u.get("last_sign_in_at")), sql_str(u.get("banned_until")),
                        sql_str(u.get("encrypted_password")),
                    ])))
        D.append("-- sequences/now() ok")

    array_cols = {}
    for c in columns:
        if c["data_type"] == "ARRAY":
            array_cols.setdefault(c["table_name"], set()).add(c["column_name"])

    for t in TABLE_ORDER:
        fp = src / "tables" / f"{t}.jsonl"
        if not fp.exists():
            D.append(f"-- table export absente: {t}")
            continue
        rows = read_jsonl(fp)
        if not rows:
            continue
        cols = sorted(rows[0].keys())
        acols = array_cols.get(t, set())
        D.append(f"-- ==== {t} ({len(rows)}) ====")
        vals = []
        for r in rows:
            vals.append("(" + ", ".join(
                sql_str(r.get(c), array_col=(c in acols)) for c in cols) + ")")
        D.append(
            f'INSERT INTO public."{t}" (' + ", ".join(f'"{c}"' for c in cols) + ") VALUES\n"
            + ",\n".join(vals) + ";")

    # tables exportees mais absentes de TABLE_ORDER
    for t in tables:
        if t not in TABLE_ORDER:
            fp = src / "tables" / f"{t}.jsonl"
            rows = read_jsonl(fp) if fp.exists() else []
            if rows:
                cols = sorted(rows[0].keys())
                acols = array_cols.get(t, set())
                D.append(f"-- ==== {t} (fin) ====")
                vals = ["(" + ", ".join(
                    sql_str(r.get(c), array_col=(c in acols)) for c in cols) + ")" for r in rows]
                D.append(f'INSERT INTO public."{t}" (' + ", ".join(f'"{c}"' for c in cols) + ") VALUES\n" + ",\n".join(vals) + ";")

    D.append("-- reset des sequences (aucune utilisee mais au cas ou)")
    (out / "data.sql").write_text("\n".join(D) + "\n", encoding="utf-8")

    print(f"schema.sql: {(out / 'schema.sql').stat().st_size} o, data.sql: {(out / 'data.sql').stat().st_size} o")
    print(f"tables: {len(tables)}, fonctions portees: {len(seen)}")


if __name__ == "__main__":
    main()
