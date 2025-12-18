"""
API V2 - Endpoints Human-in-the-Loop pour le workflow de candidature.

Ce module contient les nouveaux endpoints qui permettent à l'utilisateur
de participer au processus de sélection des offres.

Workflow:
1. POST /api/v2/search/start - Démarre une recherche async
2. GET /api/v2/applications/{id}/results - Polling des résultats
3. POST /api/v2/applications/{id}/select - Sélection des offres
4. POST /api/v2/applications/{id}/advice - Conseil entretien (optionnel)
"""

from datetime import datetime, timezone
from typing import Optional, List
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends

from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from models.application_v2 import (
    SearchStartRequest, SearchStartResponse,
    ApplicationResults, SelectJobsRequest, SelectJobsResponse,
    AdviceRequest, AdviceResponse,
    ApplicationStatus, JobResultItem
)
from models.candidate import CandidateProfile, WorkType
from services.database import db_service
from services.billing import BillingService
from services.search_engine_v2 import create_search_engine_v2

logger = get_logger()

# Router pour les endpoints V2
router = APIRouter(prefix="/api/v2", tags=["V2 - Human-in-the-Loop"])

# Instances de services (instanciées une fois)
billing_service = BillingService(db_service)
search_engine_v2 = create_search_engine_v2()


# ===========================================
# FONCTIONS UTILITAIRES
# ===========================================

async def create_application_v2(
    user_id: str,
    request: SearchStartRequest,
    access_token: str
) -> str:
    """
    Crée une nouvelle candidature en base de données.
    
    Returns:
        UUID de l'application créée
    """
    client = db_service.get_user_client(access_token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    app_id = str(uuid.uuid4())
    
    try:
        data = {
            "id": app_id,
            "user_id": user_id,
            "status": ApplicationStatus.SEARCHING.value,
            "job_title": request.job_title,
            "location": request.location,
            "contract_type": request.contract_type,
            "work_type": request.work_type,
            "experience_level": request.experience_level,
            "job_filters": request.filters.model_dump() if request.filters else {},
            "cv_url": request.cv_url
        }
        
        client.table("applications_v2").insert(data).execute()
        logger.info(f"📝 Application V2 créée: {app_id[:8]}...")
        
        return app_id
        
    except Exception as e:
        logger.error(f"❌ Erreur création application: {e}")
        raise HTTPException(status_code=500, detail="Erreur création candidature")


async def run_search_task(
    app_id: str,
    request: SearchStartRequest,
    user_id: str,
    access_token: str
):
    """
    Tâche de fond: Exécute la recherche et met à jour la base.
    """
    logger.info(f"🔎 Démarrage recherche async pour {app_id[:8]}...")
    
    try:
        # Construire le profil candidat
        work_type_map = {
            "Full Remote": WorkType.FULL_REMOTE,
            "Hybride": WorkType.HYBRIDE,
            "Présentiel": WorkType.PRESENTIEL,
            "Tous": WorkType.TOUS,
        }
        
        candidate = CandidateProfile(
            first_name="User",  # Pas utilisé dans la recherche
            last_name=user_id[:8],
            email="search@jobxpress.fr",  # Placeholder
            job_title=request.job_title,
            contract_type=request.contract_type,
            work_type=work_type_map.get(request.work_type, WorkType.TOUS),
            experience_level=request.experience_level,
            location=request.location,
            cv_url=request.cv_url
        )
        
        # Préparer les filtres
        filters = {}
        if request.filters:
            filters = request.filters.model_dump()
        
        # Exécuter la recherche
        jobs = await search_engine_v2.find_jobs_v2(candidate, filters)
        
        # Convertir en dicts pour stockage JSON
        raw_jobs = [job.model_dump() for job in jobs]
        
        # Mettre à jour l'application
        client = db_service.admin_client  # Background task = admin client
        if client:
            new_status = (
                ApplicationStatus.WAITING_SELECTION.value 
                if raw_jobs else ApplicationStatus.FAILED.value
            )
            
            update_data = {
                "status": new_status,
                "raw_jobs": raw_jobs,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if not raw_jobs:
                update_data["error_message"] = "Aucune offre trouvée"
            
            client.table("applications_v2").update(update_data).eq("id", app_id).execute()
            
            logger.info(f"✅ Recherche terminée: {len(raw_jobs)} offres -> {new_status}")
            
            # Débiter le crédit si résultats trouvés
            if raw_jobs:
                await billing_service.debit_search(user_id, access_token, len(raw_jobs))
        
    except Exception as e:
        logger.exception(f"❌ Erreur recherche async: {e}")
        
        # Marquer comme échoué
        try:
            client = db_service.admin_client
            if client:
                client.table("applications_v2").update({
                    "status": ApplicationStatus.FAILED.value,
                    "error_message": str(e),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", app_id).execute()
        except Exception:
            pass


async def run_analysis_task(
    app_id: str,
    selected_jobs: List[dict],
    user_id: str,
    access_token: str
):
    """
    Tâche de fond: Analyse IA des offres sélectionnées.
    """
    from services.llm_engine import llm_engine
    from models.job_offer import JobOffer
    
    logger.info(f"🧠 Démarrage analyse IA pour {app_id[:8]}...")
    
    try:
        # Convertir en JobOffer
        offers = [JobOffer(**job) for job in selected_jobs]
        
        # Créer un profil candidat minimal pour l'analyse
        # TODO: Récupérer le vrai profil depuis la DB
        candidate = CandidateProfile(
            first_name="User",
            last_name=user_id[:8],
            email="analysis@jobxpress.fr",
            job_title=selected_jobs[0].get("title", "Inconnu") if selected_jobs else "Inconnu",
            contract_type="CDI",
            location="France"
        )
        
        # Analyser les offres
        analyzed_offers = await llm_engine.analyze_offers_parallel(candidate, offers)
        
        # Trier par score et prendre la meilleure
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        best_offer = analyzed_offers[0] if analyzed_offers else None
        
        # Mettre à jour la base
        client = db_service.admin_client
        if client and best_offer:
            client.table("applications_v2").update({
                "status": ApplicationStatus.GENERATING_DOCS.value,
                "selected_jobs": [o.model_dump() for o in analyzed_offers],
                "final_choice": best_offer.model_dump(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", app_id).execute()
            
            logger.info(f"✅ Analyse terminée: Meilleure offre = {best_offer.title} ({best_offer.match_score}%)")
            
            # TODO: Lancer la génération de documents
            
    except Exception as e:
        logger.exception(f"❌ Erreur analyse IA: {e}")
        try:
            client = db_service.admin_client
            if client:
                client.table("applications_v2").update({
                    "status": ApplicationStatus.FAILED.value,
                    "error_message": f"Erreur analyse: {str(e)}",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", app_id).execute()
        except Exception:
            pass


# ===========================================
# ENDPOINTS
# ===========================================

@router.post("/search/start", response_model=SearchStartResponse)
async def start_search(
    request: SearchStartRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Démarre une recherche d'offres d'emploi.
    
    - Vérifie les crédits disponibles
    - Crée une application en état SEARCHING
    - Lance la recherche en arrière-plan
    - Retourne l'ID de l'application pour polling
    
    **Coût**: 1 crédit (débité seulement si résultats > 0)
    """
    # 1. Vérification crédits
    can_search, credits = await billing_service.can_search(user_id, token)
    if not can_search:
        raise HTTPException(
            status_code=402,
            detail=f"Crédits insuffisants. Vous avez {credits} crédit(s), il en faut au moins 1."
        )
    
    # 2. Créer l'application en DB
    app_id = await create_application_v2(
        user_id=user_id,
        request=request,
        access_token=token
    )
    
    # 3. Lancer la recherche async
    background_tasks.add_task(
        run_search_task,
        app_id=app_id,
        request=request,
        user_id=user_id,
        access_token=token
    )
    
    logger.info(f"📨 Recherche lancée pour {user_id[:8]}... -> {app_id[:8]}...")
    
    return SearchStartResponse(
        application_id=app_id,
        status=ApplicationStatus.SEARCHING,
        message="Recherche lancée. Utilisez GET /applications/{id}/results pour suivre l'avancement.",
        credits_remaining=credits
    )


@router.get("/applications/{app_id}/results", response_model=ApplicationResults)
async def get_search_results(
    app_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Récupère les résultats d'une recherche (polling).
    
    Statuts possibles:
    - **SEARCHING**: Recherche en cours, réessayez dans quelques secondes
    - **WAITING_SELECTION**: Offres trouvées, prêt pour sélection
    - **FAILED**: Échec de la recherche
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    # Récupérer l'application
    result = client.table("applications_v2").select("*").eq("id", app_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    
    app_data = result.data
    status = ApplicationStatus(app_data["status"])
    
    # Recherche encore en cours
    if status == ApplicationStatus.SEARCHING:
        return ApplicationResults(
            application_id=app_id,
            status=status,
            total_found=0,
            jobs=[],
            message="Recherche en cours... Réessayez dans quelques secondes."
        )
    
    # Échec
    if status == ApplicationStatus.FAILED:
        error_msg = app_data.get("error_message", "Erreur lors de la recherche")
        raise HTTPException(status_code=500, detail=error_msg)
    
    # Convertir raw_jobs en JobResultItem
    raw_jobs = app_data.get("raw_jobs", []) or []
    job_items = []
    
    for i, job in enumerate(raw_jobs):
        try:
            job_items.append(JobResultItem(
                id=str(i),
                title=job.get("title", "Sans titre"),
                company=job.get("company", "Inconnu"),
                location=job.get("location", ""),
                url=job.get("url", "#"),
                date_posted=job.get("date_posted"),
                is_remote=job.get("is_remote", False),
                work_type=job.get("work_type"),
                salary_warning=job.get("salary_warning", False),
                is_agency=job.get("is_agency", False),
                source=job.get("source")
            ))
        except Exception as e:
            logger.warning(f"Erreur conversion job {i}: {e}")
            continue
    
    return ApplicationResults(
        application_id=app_id,
        status=status,
        total_found=len(job_items),
        jobs=job_items,
        message=f"{len(job_items)} offre(s) trouvée(s). Sélectionnez jusqu'à 5 offres pour continuer."
    )


@router.post("/applications/{app_id}/select", response_model=SelectJobsResponse)
async def select_jobs(
    app_id: str,
    request: SelectJobsRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Enregistre les offres sélectionnées par l'utilisateur.
    
    - Passe l'application au statut ANALYZING
    - Lance l'analyse IA des offres sélectionnées en arrière-plan
    
    **Limite**: 1 à 5 offres maximum
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    # Vérifier le statut actuel
    result = client.table("applications_v2").select("*").eq("id", app_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    
    if result.data["status"] != ApplicationStatus.WAITING_SELECTION.value:
        raise HTTPException(
            status_code=400,
            detail=f"Sélection impossible en statut '{result.data['status']}'. "
                   f"Statut attendu: '{ApplicationStatus.WAITING_SELECTION.value}'"
        )
    
    # Extraire les offres sélectionnées
    raw_jobs = result.data.get("raw_jobs", []) or []
    selected = []
    
    for idx_str in request.selected_job_ids:
        try:
            idx = int(idx_str)
            if 0 <= idx < len(raw_jobs):
                selected.append(raw_jobs[idx])
        except (ValueError, IndexError):
            continue
    
    if not selected:
        raise HTTPException(
            status_code=400,
            detail="Aucune offre valide sélectionnée. Vérifiez les IDs fournis."
        )
    
    # Mettre à jour en DB
    client.table("applications_v2").update({
        "status": ApplicationStatus.ANALYZING.value,
        "selected_jobs": selected,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", app_id).execute()
    
    # Lancer l'analyse IA en background
    background_tasks.add_task(
        run_analysis_task,
        app_id=app_id,
        selected_jobs=selected,
        user_id=user_id,
        access_token=token
    )
    
    logger.info(f"📌 {len(selected)} offre(s) sélectionnée(s) pour {app_id[:8]}...")
    
    return SelectJobsResponse(
        status=ApplicationStatus.ANALYZING,
        message=f"Analyse IA en cours de {len(selected)} offre(s) sélectionnée(s).",
        selected_count=len(selected)
    )


@router.get("/credits")
async def get_credits(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Récupère l'état des crédits de l'utilisateur.
    
    Retourne:
    - Nombre de crédits restants
    - Plan actuel (FREE ou PRO)
    - Date du prochain reset
    """
    credits_info = await billing_service.get_user_credits(user_id, token)
    return credits_info


@router.get("/applications")
async def list_applications(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
    limit: int = 20,
    status: Optional[str] = None
):
    """
    Liste les candidatures de l'utilisateur.
    
    Paramètres:
    - **limit**: Nombre max de résultats (défaut: 20)
    - **status**: Filtrer par statut (optionnel)
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    query = client.table("applications_v2").select(
        "id, status, job_title, location, created_at, updated_at"
    ).order("created_at", desc=True).limit(limit)
    
    if status:
        query = query.eq("status", status)
    
    result = query.execute()
    
    return {
        "count": len(result.data) if result.data else 0,
        "applications": result.data or []
    }
