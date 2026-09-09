"""
API Endpoints pour le Dashboard et l'UX.

Ce module permet aux utilisateurs de :
- Récupérer leurs statistiques globales (candidatures, favoris).
- Récupérer leur activité récente.
- Afficher et gérer les notifications.
- Suivre manuellement le statut d'une candidature (Tracking).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from services.database import db_service

logger = get_logger()

router = APIRouter(prefix="/api/v2", tags=["Dashboard & Tracking"])

# ===========================================
# MODELS
# ===========================================


class TrackingUpdateRequest(BaseModel):
    tracking_status: str


class TrackingNoteRequest(BaseModel):
    note: str


class ProfileChecklistResponse(BaseModel):
    has_profile: bool
    has_cv: bool
    has_searched: bool
    has_imported_job: bool = False
    has_ats_diagnosis: bool = False
    has_tailored_cv: bool = False


@router.get("/profile/checklist", response_model=ProfileChecklistResponse)
async def get_profile_checklist(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Vérifie l'état de complétion du profil utilisateur (Onboarding).
    
    Aide le frontend à guider l'utilisateur pour :
    1. Créer son profil de base
    2. Uploader un CV
    3. Lancer sa première recherche
    4. Importer une offre cible
    5. Lancer son 1er diagnostic ATS
    6. Générer son 1er CV adapté
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur base de données")

    try:
        # 1. Vérifier profil et CV
        profile_res = (
            client.table("user_profiles")
            .select("first_name, cv_url, current_cv_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        
        has_profile = False
        has_cv = False
        if profile_res.data:
            has_profile = bool(profile_res.data.get("first_name"))
            has_cv = bool(profile_res.data.get("cv_url") or profile_res.data.get("current_cv_id"))

        # 2. Vérifier si au moins une recherche a été faite
        search_res = (
            client.table("search_history")
            .select("id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        has_search = len(search_res.data) > 0 if search_res.data else False

        # 3. Vérifier les candidatures (import, diagnostic ATS, CV adapté)
        apps_res = (
            client.table("applications_v2")
            .select("id, final_choice")
            .eq("user_id", user_id)
            .execute()
        )
        apps_data = apps_res.data or []
        has_imported_job = len(apps_data) > 0
        has_ats_diagnosis = any(
            bool((a.get("final_choice") or {}).get("ats_analysis") or (a.get("final_choice") or {}).get("score"))
            for a in apps_data
        )
        has_tailored_cv = any(
            bool((a.get("final_choice") or {}).get("tailored_cv"))
            for a in apps_data
        )

        return ProfileChecklistResponse(
            has_profile=has_profile,
            has_cv=has_cv,
            has_searched=has_search,
            has_imported_job=has_imported_job,
            has_ats_diagnosis=has_ats_diagnosis,
            has_tailored_cv=has_tailored_cv,
        )
    except Exception as e:
        logger.error(f"❌ Erreur checklist: {e}")
        return ProfileChecklistResponse(
            has_profile=False,
            has_cv=False,
            has_searched=False,
            has_imported_job=False,
            has_ats_diagnosis=False,
            has_tailored_cv=False,
        )

# ===========================================
# DASHBOARD STATS
# ===========================================


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère les statistiques globales de l'utilisateur.
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur base de données")

    try:
        # Applications & Checklists
        apps_res = (
            client.table("applications_v2")
            .select("id, tracking_status, final_choice")
            .eq("user_id", user_id)
            .execute()
        )
        apps_data = apps_res.data or []
        total_apps = len(apps_data)
        has_imported_job = total_apps > 0
        has_ats_diagnosis = any(
            bool((a.get("final_choice") or {}).get("ats_analysis") or (a.get("final_choice") or {}).get("score"))
            for a in apps_data
        )
        has_tailored_cv = any(
            bool((a.get("final_choice") or {}).get("tailored_cv"))
            for a in apps_data
        )

        # Saved jobs
        saved_res = (
            client.table("saved_jobs")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        total_saved = saved_res.count if saved_res.count is not None else 0

        # Profile completeness
        profile_res = (
            client.table("user_profiles")
            .select("job_title, location, current_cv_id, cv_url, free_searches_used")
            .eq("id", user_id)
            .execute()
        )

        has_profile = False
        has_cv = False
        has_searched = False

        if profile_res.data and len(profile_res.data) > 0:
            p = profile_res.data[0]
            has_profile = bool(p.get("job_title"))
            has_cv = bool(p.get("current_cv_id") or p.get("cv_url"))
            has_searched = p.get("free_searches_used", 0) > 0

        return {
            "total_applications": total_apps,
            "total_saved_jobs": total_saved,
            "checklist": {
                "has_profile": has_profile,
                "has_cv": has_cv,
                "has_searched": has_searched,
                "has_imported_job": has_imported_job,
                "has_ats_diagnosis": has_ats_diagnosis,
                "has_tailored_cv": has_tailored_cv,
            },
        }
    except Exception as e:
        logger.error(f"❌ Erreur dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération statistiques")


# ===========================================
# NOTIFICATIONS
# ===========================================


@router.get("/notifications")
async def get_notifications(
    limit: int = 20,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    client = db_service.get_user_client(token)
    try:
        res = (
            client.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"notifications": res.data or []}
    except Exception as e:
        logger.error(f"❌ Erreur fetch notifications: {e}")
        raise HTTPException(status_code=500, detail="Erreur notifications")


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    client = db_service.get_user_client(token)
    try:
        client.table("notifications").update({"is_read": True}).eq(
            "id", notif_id
        ).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"❌ Erreur notif read: {e}")
        raise HTTPException(status_code=500, detail="Erreur mise à jour")


# ===========================================
# TRACKING CANDIDATURES
# ===========================================


@router.patch("/applications/{app_id}/tracking")
async def update_tracking_status(
    app_id: str,
    req: TrackingUpdateRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Met à jour le statut du pipeline Kanban pour une candidature"""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur base de données")

    try:
        res = (
            client.table("applications_v2")
            .update({"tracking_status": req.tracking_status})
            .eq("id", app_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Candidature introuvable")

        return {"status": "success", "tracking_status": req.tracking_status}
    except Exception as e:
        logger.error(f"❌ Erreur tracking status: {e}")
        raise e


@router.post("/applications/{app_id}/notes")
async def add_tracking_note(
    app_id: str,
    req: TrackingNoteRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Ajoute une note de suivi (par ex: 'Relancé par email')"""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur base de données")

    try:
        import datetime

        # Load existing notes
        app_res = (
            client.table("applications_v2")
            .select("tracking_notes, tracking_status")
            .eq("id", app_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Candidature introuvable")

        existing_notes = app_res.data.get("tracking_notes") or []
        new_note = {
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "note": req.note,
            "status": app_res.data.get("tracking_status"),
        }

        # We assume existing_notes is a list
        if not isinstance(existing_notes, list):
            existing_notes = []

        existing_notes.append(new_note)

        # Update table
        client.table("applications_v2").update({"tracking_notes": existing_notes}).eq(
            "id", app_id
        ).execute()

        return {"status": "success", "note": new_note}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur add tracking note: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout de la note")


@router.delete("/applications/{app_id}")
async def delete_application(
    app_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """Supprime une candidature du Kanban."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur base de données")

    try:
        res = (
            client.table("applications_v2")
            .delete()
            .eq("id", app_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not res.data:
            # Note: Si RLS ou ID introuvable, res.data est vide
            raise HTTPException(
                status_code=404, detail="Candidature introuvable ou déjà supprimée"
            )

        return {"status": "success", "id": app_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur suppression candidature: {e}")
        raise HTTPException(
            status_code=500, detail="Erreur lors de la suppression de la candidature"
        )

