# -*- coding: utf-8 -*-
"""
Export du schema reel (DDL) de l'instance Supabase via l'API Management.

Plus fiable que migrations/ du repo (potentiellement drift).

Usage :
    SUPABASE_ACCESS_TOKEN=sbp_xxx python scripts/export_schema_ddl.py [--out output/migration-...]

Produit <out>/schema/ : tables.sql, indexes.sql, functions.sql, triggers.sql,
policies.sql, sequences.sql (DDL regeneres via pg_get_*).
"""

import argparse
import io
import json
import os
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
REF = os.environ.get("SUPABASE_REF", "sqyzhswppssvrkzbuyhd")
API = "https://api.supabase.com/v1"

QUERIES = {
    "tables.sql": """
        SELECT format('CREATE TABLE %I.%I (%%s);', schemaname, tablename) AS ddl, tablename
        FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    """,
    "columns.sql": """
        SELECT table_name, ordinal_position, column_name, data_type,
               character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    """,
    "indexes.sql": """
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes WHERE schemaname IN ('public') ORDER BY tablename, indexname
    """,
    "functions.sql": """
        SELECT p.proname, pg_get_functiondef(p.oid) AS def
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind = 'f'
        ORDER BY p.proname
    """,
    "auth_functions.sql": """
        SELECT p.proname, pg_get_functiondef(p.oid) AS def
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('auth','extensions')
          AND p.prokind = 'f' ORDER BY p.proname
    """,
    "triggers.sql": """
        SELECT event_object_table, trigger_name, action_timing,
               event_manipulation, event_object_schema
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        ORDER BY event_object_table, trigger_name
    """,
    "trigger_defs.sql": """
        SELECT c.relname AS table, tg.tgname AS trigger,
           pg_get_triggerdef(tg.oid) AS def
        FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT tg.tgisinternal
        ORDER BY c.relname
    """,
    "policies.sql": """
        SELECT schemaname, tablename, policyname, permissive, roles, cmd,
               qual, with_check
        FROM pg_policies WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    """,
    "sequences.sql": """
        SELECT sequencename, start_value, min_value, max_value, increment_by, cycle
        FROM pg_sequences WHERE schemaname = 'public'
    """,
    "grants.sql": """
        SELECT table_name, grantee, privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
        ORDER BY table_name, grantee, privilege_type
    """,
    "extensions.sql": "SELECT extname, extversion FROM pg_extension ORDER BY extname",
    "types.sql": """
        SELECT t.typname, n.nspname,
               CASE WHEN t.typtype='e' THEN
                 (SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
                  FROM pg_enum e WHERE e.enumtypid = t.oid)
               ELSE NULL END AS labels
        FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
    """,
}


def q(token: str, sql: str):
    r = requests.post(
        f"{API}/projects/{REF}/database/query",
        headers={"Authorization": f"Bearer {token}"},
        json={"query": sql},
        timeout=90,
    )
    r.raise_for_status()
    return r.json()


def rows_to_sql_inserts(table_label: str, rows) -> str:
    """Dump JSON-like : un objet par ligne, lisible pour reconstruction."""
    out = [f"-- {table_label} ({len(rows)} lignes)"]
    for row in rows:
        out.append(json.dumps(row, ensure_ascii=False, default=str))
    return "\n".join(out)


def main():
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        sys.exit("SUPABASE_ACCESS_TOKEN requis (sbp_...)")
    ap = argparse.ArgumentParser()
    default_out = next(iter(sorted((REPO_ROOT / "output").glob("migration-*"))),
                        REPO_ROOT / "output" / "migration")
    ap.add_argument("--out", default=str(default_out))
    args = ap.parse_args()
    out = Path(args.out) / "schema"
    out.mkdir(parents=True, exist_ok=True)

    for fname, sql in QUERIES.items():
        try:
            rows = q(token, sql)
        except Exception as e:  # certaines vues differentes selon PG
            print(f"{fname}: erreur {e} — retry simplifié")
            try:
                rows = q(token, sql.replace("pg_extensions", "pg_extension"))
            except Exception as e2:
                (out / fname).write_text(f"-- ÉCHEC: {e2}", encoding="utf-8")
                continue
        text = rows_to_sql_inserts(fname, rows if isinstance(rows, list) else [rows])
        (out / fname).write_text(text, encoding="utf-8")
        n = len(rows) if isinstance(rows, list) else 1
        print(f"{fname}: {n}")
    print(f"\nDDL exporté -> {out}")


if __name__ == "__main__":
    main()
