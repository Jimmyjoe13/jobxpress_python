"""
API Endpoints pour la recherche rapide d'offres et la gestion des favoris.

Ce module permet aux utilisateurs de :
- Lancer une recherche d'offres directement depuis le dashboard (sans créer de candidature)
- Sauvegarder des offres en favoris
- Consulter l'historique de recherche

Quota (plan FREE) : 5 recherches gratuites/mois, puis 1 crédit par recherche.
Plans STARTER/PRO : recherches illimitées.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from core.exceptions import QuotaError
from models.application_v2 import JobFilters, JobResultItem
from services.database import db_service
from services.search_engine_v2 import create_search_engine_v2

logger = get_logger()

# Router
router = APIRouter(prefix="/api/v2", tags=["Recherche & Favoris"])

# Services
_search_engine_instance = None


def get_search_engine():
    global _search_engine_instance
    if _search_engine_instance is None:
        _search_engine_instance = create_search_engine_v2()
    return _search_engine_instance


# Rate limiter
limiter = Limiter(key_func=get_remote_address)
RATE_LIMIT_QUICK_SEARCH = "5/minute"


# ===========================================
# MODELS
# ===========================================


class QuickSearchRequest(BaseModel):
    """Requête de recherche rapide (sans créer de candidature)."""

    job_title: str = Field(
        ..., min_length=2, max_length=200, description="Intitulé du poste"
    )
    location: str = Field("France", max_length=100, description="Localisation")
    contract_type: str = Field(
        "CDI", description="Type de contrat (CDI, CDD, Alternance, Stage)"
    )
    experience_level: str = Field(
        "Non spécifié", description="Junior, Confirmé, Sénior"
    )
    work_type: str = Field("Tous", description="Présentiel, Hybride, Full Remote, Tous")
    filters: Optional[JobFilters] = Field(None, description="Filtres avancés")


class QuickSearchResponse(BaseModel):
    """Réponse de la recherche rapide."""

    jobs: List[JobResultItem]
    total_found: int
    free_searches_remaining: int = Field(
        description="Recherches gratuites restantes ce mois"
    )
    used_credit: bool = Field(False, description="True si un crédit a été consommé")
    message: str


class SaveJobRequest(BaseModel):
    """Requête pour sauvegarder une offre en favori."""

    job_data: dict = Field(
        ..., description="Données de l'offre (title, company, url, etc.)"
    )
    notes: Optional[str] = Field(
        None, max_length=1000, description="Notes personnelles"
    )
    source: str = Field("search", description="Origine: search, chatbot, manual")


class SavedJobResponse(BaseModel):
    """Représentation d'une offre sauvegardée."""

    id: str
    job_data: dict
    notes: Optional[str] = None
    source: str = "search"
    created_at: str


class SearchHistoryItem(BaseModel):
    """Représentation d'une recherche dans l'historique."""

    id: str
    query_params: dict
    results_count: int
    created_at: str


# ===========================================
# ENDPOINTS — RECHERCHE RAPIDE
# ===========================================


@router.post(
    "/search/quick",
    response_model=QuickSearchResponse,
    summary="Recherche rapide d'offres",
    responses={
        200: {"description": "Recherche réussie"},
        400: {"description": "Paramètres de recherche invalides"},
        402: {"description": "Quota de recherche épuisé"},
        500: {"description": "Erreur serveur interne"},
    },
)
@limiter.limit(RATE_LIMIT_QUICK_SEARCH)
async def quick_search(
    request: Request,
    search_request: QuickSearchRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Lance une recherche d'emploi multi-sources sans créer de dossier de candidature.
    
    Cette version **V2** inclut :
    - Déduplication intelligente
    - Détection des cabinets de recrutement
    - Scoring de matching (optionnel)
    
    **Quotas :**
    - Plan FREE : 5 recherches gratuites/mois
    - Au-delà : 1 crédit par recherche
    """
    # 1. Vérifier et consomme le quota via DatabaseService (lève QuotaError si épuisé)
    quota = await db_service.check_and_consume_search_quota(user_id)
    
    # On récupère les infos pour la réponse API
    free_remaining = quota.get("free_remaining", 0)
    used_credit = quota.get("used_credit", False)

    # 2. Exécuter la recherche via SearchEngineV2
    logger.info(
        f"🔍 Recherche rapide: '{search_request.job_title}' à '{search_request.location}' (user: {user_id[:8]})"
    )

    try:
        from models.candidate import CandidateProfile, WorkType

        work_type_map = {
            "Full Remote": WorkType.FULL_REMOTE,
            "Hybride": WorkType.HYBRIDE,
            "Présentiel": WorkType.PRESENTIEL,
            "Tous": WorkType.TOUS,
        }

        # Construire un profil minimal pour la recherche
        candidate = CandidateProfile(
            first_name="QuickSearch",
            last_name="User",
            email="search@jobxpress.fr",  # Placeholder (non utilisé)
            job_title=search_request.job_title,
            contract_type=search_request.contract_type,
            work_type=work_type_map.get(search_request.work_type, WorkType.TOUS),
            experience_level=search_request.experience_level,
            location=search_request.location,
        )

        filters = search_request.filters.model_dump() if search_request.filters else {}

        try:
            engine = get_search_engine()
            jobs = await engine.find_jobs_v2(candidate, filters, limit=25)
        except Exception as e:
            logger.error(f"❌ SearchEngineV2 indisponible: {e}")
            raise HTTPException(
                status_code=503,
                detail="Le moteur de recherche est temporairement indisponible.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Erreur inattendue recherche rapide: {e}")
        raise HTTPException(
            status_code=500, detail="Erreur lors de la recherche d'offres"
        )

    # 3. Convertir en JobResultItem
    job_items = []
    for i, job in enumerate(jobs):
        try:
            job_items.append(
                JobResultItem(
                    id=str(i),
                    title=job.title,
                    company=job.company,
                    location=getattr(job, "location", None) or "Non spécifié",
                    url=job.url,
                    salary=getattr(job, "salary", None),
                    date_posted=getattr(job, "date_posted", None),
                    is_remote=getattr(job, "is_remote", False),
                    work_type=getattr(job, "work_type", None),
                    salary_warning=getattr(job, "salary_warning", False),
                    is_agency=getattr(job, "is_agency", False),
                    source=getattr(job, "source", "reverse_api"),
                )
            )
        except Exception as e:
            logger.warning(f"Erreur conversion job {i}: {e}")
            continue

    # 4. Sauvegarder dans l'historique de recherche
    try:
        user_client = db_service.get_user_client(token)
        if user_client:
            user_client.table("search_history").insert(
                {
                    "user_id": user_id,
                    "query_params": {
                        "job_title": search_request.job_title,
                        "location": search_request.location,
                        "contract_type": search_request.contract_type,
                        "experience_level": search_request.experience_level,
                        "work_type": search_request.work_type,
                        "filters": search_request.filters.model_dump()
                        if search_request.filters
                        else None,
                    },
                    "results_count": len(job_items),
                }
            ).execute()
    except Exception as e:
        logger.warning(f"⚠️ Erreur sauvegarde historique: {e}")

    # 5. Construire le message
    credit_msg = ""
    if used_credit:
        credit_msg = " (1 crédit utilisé)"
    elif free_remaining >= 0:
        credit_msg = f" ({free_remaining} recherche(s) gratuite(s) restante(s))"

    logger.info(
        f"✅ Recherche rapide terminée: {len(job_items)} offres trouvées{credit_msg}"
    )

    return QuickSearchResponse(
        jobs=job_items,
        total_found=len(job_items),
        free_searches_remaining=free_remaining,
        used_credit=used_credit,
        message=f"{len(job_items)} offre(s) trouvée(s){credit_msg}",
    )


# ===========================================
# ENDPOINTS — HISTORIQUE DE RECHERCHE
# ===========================================


@router.get("/search/history")
async def get_search_history(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
    limit: int = 20,
):
    """
    Récupère l'historique des recherches de l'utilisateur.

    Retourne les dernières recherches triées par date décroissante.
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        result = (
            client.table("search_history")
            .select("id, query_params, results_count, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return {
            "count": len(result.data) if result.data else 0,
            "history": result.data or [],
        }

    except Exception as e:
        logger.error(f"❌ Erreur historique recherche: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération historique")


@router.delete("/search/history")
async def clear_search_history(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Supprime tout l'historique de recherche de l'utilisateur."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        result = (
            client.table("search_history")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )
        deleted_count = len(result.data) if result.data else 0
        logger.info(f"🗑️ Historique effacé pour user {user_id[:8]} ({deleted_count} entrées)")
        return {"status": "cleared", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"❌ Erreur suppression historique: {e}")
        raise HTTPException(status_code=500, detail="Erreur suppression de l'historique")


@router.delete("/search/history/{history_id}")
async def delete_search_history_item(
    history_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Supprime un élément de l'historique de recherche."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        client.table("search_history").delete().eq("id", history_id).execute()
        return {"status": "deleted", "id": history_id}
    except Exception as e:
        logger.error(f"❌ Erreur suppression historique: {e}")
        raise HTTPException(status_code=500, detail="Erreur suppression")


# ===========================================
# ENDPOINTS — OFFRES FAVORITES
# ===========================================


@router.post("/jobs/save", response_model=SavedJobResponse)
async def save_job(
    save_request: SaveJobRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Sauvegarde une offre d'emploi en favori.

    L'offre est stockée sous forme de snapshot JSON (les données ne changent pas
    même si l'offre originale est modifiée ou supprimée).
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    # Vérifier les champs minimaux dans job_data
    job_data = save_request.job_data
    if not job_data.get("title") or not job_data.get("company"):
        raise HTTPException(
            status_code=400,
            detail="job_data doit contenir au minimum 'title' et 'company'",
        )

    try:
        result = (
            client.table("saved_jobs")
            .insert(
                {
                    "user_id": user_id,
                    "job_data": job_data,
                    "notes": save_request.notes,
                    "source": save_request.source,
                }
            )
            .execute()
        )

        if result.data and len(result.data) > 0:
            saved = result.data[0]
            return SavedJobResponse(
                id=saved["id"],
                job_data=saved["job_data"],
                notes=saved.get("notes"),
                source=saved.get("source", "search"),
                created_at=saved["created_at"],
            )

        raise HTTPException(status_code=500, detail="Erreur sauvegarde de l'offre")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur sauvegarde favori: {e}")
        raise HTTPException(status_code=500, detail="Erreur sauvegarde de l'offre")


@router.get("/jobs/saved")
async def get_saved_jobs(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
    limit: int = 50,
):
    """
    Récupère les offres sauvegardées en favoris.

    Retourne les favoris triés par date de sauvegarde décroissante.
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        result = (
            client.table("saved_jobs")
            .select("id, job_data, notes, source, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return {
            "count": len(result.data) if result.data else 0,
            "saved_jobs": result.data or [],
        }

    except Exception as e:
        logger.error(f"❌ Erreur récupération favoris: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération des favoris")


@router.put("/jobs/saved/{job_id}")
async def update_saved_job(
    job_id: str,
    notes: Optional[str] = None,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Met à jour les notes d'une offre sauvegardée."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        result = (
            client.table("saved_jobs")
            .update({"notes": notes})
            .eq("id", job_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Favori non trouvé")

        return {"status": "updated", "id": job_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour favori: {e}")
        raise HTTPException(status_code=500, detail="Erreur mise à jour")


@router.delete("/jobs/saved/{job_id}")
async def delete_saved_job(
    job_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Supprime une offre des favoris."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        client.table("saved_jobs").delete().eq("id", job_id).execute()
        return {"status": "deleted", "id": job_id}

    except Exception as e:
        logger.error(f"❌ Erreur suppression favori: {e}")
        raise HTTPException(status_code=500, detail="Erreur suppression")


# ===========================================
# ENDPOINT — QUOTA DE RECHERCHE
# ===========================================


@router.get("/search/quota")
async def get_search_quota(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère l'état du quota de recherche de l'utilisateur.

    Retourne :
    - Nombre de recherches gratuites restantes
    - Plan actuel
    - Date du prochain renouvellement
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        result = (
            client.table("user_profiles")
            .select("plan, credits, free_searches_used, free_searches_reset_at")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        profile = result.data
        plan = profile.get("plan", "FREE")
        max_free = 5

        if plan in ("STARTER", "PRO"):
            return {
                "plan": plan,
                "searches_unlimited": True,
                "free_searches_remaining": 999,
                "credits": profile.get("credits", 0),
                "reset_at": profile.get("free_searches_reset_at"),
            }

        free_used = profile.get("free_searches_used", 0)
        free_remaining = max(0, max_free - free_used)

        return {
            "plan": plan,
            "searches_unlimited": False,
            "free_searches_remaining": free_remaining,
            "free_searches_total": max_free,
            "free_searches_used": free_used,
            "credits": profile.get("credits", 0),
            "reset_at": profile.get("free_searches_reset_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur récupération quota: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération quota")
