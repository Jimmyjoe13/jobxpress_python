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
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

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

# Rate limiter pour les opérations coûteuses
# Note: Le limiter global est dans main.py, mais on crée une instance locale
# pour pouvoir l'utiliser comme décorateur sur les routes du router
limiter = Limiter(key_func=get_remote_address)

# Limites par type d'opération (configurables)
RATE_LIMIT_SEARCH = "5/minute"     # Recherches (coût RapidAPI modéré)
RATE_LIMIT_ANALYZE = "3/minute"    # Analyses LLM (coût élevé DeepSeek)


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
            "cv_url": request.cv_url,
            # Infos candidat pour l'email
            "candidate_email": request.candidate_email,
            "candidate_first_name": request.first_name,
            "candidate_last_name": request.last_name,
            "candidate_phone": request.phone
        }
        
        client.table("applications_v2").insert(data).execute()
        logger.info(f"📝 Application V2 créée: {app_id[:8]}... (email: {request.candidate_email})")
        
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
    Tâche de fond: Analyse IA, génération de lettre et envoi email.
    
    Workflow complet:
    1. Récupérer les infos candidat depuis l'application
    2. Analyser les offres avec l'IA
    3. Générer la lettre de motivation
    4. Créer le PDF
    5. Uploader le PDF vers Supabase Storage
    6. Envoyer l'email au candidat
    7. Marquer comme COMPLETED
    """
    from services.llm_engine import llm_engine
    from services.pdf_generator import pdf_generator
    from services.email_service import email_service
    from models.job_offer import JobOffer
    import tempfile
    import os
    
    logger.info(f"🧠 Démarrage analyse IA pour {app_id[:8]}...")
    
    client = db_service.admin_client
    if not client:
        logger.error("❌ Admin client non disponible")
        return
    
    try:
        # 1. Récupérer les infos de l'application pour le candidat
        app_result = client.table("applications_v2").select("*").eq("id", app_id).single().execute()
        app_data = app_result.data
        
        if not app_data:
            logger.error(f"❌ Application {app_id} non trouvée")
            return
        
        # Construire le profil candidat
        candidate_email = app_data.get("candidate_email")
        cv_url = app_data.get("cv_url")
        
        candidate = CandidateProfile(
            first_name=app_data.get("candidate_first_name") or "Candidat",
            last_name=app_data.get("candidate_last_name") or "",
            email=candidate_email or f"{user_id[:8]}@jobxpress.fr",
            phone=app_data.get("candidate_phone"),
            job_title=app_data.get("job_title", "Non spécifié"),
            contract_type=app_data.get("contract_type", "CDI"),
            location=app_data.get("location", "France"),
            cv_url=cv_url
        )
        
        logger.info(f"👤 Candidat: {candidate.first_name} {candidate.last_name} ({candidate.email})")
        
        # 1.5 OCR du CV si disponible
        if cv_url:
            try:
                from services.ocr_service import ocr_service
                cv_text = await ocr_service.extract_text_from_cv(cv_url)
                candidate.cv_text = cv_text
                logger.info(f"📄 CV extrait: {len(cv_text)} caractères")
                
                # Sauvegarder le cv_text en base pour JobyJoba
                if cv_text:
                    client.table("applications_v2").update({
                        "cv_text": cv_text[:10000],  # Limiter à 10k caractères
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", app_id).execute()
                    logger.info(f"💾 CV sauvegardé en base pour JobyJoba")
            except Exception as ocr_error:
                logger.warning(f"⚠️ Erreur OCR CV: {ocr_error}")
        else:
            logger.warning("⚠️ Pas de CV fourni")
        
        # 2. Convertir en JobOffer et analyser
        offers = [JobOffer(**job) for job in selected_jobs]
        analyzed_offers = await llm_engine.analyze_offers_parallel(candidate, offers)
        
        # Trier par score
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        best_offer = analyzed_offers[0] if analyzed_offers else None
        
        if not best_offer:
            logger.warning("⚠️ Aucune offre analysée avec succès")
            client.table("applications_v2").update({
                "status": ApplicationStatus.FAILED.value,
                "error_message": "Échec de l'analyse des offres",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", app_id).execute()
            return
        
        logger.info(f"✅ Analyse terminée: {best_offer.title} ({best_offer.match_score}%)")
        
        # 3. Générer la lettre de motivation
        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        letter_html = letter_data.get("html_content", "")
        
        # Mettre à jour: statut GENERATING_DOCS + lettre
        client.table("applications_v2").update({
            "status": ApplicationStatus.GENERATING_DOCS.value,
            "selected_jobs": [o.model_dump() for o in analyzed_offers],
            "final_choice": best_offer.model_dump(),
            "cover_letter_html": letter_html,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", app_id).execute()
        
        logger.info("📝 Lettre de motivation générée")
        
        # 4. Générer le PDF
        pdf_path = pdf_generator.create_application_pdf(candidate, best_offer, letter_html)
        
        pdf_url = None
        if pdf_path and os.path.exists(pdf_path):
            logger.info(f"📄 PDF généré: {pdf_path}")
            
            # 5. Uploader vers Supabase Storage
            try:
                pdf_filename = f"{app_id[:8]}_{candidate.first_name}_{best_offer.company}.pdf"
                pdf_filename = pdf_filename.replace(" ", "_")
                
                with open(pdf_path, "rb") as f:
                    pdf_content = f.read()
                
                # Upload dans le bucket cvs (ou pdfs si disponible)
                upload_result = client.storage.from_("cvs").upload(
                    path=f"applications/{pdf_filename}",
                    file=pdf_content,
                    file_options={"content-type": "application/pdf"}
                )
                
                # Obtenir l'URL publique
                pdf_url = client.storage.from_("cvs").get_public_url(f"applications/{pdf_filename}")
                logger.info(f"☁️ PDF uploadé: {pdf_url[:50]}...")
                
            except Exception as upload_error:
                logger.warning(f"⚠️ Erreur upload PDF: {upload_error}")
                # On continue quand même avec le fichier local
        
        # 6. Envoyer l'email
        if candidate_email:
            try:
                other_offers = analyzed_offers[1:] if len(analyzed_offers) > 1 else []
                email_service.send_application_email(
                    candidate=candidate,
                    best_offer=best_offer,
                    other_offers=other_offers,
                    pdf_path=pdf_path
                )
                logger.info(f"📧 Email envoyé à {candidate_email}")
            except Exception as email_error:
                logger.error(f"❌ Erreur envoi email: {email_error}")
        else:
            logger.warning("⚠️ Pas d'email candidat - email non envoyé")
        
        # 7. Marquer comme COMPLETED
        client.table("applications_v2").update({
            "status": ApplicationStatus.COMPLETED.value,
            "pdf_url": pdf_url or pdf_path,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", app_id).execute()
        
        logger.info(f"🎉 Workflow terminé avec succès pour {app_id[:8]}")
        
        # 8. Créer les notifications
        try:
            # Notification de succès
            client.table("notifications").insert({
                "user_id": user_id,
                "type": "workflow_complete",
                "title": "🎉 Candidature envoyée !",
                "message": f"Votre candidature pour {best_offer.title} chez {best_offer.company} a été envoyée avec succès.",
                "application_id": app_id,
                "action_url": f"/dashboard",
                "action_label": "Voir le tableau de bord"
            }).execute()
            
            # Offre JobyJoba
            client.table("notifications").insert({
                "user_id": user_id,
                "type": "offer_jobyjoba",
                "title": "🤖 Préparez votre entretien avec JobyJoba !",
                "message": f"Notre coach IA peut vous aider à préparer votre entretien chez {best_offer.company}. 10 messages personnalisés pour 1 crédit.",
                "application_id": app_id,
                "action_url": f"/dashboard/chat/{app_id}",
                "action_label": "Débloquer JobyJoba (1 crédit)"
            }).execute()
            
            logger.info(f"🔔 Notifications créées pour {user_id[:8]}")
        except Exception as notif_error:
            logger.warning(f"⚠️ Erreur création notifications: {notif_error}")
        
        # Nettoyer le fichier temporaire
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception:
                pass
            
    except Exception as e:
        logger.exception(f"❌ Erreur analyse IA: {e}")
        try:
            if client:
                client.table("applications_v2").update({
                    "status": ApplicationStatus.FAILED.value,
                    "error_message": f"Erreur: {str(e)[:200]}",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", app_id).execute()
        except Exception:
            pass


# ===========================================
# ENDPOINTS
# ===========================================

@router.post("/search/start", response_model=SearchStartResponse)
@limiter.limit(RATE_LIMIT_SEARCH)
async def start_search(
    request: Request,  # Required for rate limiter - MUST be named 'request'
    search_request: SearchStartRequest,
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
        request=search_request,
        access_token=token
    )
    
    # 3. Lancer la recherche async
    background_tasks.add_task(
        run_search_task,
        app_id=app_id,
        request=search_request,
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
@limiter.limit(RATE_LIMIT_ANALYZE)
async def select_jobs(
    request: Request,  # Required for rate limiter - MUST be named 'request'
    app_id: str,
    select_request: SelectJobsRequest,
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
    
    for idx_str in select_request.selected_job_ids:
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
