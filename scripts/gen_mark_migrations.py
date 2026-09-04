# -*- coding: utf-8 -*-
from pathlib import Path

d = Path(r"deploy\gotrue-migrations")
versions = []
for f in sorted(d.glob("*.up.sql")):
    stem = f.name[: -len(".up.sql")]
    v = "00" if stem.startswith("00") else stem.split("_", 1)[0]
    versions.append(v)
vals = ", ".join("('" + v + "')" for v in versions)
sql = (
    "INSERT INTO auth.schema_migrations (version) VALUES "
    + vals
    + " ON CONFLICT (version) DO NOTHING;"
)
out = Path(r"output\vps-sql\mark_migrations.sql")
out.write_text(sql + "\n", encoding="utf-8")
print(len(versions), "versions ->", out)