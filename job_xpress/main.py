"""
JobXpress API - Point d'entrée principal avec robustesse améliorée.

Features:
- Logging structuré
- Rate limiting
- Health checks approfondis
- Monitoring Sentry (production)
- Déduplication intelligente
"""
import asyncio
import time
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.candidate import TallyWebhookPayload, CandidateProfile
from services.search_engine import search_engine
from services.llm_engine import llm_engine
from services.pdf_generator import pdf_generator
from services.database import db_service
from services.email_service import email_service
from services.ocr_service import ocr_service
from services.cache_service import cache_service
from core.config import settings
from core.logging_config import setup_logging, get_logger
from core.error_handlers import register_exception_handlers
from core.exceptions import DuplicateRequestError

# --- INITIALISATION LOGGING ---
logger = setup_logging(
    level=settings.LOG_LEVEL,
    json_format=(settings.ENVIRONMENT == "production"),
    log_file=settings.LOG_FILE if settings.LOG_FILE else None
)

# --- SENTRY (Production uniquement) ---
if settings.ENVIRONMENT == "production" and settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=settings.ENVIRONMENT
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
    cache_service.cleanup_expired()
    
    yield
    
    # Nettoyage final
    cache_service.cleanup_expired()
    logger.info("👋 Arrêt de JobXpress")

# --- APP FASTAPI ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## 🚀 JobXpress - Assistant de Candidature IA
    
    API d'automatisation intelligente pour la recherche d'emploi.
    
    - Réception de formulaires Tally
    - Recherche multi-sources d'offres
    - Scoring IA avec DeepSeek
    - Génération de lettres personnalisées
    """,
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- ENREGISTREMENT DES HANDLERS D'EXCEPTIONS ---
register_exception_handlers(app)

# --- CONFIGURATION DEDUPLICATION ---
COOLDOWN_SECONDS = 300  # 5 minutes


# ===========================================
# ENDPOINTS
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
    Vérifie: Supabase, DeepSeek API, RapidAPI
    """
    checks = {
        "api": "healthy",
        "cache": "unknown",
        "supabase": "unknown",
        "deepseek": "unknown",
        "rapidapi": "unknown"
    }
    
    # Test Cache SQLite
    try:
        cache_stats = cache_service.get_stats()
        checks["cache"] = f"healthy ({cache_stats['active']} active)"
    except Exception as e:
        checks["cache"] = "unhealthy"
        logger.warning(f"Health check Cache failed: {e}")
    
    # Test Supabase
    try:
        if db_service.client:
            db_service.client.table("candidates").select("id").limit(1).execute()
            checks["supabase"] = "healthy"
        else:
            checks["supabase"] = "not_configured"
    except Exception as e:
        checks["supabase"] = f"unhealthy"
        logger.warning(f"Health check Supabase failed: {e}")
    
    # Test DeepSeek (ping léger)
    if settings.DEEPSEEK_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.deepseek.com/v1/models",
                    headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                    timeout=5.0
                )
                checks["deepseek"] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception:
            checks["deepseek"] = "unreachable"
    else:
        checks["deepseek"] = "not_configured"
    
    # Test RapidAPI (JSearch)
    if settings.RAPIDAPI_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    headers={
                        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
                    },
                    params={"query": "test", "num_pages": "1"},
                    timeout=5.0
                )
                checks["rapidapi"] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception:
            checks["rapidapi"] = "unreachable"
    else:
        checks["rapidapi"] = "not_configured"
    
    # Statut global
    unhealthy = [k for k, v in checks.items() if v == "unhealthy" or v == "unreachable"]
    overall = "healthy" if not unhealthy else "degraded"
    
    return {
        "status": overall,
        "checks": checks,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


async def process_application_task(payload: TallyWebhookPayload):
    """
    Tâche de traitement d'une candidature.
    Exécutée en arrière-plan après réception du webhook.
    """
    event_id = payload.eventId
    logger.info(f"🚀 Démarrage traitement Event ID: {event_id}")

    try:
        # 1. PROFIL
        candidate = CandidateProfile.from_tally(payload)
        logger.info(f"👤 Candidat: {candidate.first_name} {candidate.last_name} ({candidate.email})")

        # --- OCR ---
        if candidate.cv_url:
            candidate.cv_text = await ocr_service.extract_text_from_cv(candidate.cv_url)
        else:
            logger.warning("⚠️ Pas de CV fourni")

        # 2. RECHERCHE
        raw_jobs = await search_engine.find_jobs(candidate)
        total_found = len(raw_jobs)
        logger.info(f"🔍 {total_found} offres trouvées")

        if not raw_jobs:
            logger.warning("❌ Aucune offre trouvée. Fin du traitement.")
            return

        # 3. ANALYSE - Avec garantie minimum d'offres
        MIN_OFFERS_TO_SEND = 5  # Garantir au moins 5 offres à envoyer
        all_analyzed_jobs = []  # Toutes les offres analysées
        BATCH_SIZE = 5

        for i in range(0, total_found, BATCH_SIZE):
            batch = raw_jobs[i : i + BATCH_SIZE]
            logger.info(f"🧠 Analyse lot {i+1}-{i+len(batch)}...")

            analyzed_batch = await llm_engine.analyze_offers_parallel(candidate, batch)
            all_analyzed_jobs.extend(analyzed_batch)
            
            # Log informatif
            high_matches = [j for j in analyzed_batch if j.match_score > 0]
            logger.info(f"   -> {len(high_matches)} offre(s) avec score > 0")

        # Séparer les offres valides des offres à score 0
        valid_jobs = [j for j in all_analyzed_jobs if j.match_score > 0]
        zero_score_jobs = [j for j in all_analyzed_jobs if j.match_score == 0]

        # Garantir un minimum d'offres
        if len(valid_jobs) < MIN_OFFERS_TO_SEND and zero_score_jobs:
            needed = MIN_OFFERS_TO_SEND - len(valid_jobs)
            valid_jobs.extend(zero_score_jobs[:needed])
            logger.info(f"📦 Ajout de {needed} offre(s) supplémentaire(s) (score 0)")

        if not valid_jobs:
            logger.warning("⚠️ Aucune offre retenue du tout")
            return

        # Tri final par score
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        logger.info("📊 PODIUM FINAL:")
        for j in valid_jobs[:3]:
            logger.info(f"   🥇 {j.match_score}% - {j.title} ({j.company})")

        # 4. SÉLECTION & LIVRABLES
        best_offer = valid_jobs[0]
        other_offers = valid_jobs[1:]
        logger.info(f"🏆 GAGNANT: {best_offer.title} chez {best_offer.company}")

        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        pdf_path = pdf_generator.create_application_pdf(
            candidate, best_offer, letter_data.get("html_content", "")
        )

        if pdf_path:
            db_service.save_application(candidate, best_offer, pdf_path)
            email_service.send_application_email(candidate, best_offer, other_offers, pdf_path)
            logger.info(f"✅ Cycle terminé avec succès pour {candidate.email}")

    except Exception as e:
        logger.exception(f"❌ CRASH Background Task: {str(e)}")
        # En production, Sentry capture automatiquement l'exception


@app.post("/webhook/tally")
@limiter.limit("10/minute")
async def receive_tally_webhook(
    request: Request,
    payload: TallyWebhookPayload,
    background_tasks: BackgroundTasks
):
    """
    Endpoint principal - Réception des webhooks Tally.
    
    Protection:
    - Rate limiting: 10 requêtes/minute par IP
    - Anti-doublon: 5 minutes de cooldown par email
    """
    try:
        # Extraction de l'email pour déduplication
        fields = {f.key: f.value for f in payload.data.fields}
        candidate_email = fields.get("question_D7V1kj", "unknown")
        
        # Clé de cache unique
        cache_key = f"email_dedup:{candidate_email}"

        # --- VÉRIFICATION DOUBLON (Cache Persistant) ---
        if cache_service.exists(cache_key):
            logger.warning(f"⛔ Doublon bloqué pour {candidate_email}")
            return JSONResponse(
                status_code=429,
                content={"status": "ignored", "reason": "rate_limited", "retry_after": COOLDOWN_SECONDS}
            )

        # Enregistrer dans le cache avec TTL
        cache_service.set(cache_key, "processed", ttl_seconds=COOLDOWN_SECONDS)

        # Lancement du traitement
        background_tasks.add_task(process_application_task, payload)

        logger.info(f"📨 Webhook reçu pour {candidate_email}")
        return {"status": "received", "message": "Processing started", "event_id": payload.eventId}

    except Exception as e:
        logger.exception(f"⚠️ Erreur webhook: {e}")
        # Fallback: on traite quand même
        background_tasks.add_task(process_application_task, payload)
        return {"status": "received_fallback"}


# ===========================================
# ENTRYPOINT
# ===========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)