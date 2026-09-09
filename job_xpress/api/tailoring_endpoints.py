"""
API Endpoints pour le Diagnostic ATS (1 crédit) et la Génération de CV Adapté (5 crédits).
"""

from fastapi import APIRouter, HTTPException, Depends
from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from services.database import db_service
from services.tailoring_service import (
    tailoring_service,
    ATSAnalysisResponse,
    TailoredCVResponse,
)

logger = get_logger()

router = APIRouter(prefix="/api/v2", tags=["ATS & CV Tailoring"])


@router.post(
    "/applications/{application_id}/ats-analysis",
    response_model=ATSAnalysisResponse,
)
async def analyze_application_ats(
    application_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Lance un diagnostic ATS Match & Gap Analysis pour une candidature/offre.
    - Analyse les forces du candidat et les manques par rapport à l'offre
    - Identifie les mots-clés ATS à intégrer
    - Coût : 1 crédit
    """
    logger.info(f"🎯 Requête diagnostic ATS pour app {application_id[:8]} (user {user_id[:8]})")
    return await tailoring_service.analyze_ats_match(
        application_id=application_id,
        user_id=user_id,
        access_token=token,
    )


@router.get(
    "/applications/{application_id}/ats-analysis",
)
async def get_application_ats(
    application_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère le diagnostic ATS déjà calculé (gratuit).
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Base de données indisponible")

    res = (
        client.table("applications_v2")
        .select("final_choice")
        .eq("id", application_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not res.data or not res.data.get("final_choice", {}).get("ats_analysis"):
        raise HTTPException(status_code=404, detail="Aucun diagnostic ATS calculé pour cette offre.")

    return res.data["final_choice"]["ats_analysis"]


@router.post(
    "/applications/{application_id}/tailored-cv",
    response_model=TailoredCVResponse,
)
async def generate_tailored_cv(
    application_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Génère un CV adapté sur-mesure pour une offre ciblée.
    - Restructure et optimise les expériences pour l'ATS
    - Rédige un pitch magnétique et met en avant les compétences clés
    - Coût : 5 crédits
    """
    logger.info(f"📄 Requête génération CV adapté pour app {application_id[:8]} (user {user_id[:8]})")
    return await tailoring_service.generate_tailored_cv(
        application_id=application_id,
        user_id=user_id,
        access_token=token,
    )


@router.get(
    "/applications/{application_id}/tailored-cv",
)
async def get_tailored_cv(
    application_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère le CV adapté déjà généré (gratuit).
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Base de données indisponible")

    res = (
        client.table("applications_v2")
        .select("final_choice")
        .eq("id", application_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not res.data or not res.data.get("final_choice", {}).get("tailored_cv"):
        raise HTTPException(status_code=404, detail="Aucun CV adapté généré pour cette offre.")

    return res.data["final_choice"]["tailored_cv"]
