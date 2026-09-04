# -*- coding: utf-8 -*-
# Export SQL direct de auth.users / auth.identities / auth.instances (GoTrue cloud)
# via l'API Management, vers JSONL pour import dans GoTrue standalone.
import json
import os
import sys
from pathlib import Path

import requests

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = os.environ.get("SUPABASE_REF", "sqyzhswppssvrkzbuyhd")
OUT = Path(os.environ.get("OUT_DIR", r"output\migration-2026-09-04\auth"))


def q(sql: str):
    r = requests.post(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={"query": sql},
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for table in ("users", "identities", "instances"):
        rows = q(f"SELECT * FROM auth.{table}")
        with open(OUT / f"auth_{table}.jsonl", "w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
        print(f"auth.{table}: {len(rows)}")
    # colonnes reelles pour generer les INSERT corrects
    cols = q("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name IN ('users','identities','instances') ORDER BY table_name, ordinal_position")
    print("colonnes:", len(cols))


if __name__ == "__main__":
    main()