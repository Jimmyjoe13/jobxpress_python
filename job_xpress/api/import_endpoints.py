"""
Endpoint API pour l'importation d'offres externes.

Permet à l'utilisateur d'importer une offre d'emploi externe (URL ou texte brut).
Action 100% GRATUITE (0 crédit).
L'offre est ajoutée au Kanban dans la colonne 'À postuler'.
"""

from fastapi import APIRouter, HTTPException, Depends
from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from services.job_importer import (
    job_importer_service,
    JobImportRequest,
    JobImportResponse,
)

logger = get_logger()

router = APIRouter(prefix="/api/v2", tags=["Import Offres"])


@router.post("/jobs/import", response_model=JobImportResponse)
async def import_external_job(
    request: JobImportRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Importe une offre externe (depuis une URL ou un texte brut).
    
    - Extrait et normalise les informations clés via l'IA
    - Enregistre l'offre dans saved_jobs et job_offers_v2
    - Crée une carte dans applications_v2 avec tracking_status = 'SAVED'
    - Coût : 0 crédit (100% gratuit)
    """
    logger.info(f"📥 Réception demande import offre externe pour user {user_id}")
    return await job_importer_service.import_job(
        request=request,
        user_id=user_id,
        access_token=token,
    )
