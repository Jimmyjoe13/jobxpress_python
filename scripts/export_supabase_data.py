# -*- coding: utf-8 -*-
"""
Export complet de l'instance Supabase JobXpress vers des fichiers JSONL locaux.

Prérequis : SUPABASE_URL + SUPABASE_SERVICE_KEY dans job_xpress/.env (non commité).
Usage :
    python scripts/export_supabase_data.py [--out output/migration]

Produit :
    <out>/tables/<table>.jsonl        — toutes les tables publiques
    <out>/auth_users.jsonl            — comptes auth (via API admin, emails/métadonnées,
                                         NOTE: les hash bcrypt de GoTrue ne transitent PAS
                                         par l'API admin -> cf. option pg_dump)
    <out>/storage/<bucket>/...        — fichiers (avatars, CV)
    <out>/manifest.json               — comptes + hashes SHA256 pour vérifier l'import

Les données contiennent de la PII : ne jamais commiter le dossier de sortie.
"""

import argparse
import hashlib
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = REPO_ROOT / "job_xpress" / ".env"

TABLES = [
    "user_profiles",
    "applications_v2",
    "chat_sessions",
    "notifications",
    "user_settings",
    "search_history",
    "saved_jobs",
    "usage_logs",
    "job_offers_v2",
    "stripe_events",
]


def load_env() -> dict:
    """Parse le .env sans dépendance externe, retourne {url, service_key}."""
    env = {}
    for line in io.open(ENV_FILE, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_KEY manquants dans job_xpress/.env")
    return {"url": url, "key": key}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def export_table(env: dict, table: str, out_dir: Path) -> int:
    """Exporte une table par pagination Range (1000/page) en JSONL."""
    rows_dir = out_dir / "tables"
    rows_dir.mkdir(parents=True, exist_ok=True)
    dest = rows_dir / f"{table}.jsonl"
    headers = {
        "apikey": env["key"],
        "Authorization": f"Bearer {env['key']}",
        "Range": "0-999",
        "Range-Unit": "items",
    }
    total = 0
    with open(dest, "w", encoding="utf-8") as f:
        page_start = 0
        while True:
            headers["Range"] = f"{page_start}-{page_start + 999}"
            r = requests.get(f"{env['url']}/rest/v1/{table}?select=*",
                             headers=headers, timeout=60)
            if r.status_code == 406:  # table absente du schema expose
                print(f"  {table}: ABSENTE")
                return -1
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            for row in batch:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            total += len(batch)
            cr = r.headers.get("Content-Range", "")
            # format: 0-999/1234 -> stopper si la derniere range couvre le total
            if "/" not in cr or len(batch) < 1000:
                break
            page_start += len(batch)
    print(f"  {table}: {total} lignes")
    return total


def export_auth_users(env: dict, out_dir: Path) -> int:
    """Comptes auth via l'API admin GoTrue (paginée par page)."""
    headers = {"apikey": env["key"], "Authorization": f"Bearer {env['key']}"}
    users = []
    page = 1
    while True:
        r = requests.get(f"{env['url']}/auth/v1/admin/users",
                         headers=headers, params={"page": page, "per_page": 100},
                         timeout=60)
        r.raise_for_status()
        batch = r.json().get("users", [])
        users.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    dest = out_dir / "auth_users.jsonl"
    with open(dest, "w", encoding="utf-8") as f:
        for u in users:
            f.write(json.dumps(u, ensure_ascii=False, default=str) + "\n")
    print(f"  auth.users: {len(users)} comptes")
    return len(users)


def export_storage(env: dict, out_dir: Path) -> int:
    """Telecharge tous les fichiers de tous les buckets publics (GET /bucket liste)."""
    headers = {"apikey": env["key"], "Authorization": f"Bearer {env['key']}"}
    r = requests.get(f"{env['url']}/storage/v1/bucket", headers=headers, timeout=60)
    r.raise_for_status()
    buckets = [b["name"] for b in r.json()]
    count = 0
    for bucket in buckets:
        # listing récursif manuel (limit 1000 par dossier)
        prefix_stack = [""]
        while prefix_stack:
            prefix = prefix_stack.pop()
            r = requests.post(
                f"{env['url']}/storage/v1/object/list/{bucket}",
                headers={**headers, "Content-Type": "application/json"},
                json={"prefix": prefix, "limit": 1000},
                timeout=60,
            )
            if r.status_code != 200:
                continue
            for item in r.json():
                name = item.get("name", "")
                full = f"{prefix}/{name}".lstrip("/") if prefix else name
                if item.get("metadata") is None and not name.endswith((".png", ".jpg", ".pdf")):
                    # dossier probable -> pousser dans la pile
                    if item.get("id") is None:
                        prefix_stack.append(full)
                        continue
                if item.get("metadata"):  # fichier
                    fr = requests.get(
                        f"{env['url']}/storage/v1/object/public/{bucket}/{full}",
                        timeout=120,
                    )
                    if fr.status_code != 200:
                        # fallback signé via endpoint auth
                        fr = requests.get(
                            f"{env['url']}/storage/v1/object/{bucket}/{full}",
                            headers=headers, timeout=120)
                    if fr.status_code == 200:
                        dest = out_dir / "storage" / bucket / full
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(fr.content)
                        count += 1
                    else:
                        print(f"  ! échec download {bucket}/{full} ({fr.status_code})")
        print(f"  bucket {bucket}: ok")
    print(f"  storage: {count} fichiers")
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(REPO_ROOT / "output" /
                                         f"migration-{datetime.now():%Y-%m-%d}"))
    args = ap.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    env = load_env()
    manifest = {
        "source": env["url"],
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "note": "auth.users via API admin = SANS les hash bcrypt. Pour migrer les "
                "mots de passe, utiliser pg_dump (connection string direct) OU "
                "prevoir un reset password cote users.",
        "tables": {},
    }

    print("== Tables ==")
    for t in TABLES:
        n = export_table(env, t, out_dir)
        manifest["tables"][t] = {"rows": n}

    print("== Auth ==")
    manifest["auth_users"] = export_auth_users(env, out_dir)

    print("== Storage ==")
    manifest["storage_files"] = export_storage(env, out_dir)

    # hashes des fichiers tables pour verifier l'import
    for f in sorted((out_dir / "tables").glob("*.jsonl")):
        entry = manifest["tables"].get(f.stem)
        if isinstance(entry, dict):
            entry["sha256"] = sha256_file(f)
            entry["bytes"] = f.stat().st_size

    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nExport terminé -> {out_dir}")


if __name__ == "__main__":
    main()
