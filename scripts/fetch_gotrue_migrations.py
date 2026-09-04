# -*- coding: utf-8 -*-
"""
Telecharge les migrations GoTrue au tag v2.187.0 (set complet, namespace rendu),
les place dans deploy/gotrue-migrations/ pour montage en volume.

Le set embarque dans l'image supabase/gotrue:v2.187.0 est TRONQUE (4 fichiers)
et echoue en standalone ; le set repo complet resout le probleme.
"""

import re
import sys
from pathlib import Path

import requests

TAG = "v2.187.0"
API = f"https://api.github.com/repos/supabase/auth/contents/migrations?ref={TAG}"
DEST = Path(__file__).resolve().parents[1] / "deploy" / "gotrue-migrations"
NS_RE = re.compile(r'\{\{ index \.Options "Namespace" \}\}')


def main():
    r = requests.get(API, headers={"User-Agent": "mig"}, timeout=60)
    r.raise_for_status()
    files = [f for f in r.json() if f["name"].endswith(".up.sql")]
    files.sort(key=lambda f: f["name"])
    DEST.mkdir(parents=True, exist_ok=True)
    count = 0
    for f in files:
        src = requests.get(f["download_url"], headers={"User-Agent": "mig"}, timeout=60).text
        src = NS_RE.sub("auth", src)
        # warning si un autre template subsiste
        if "{{" in src:
            print(f"  !! template non rendu dans {f['name']}")
        (DEST / f["name"]).write_text(src, encoding="utf-8")
        count += 1
    print(f"{count} migrations -> {DEST}")


if __name__ == "__main__":
    main()