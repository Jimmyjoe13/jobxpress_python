#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Veille SEO hebdomadaire JobXpress — jobxpress.fr.

Exécution (VPS 51.38.99.226) :
    /home/jimmy/.hermes/hermes-agent/venv/bin/python /home/jimmy/jobxpress/seo/seo_weekly.py

Automatisé par le timer user systemd :
    ~/.config/systemd/user/jobxpress-seo-weekly.timer  (lundi 08:00, Persistent=true)

Entrées  : GSC property https://jobxpress.fr/ (28 j glissants) + GA4 property
           553599961 / G-PTVRXLF7NR (7 j glissants).
Sorties  : ~/jobxpress/seo/reports/veille_YYYY-MM-DD.md + history.json (historique
           des snapshots, sert au delta semaine/s-1).

Opportunités = requêtes avec impressions >= 20 et position > 10 (hors page 1).
"""
import json
import os
import datetime
from pathlib import Path

CRED_FILE = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/home/jimmy/richard/config/analytics-credentials.json",
)
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", CRED_FILE)

SITE_URL = "https://jobxpress.fr/"
GA4_PROPERTY = "553599961"
OUT_DIR = Path.home() / "jobxpress" / "seo" / "reports"
OUT_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_FILE = OUT_DIR / "history.json"


def gsc_totals_and_queries(days=28):
    import google.auth
    from googleapiclient.discovery import build

    creds, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    service = build("webmasters", "v3", credentials=creds)
    end = datetime.date.today() - datetime.timedelta(days=3)
    start = end - datetime.timedelta(days=days)

    def q(body):
        return service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()

    totals = q(
        {"startDate": start.isoformat(), "endDate": end.isoformat(), "rowLimit": 1}
    ).get("rows", [{}])[0]
    totals = {
        "clics": int(totals.get("clicks", 0)),
        "impressions": int(totals.get("impressions", 0)),
        "ctr": round(totals.get("ctr", 0) * 100, 2),
        "position": round(totals.get("position", 0), 1),
    }

    queries = []
    for r in q(
        {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query"],
            "rowLimit": 50,
        }
    ).get("rows", []):
        queries.append(
            {
                "query": r["keys"][0],
                "clics": int(r.get("clicks", 0)),
                "impressions": int(r.get("impressions", 0)),
                "position": round(r.get("position", 0), 1),
            }
        )

    pages = []
    for r in q(
        {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["page"],
            "rowLimit": 25,
        }
    ).get("rows", []):
        pages.append(
            {
                "page": r["keys"][0],
                "clics": int(r.get("clicks", 0)),
                "impressions": int(r.get("impressions", 0)),
                "position": round(r.get("position", 0), 1),
            }
        )

    return {"totals": totals, "queries": queries, "pages": pages}


def ga4_week(days=7):
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = BetaAnalyticsDataClient()
    req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY}",
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
    )
    resp = client.run_report(req)
    channels = [
        {
            "channel": r.dimension_values[0].value,
            "sessions": int(r.metric_values[0].value),
            "users": int(r.metric_values[1].value),
        }
        for r in resp.rows
    ]
    req2 = RunReportRequest(
        property=f"properties/{GA4_PROPERTY}",
        metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
    )
    resp2 = client.run_report(req2)
    totals = (
        {
            "sessions": int(resp2.rows[0].metric_values[0].value),
            "users": int(resp2.rows[0].metric_values[1].value),
        }
        if resp2.rows
        else {"sessions": 0, "users": 0}
    )
    return {"totals": totals, "channels": channels}


def main():
    report_date = datetime.date.today().isoformat()

    gsc = gsc_totals_and_queries(days=28)
    ga4 = ga4_week(days=7)

    # Opportunités : impressions suffisantes mais position hors page 1
    opportunities = [
        q for q in gsc.get("queries", []) if q["impressions"] >= 20 and q["position"] > 10
    ]

    # Delta hebdo clics (vs dernier snapshot sauvegardé)
    history = []
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            history = []
    prev = history[-1] if history else None
    delta = None
    if prev and prev.get("gsc", {}).get("totals"):
        cur_c = gsc["totals"]["clics"]
        prev_c = prev["gsc"]["totals"]["clics"]
        delta = {"clics_28j": cur_c, "clics_28j_precedent": prev_c, "variation": cur_c - prev_c}

    history.append({"date": report_date, "gsc": gsc, "ga4": ga4})
    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=1), encoding="utf-8")

    # Rapport lisible
    lines = [
        f"# Veille SEO JobXpress — {report_date}",
        "",
        "## GSC 28 jours",
        f"- Clics {gsc['totals']['clics']} | Impressions {gsc['totals']['impressions']} "
        f"| CTR {gsc['totals']['ctr']}% | Pos. moy {gsc['totals']['position']}",
    ]
    if delta:
        signe = "+" if delta["variation"] >= 0 else ""
        lines.append(f"- Delta clics 28j vs snapshot précédent : {signe}{delta['variation']}")
    lines += ["", "## GA4 7 jours",
              f"- Sessions {ga4['totals']['sessions']} | Users {ga4['totals']['users']}"]
    for c in ga4.get("channels", [])[:5]:
        lines.append(f"  - {c['channel']}: {c['sessions']} sess")
    lines += ["", f"## Opportunités ({len(opportunities)}) — impressions>20, pos>10"]
    if not opportunities:
        lines.append("- Aucune opportunité cette semaine (site encore jeune)")
    for q in opportunities[:10]:
        lines.append(f"- {q['query']!r} : {q['impressions']} impr, pos {q['position']}")
    report = "\n".join(lines)
    (OUT_DIR / f"veille_{report_date}.md").write_text(report, encoding="utf-8")

    print(json.dumps({
        "date": report_date,
        "gsc_totals": gsc["totals"],
        "ga4_week": ga4["totals"],
        "delta": delta,
        "opportunites": [q["query"] for q in opportunities[:10]],
        "rapport": str(OUT_DIR / f"veille_{report_date}.md"),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
