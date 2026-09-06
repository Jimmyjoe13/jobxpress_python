"""
API - A/B Test Tracking Endpoint

Endpoint pour tracker les événements A/B test (impressions, clics).
Stocke les données en mémoire pour l'instant, sera connecté à la base de données plus tard.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timezone
import json

from core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Stockage en mémoire (sera remplacé par PostgreSQL)
ab_test_events: list[dict] = []


class ABTestEvent(BaseModel):
    test: str
    variant: Literal["A", "B"]
    event: Literal["impression", "click"]
    url: str = ""
    user_agent: str = ""
    user_id: str | None = None


class ABTestStats(BaseModel):
    test: str
    variant_a: dict
    variant_b: dict
    total_impressions: int
    total_clicks: int
    conversion_rate_a: float
    conversion_rate_b: float


@router.post("/ab-test")
async def track_ab_test_event(event: ABTestEvent):
    """
    Track un événement A/B test (impression ou clic).
    """
    record = {
        "test": event.test,
        "variant": event.variant,
        "event": event.event,
        "url": event.url,
        "user_agent": event.user_agent,
        "user_id": event.user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    ab_test_events.append(record)
    logger.info(f"AB Test: {event.test} | {event.variant} | {event.event}")
    return {"status": "ok", "recorded": record}


@router.get("/ab-test/stats/{test_name}")
async def get_ab_test_stats(test_name: str):
    """
    Retourne les statistiques d'un test A/B donné.
    """
    events = [e for e in ab_test_events if e["test"] == test_name]

    a_impressions = len([e for e in events if e["variant"] == "A" and e["event"] == "impression"])
    b_impressions = len([e for e in events if e["variant"] == "B" and e["event"] == "impression"])
    a_clicks = len([e for e in events if e["variant"] == "A" and e["event"] == "click"])
    b_clicks = len([e for e in events if e["variant"] == "B" and e["event"] == "click"])

    a_rate = (a_clicks / a_impressions * 100) if a_impressions > 0 else 0
    b_rate = (b_clicks / b_impressions * 100) if b_impressions > 0 else 0

    return {
        "test": test_name,
        "variant_a": {
            "impressions": a_impressions,
            "clicks": a_clicks,
            "conversion_rate": round(a_rate, 2),
        },
        "variant_b": {
            "impressions": b_impressions,
            "clicks": b_clicks,
            "conversion_rate": round(b_rate, 2),
        },
        "total_impressions": a_impressions + b_impressions,
        "total_clicks": a_clicks + b_clicks,
    }


@router.get("/ab-test/all")
async def get_all_ab_tests():
    """
    Liste tous les tests A/B en cours et leurs stats.
    """
    tests = set(e["test"] for e in ab_test_events)
    results = []
    for test in tests:
        stats = await get_ab_test_stats(test)
        results.append(stats)
    return {"tests": results, "total_events": len(ab_test_events)}
