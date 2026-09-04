# -*- coding: utf-8 -*-
"""
Genere auth_import.sql pour GoTrue standalone (VPS).

Sequence VPS (a executer dans cet ordre) :
  1. DROP SCHEMA auth CASCADE            (supprime le pont + FK public->auth.users)
  2. docker compose up -d gotrue         (migrations GoTrue creent auth schema)
  3. psql -f auth_import.sql             (fonctions auth.*, users, identities, FK, triggers)

Lit : output/migration-2026-09-04/auth/auth_users.jsonl, auth_identities.jsonl,
      output/migration-2026-09-04/schema/{constraints,trigger_defs}.sql
"""

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "output" / "migration-2026-09-04"
OUT = REPO / "output" / "vps-sql" / "auth_import.sql"


def read_jsonl(p: Path):
    rows = []
    for line in p.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("--"):
            rows.append(json.loads(line))
    return rows


def sql(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    s = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
    return "'" + s.replace("'", "''") + "'"


def main():
    users = read_jsonl(SRC / "auth" / "auth_users.jsonl")
    identities = read_jsonl(SRC / "auth" / "auth_identities.jsonl")

    S = []
    S.append("-- auth_import.sql : support GoTrue standalone (generated)")
    S.append("-- ============ 1. fonctions auth.* (compat RLS/PostgREST) ============")
    S.append("""
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

    S.append("-- ============ 2. import users (triggers desactives) ============")
    S.append("ALTER TABLE auth.users DISABLE TRIGGER ALL;")
    S.append("ALTER TABLE auth.identities DISABLE TRIGGER ALL;")
    if users:
        cols = sorted(users[0].keys())
        # confirmed_at est GENERATED dans le schema GoTrue v2.187 -> a exclure
        cols = [c for c in cols if c != "confirmed_at"]
        rows_sql = []
        for u in users:
            rows_sql.append("(" + ", ".join(sql(u.get(c)) for c in cols) + ")")
        S.append(
            f'INSERT INTO auth.users ({", ".join(cols)}) VALUES\n' + ",\n".join(rows_sql) + ";"
        )
    if identities:
        cols = sorted(identities[0].keys())
        # identities.email est GENERATED dans le schema GoTrue v2.187
        cols = [c for c in cols if c != "email"]
        rows_sql = []
        for i in identities:
            rows_sql.append("(" + ", ".join(sql(i.get(c)) for c in cols) + ")")
        S.append(
            f'INSERT INTO auth.identities ({", ".join(cols)}) VALUES\n' + ",\n".join(rows_sql) + ";"
        )
    S.append("ALTER TABLE auth.users ENABLE TRIGGER ALL;")
    S.append("ALTER TABLE auth.identities ENABLE TRIGGER ALL;")

    S.append("-- ============ 3. FK public -> auth.users (restauration) ============")
    for line in (SRC / "schema" / "constraints.sql").read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        k = json.loads(line)
        if k.get("contype") != "f" or "REFERENCES auth.users" not in k.get("def", ""):
            continue
        tbl = k["table"].replace("public.", "")
        S.append(
            f'ALTER TABLE public."{tbl}" ADD CONSTRAINT "{k["conname"]}" {k["def"]};'
        )

    S.append("-- ============ 4. triggers metier (sur auth.users) ============")
    for line in (SRC / "schema" / "trigger_defs.sql").read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        t = json.loads(line)
        if "auth.users" not in t.get("def", ""):
            continue
        S.append(f'DROP TRIGGER IF EXISTS "{t["trigger"]}" ON auth.users;')
        S.append(t["def"].rstrip(" ;") + ";")

    # Triggers auth.users non exportes (filtre public du dump) : recreation
    # manuelle (recuperes depuis le cloud via /database/query).
    S.append("""
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
""")

    OUT.write_text("\n".join(S) + "\n", encoding="utf-8")
    print(f"users={len(users)} identities={len(identities)}")
    print(f"genere: {OUT} ({OUT.stat().st_size} octets)")


if __name__ == "__main__":
    main()