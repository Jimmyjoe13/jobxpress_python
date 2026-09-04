"""
JobXpress API - Point d'entrée principal avec robustesse améliorée.

Features:
- Logging structuré
- Rate limiting
- Health checks approfondis
- Monitoring Sentry (production)
- Déduplication intelligente
"""

import os
import sys

import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from services.database import db_service
from services.cache_service import cache_service
from core.config import settings
from core.logging_config import setup_logging
from core.error_handlers import register_exception_handlers

# --- INITIALISATION LOGGING ---
logger = setup_logging(
    level=settings.LOG_LEVEL,
    json_format=(settings.ENVIRONMENT == "production"),
    log_file=settings.LOG_FILE if settings.LOG_FILE else None,
    axiom_token=settings.AXIOM_TOKEN if settings.AXIOM_TOKEN else None,
    axiom_dataset=settings.AXIOM_DATASET,
)

# --- SENTRY (Production uniquement) ---
if settings.ENVIRONMENT == "production" and settings.SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=settings.ENVIRONMENT,
        )
        logger.info("✅ Sentry monitoring activé")
    except ImportError:
        logger.warning("⚠️ sentry-sdk non installé, monitoring désactivé")

# --- RATE LIMITER ---
limiter = Limiter(key_func=get_remote_address)


# --- LIFECYCLE ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application."""
    logger.info(f"🚀 Démarrage JobXpress v{settings.VERSION} ({settings.ENVIRONMENT})")

    # Nettoyage initial du cache
    await cache_service.cleanup_expired()
    await cache_service.purge_old_tasks(days=7)

    # Récupération des tâches orphelines (crash recovery)
    orphans = await cache_service.get_orphan_tasks(timeout_seconds=600)  # 10 min
    for orphan in orphans:
        logger.warning(
            f"🔄 Reprise tâche orpheline ID={orphan['id']} (retries={orphan['retries']})"
        )
        if orphan["retries"] < 3:  # Max 3 tentatives
            await cache_service.reset_task(orphan["id"])
        else:
            cache_service.mark_task_failed(
                orphan["id"], "Max retries exceeded after crash recovery"
            )

    if orphans:
        logger.info(f"📋 {len(orphans)} tâche(s) orpheline(s) traitée(s)")

    yield

    # Nettoyage final
    await cache_service.cleanup_expired()
    logger.info("👋 Arrêt de JobXpress")


# --- APP FASTAPI ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## 🚀 JobXpress - Assistant de Candidature IA
    
    API d'automatisation intelligente pour la recherche d'emploi.
    
    - Formulaire de candidature via le frontend (workflow V2)
    - Recherche multi-sources d'offres
    - Scoring IA (MiMo via OpenCode Zen)
    - Génération de lettres personnalisées
    """,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS CONFIGURATION (configurable via env) ---
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
logger.info(f"🔒 CORS Origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# --- ENREGISTREMENT DES HANDLERS D'EXCEPTIONS ---
register_exception_handlers(app)

# --- ENREGISTREMENT DES ROUTERS V2 ---
from api.v2_endpoints import router as v2_router
from api.notifications_chat import router as notifications_router
from api.profile_endpoints import router as profile_router
from api.settings_endpoints import router as settings_router
from api.stripe_webhook import router as stripe_router
from api.search_endpoints import router as search_router
from api.dashboard_endpoints import router as dashboard_router
from api.admin_endpoints import router as admin_router

app.include_router(v2_router)
app.include_router(notifications_router)
app.include_router(profile_router)
app.include_router(settings_router)
app.include_router(stripe_router)
app.include_router(search_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
logger.info("✅ API V2 Human-in-the-Loop enregistrée")
logger.info("✅ API Notifications & Chat enregistrée")
logger.info("✅ API Profile enregistrée")
logger.info("✅ API Settings enregistrée")
logger.info("✅ API Stripe Webhooks enregistrée")
logger.info("✅ API Recherche & Favoris enregistrée")
logger.info("✅ API Admin Monitoring enregistrée")
logger.info("✅ API Dashboard & UX enregistrée")


# ===========================================
# ENDPOINTS SANTÉ / MONITORING
# ===========================================


@app.get("/")
def health_check_simple():
    """Health check simple pour les load balancers."""
    return {"status": "online", "version": settings.VERSION}


@app.head("/")
def health_check_head():
    """Health check HEAD pour Render/Railway."""
    return {}


@app.get("/health")
async def health_check_deep():
    """
    Health check approfondi avec vérification des dépendances.
    Fix audit P2 : en production, ne détaille plus l'état par intégration
    (révéler quelles clés sont configurées est un renseignement gratuit).
    """
    checks = {
        "api": "healthy",
        "cache": "unknown",
        "supabase": "unknown",
        "llm_api": "unknown",
        "rapidapi": "unknown",
    }

    # Test Cache SQLite (très rapide)
    try:
        cache_stats = await cache_service.get_stats()
        checks["cache"] = f"healthy ({cache_stats.get('active', 0)} active)"
    except Exception as e:
        checks["cache"] = "unhealthy"
        logger.warning(f"Health check Cache failed: {e}")

    # Test Supabase (timeout court)
    try:
        if db_service.client:
            db_service.client.table("user_profiles").select("id").limit(1).execute()
            checks["supabase"] = "healthy"
        else:
            checks["supabase"] = "not_configured"
    except Exception as e:
        checks["supabase"] = "unhealthy"
        logger.warning(f"Health check Supabase failed: {e}")

    # Test API LLM (timeout très court 2s)
    provider_url = settings.OPENAI_BASE_URL.rstrip('/') + "/models"
    api_key_to_check = settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY
    if api_key_to_check:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    provider_url,
                    headers={"Authorization": f"Bearer {api_key_to_check}"},
                    timeout=2.0,
                )
                checks["llm_api"] = (
                    "healthy" if resp.status_code == 200 else f"unhealthy ({resp.status_code})"
                )
        except Exception:
            checks["llm_api"] = "unreachable"
    else:
        checks["llm_api"] = "not_configured"

    # Test RapidAPI (timeout très court 2s)
    if settings.RAPIDAPI_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    headers={
                        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
                    },
                    params={"query": "test", "num_pages": "1"},
                    timeout=5.0,
                )
                checks["rapidapi"] = (
                    "healthy" if resp.status_code == 200 else f"unhealthy ({resp.status_code})"
                )
        except Exception:
            checks["rapidapi"] = "unreachable"
    else:
        checks["rapidapi"] = "not_configured"

    # Statut global : seules les dependances CRITIQUES degradent le statut.
    # rapidapi/llm_api sont des services optionnels (fallbacks SerpAPI/heuristique)
    # et JSearch repond en 3-4s depuis l'EU : un timeout court ne doit pas
    # faire basculer toute la prod en "degraded" (fix audit P2 / VPS 2026-09-04).
    critical = ["api", "supabase", "cache"]
    unhealthy = [
        k for k, v in checks.items()
        if k in critical and ("unhealthy" in v or v == "unreachable")
    ]
    overall = "healthy" if not unhealthy else "degraded"

    if settings.ENVIRONMENT == "production":
        # Payload minimal en prod : statut global + santé technique basique
        return {"status": overall}

    return {
        "status": overall,
        "checks": checks,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health/tasks")
async def health_check_tasks():
    """
    Endpoint de monitoring des tâches en file d'attente.
    Affiche les statistiques des tâches (pending, processing, done, failed).
    """
    task_stats = await cache_service.get_task_stats()
    cache_stats = await cache_service.get_stats()

    return {
        "tasks": task_stats,
        "cache": cache_stats,
        "orphan_timeout_seconds": 600,
        "max_retries": 3,
    }


@app.get("/health/redis")
async def health_check_redis():
    """
    Endpoint de monitoring du cache Redis.
    Affiche le statut de connexion et les statistiques de cache.
    """
    from services.redis_cache import redis_cache

    redis_health = redis_cache.health_check()
    redis_stats = redis_cache.get_stats() if redis_cache.is_available else {}

    return {
        "redis": redis_health,
        "stats": redis_stats,
        "features": {
            "search_cache_ttl": "1 heure",
            "credits_cache_ttl": "1 minute",
            "rate_limiting": redis_cache.is_available,
        },
    }


# ===========================================
# API V2 - ENDPOINTS AUTHENTIFIÉS
# ===========================================

from core.auth import get_required_token, get_current_user_id


@app.get("/api/v2/applications")
async def get_my_applications(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère les candidatures de l'utilisateur authentifié.

    Nécessite un token JWT Supabase valide dans l'en-tête Authorization.
    Respecte les politiques RLS de Supabase.

    Returns:
        Liste des candidatures de l'utilisateur
    """
    logger.info(f"📋 Récupération candidatures pour user_id: {user_id}")

    applications = db_service.get_user_applications(user_id=user_id, access_token=token)

    return {
        "user_id": user_id,
        "count": len(applications),
        "applications": applications,
    }


@app.get("/api/v2/me")
async def get_current_user(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Retourne les informations de l'utilisateur authentifié.

    Utile pour vérifier que l'authentification fonctionne.
    """
    return {"user_id": user_id, "authenticated": True}


# ===========================================
# ENTRYPOINT
# ===========================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
