"""
API V2 - Endpoints de gestion des paramètres utilisateur.

Ce module contient les endpoints pour:
- GET /api/v2/settings - Récupérer les paramètres
- PUT /api/v2/settings - Mettre à jour les paramètres

Authentification: JWT Supabase requis
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import get_required_token, get_current_user_id
from services.database import db_service
from models.user_settings import (
    UserSettingsRead,
    UserSettingsUpdate,
    SettingsUpdateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["Settings"])


# ===========================================
# HELPERS
# ===========================================

def _build_settings_response(settings_data: dict) -> UserSettingsRead:
    """Construit un objet UserSettingsRead à partir des données DB."""
    return UserSettingsRead(
        id=str(settings_data.get("id", "")),
        user_id=str(settings_data.get("user_id", "")),
        email_candidatures=settings_data.get("email_candidatures", True),
        email_new_offers=settings_data.get("email_new_offers", True),
        email_newsletter=settings_data.get("email_newsletter", False),
        push_notifications=settings_data.get("push_notifications", True),
        language=settings_data.get("language", "fr"),
        timezone=settings_data.get("timezone", "Europe/Paris"),
        dark_mode=settings_data.get("dark_mode", True),
        created_at=settings_data.get("created_at"),
        updated_at=settings_data.get("updated_at")
    )


async def _get_or_create_settings(client, user_id: str) -> dict:
    """
    Récupère les paramètres de l'utilisateur, ou les crée avec les valeurs par défaut.
    
    Args:
        client: Client Supabase
        user_id: ID de l'utilisateur
        
    Returns:
        dict: Données des paramètres
    """
    # Essayer de récupérer les paramètres existants
    result = client.table("user_settings").select("*").eq("user_id", user_id).execute()
    
    if result.data and len(result.data) > 0:
        return result.data[0]
    
    # Créer les paramètres par défaut
    logger.info(f"Création des paramètres par défaut pour user {user_id}")
    
    new_settings = {
        "user_id": user_id,
        "email_candidatures": True,
        "email_new_offers": True,
        "email_newsletter": False,
        "push_notifications": True,
        "language": "fr",
        "timezone": "Europe/Paris",
        "dark_mode": True
    }
    
    insert_result = client.table("user_settings").insert(new_settings).execute()
    
    if not insert_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de créer les paramètres"
        )
    
    return insert_result.data[0]


# ===========================================
# ENDPOINTS
# ===========================================

@router.get(
    "/settings",
    response_model=UserSettingsRead,
    summary="Récupérer les paramètres",
    description="""
    Récupère les paramètres de l'utilisateur connecté.
    
    Si les paramètres n'existent pas encore, ils seront créés avec les valeurs par défaut.
    
    **Paramètres retournés:**
    - Notifications (emails, push)
    - Préférences (langue, fuseau horaire, thème)
    """
)
async def get_settings(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Récupère les paramètres de l'utilisateur connecté.
    
    Retourne les paramètres de notifications et préférences.
    Crée les paramètres par défaut si inexistants.
    """
    try:
        client = db_service.get_user_client(token)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur connexion base de données"
            )
        settings_data = await _get_or_create_settings(client, user_id)
        
        logger.info(f"Paramètres récupérés pour user {user_id}")
        return _build_settings_response(settings_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération paramètres: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des paramètres: {str(e)}"
        )


@router.put(
    "/settings",
    response_model=SettingsUpdateResponse,
    summary="Mettre à jour les paramètres",
    description="""
    Met à jour les paramètres de l'utilisateur connecté.
    
    Seuls les champs fournis seront mis à jour.
    Les champs null ou non fournis ne seront pas modifiés.
    
    **Champs modifiables:**
    - email_candidatures, email_new_offers, email_newsletter, push_notifications
    - language (fr, en), timezone, dark_mode
    """
)
async def update_settings(
    settings: UserSettingsUpdate,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Met à jour les paramètres de l'utilisateur connecté.
    
    Seuls les champs fournis seront mis à jour.
    Les champs null ou non fournis ne seront pas modifiés.
    """
    try:
        client = db_service.get_user_client(token)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur connexion base de données"
            )
        
        # S'assurer que les paramètres existent
        await _get_or_create_settings(client, user_id)
        
        # Préparer les données à mettre à jour (exclure None)
        update_data = settings.model_dump(exclude_none=True)
        
        if not update_data:
            # Rien à mettre à jour, retourner l'état actuel
            current = await _get_or_create_settings(client, user_id)
            return SettingsUpdateResponse(
                success=True,
                message="Aucune modification",
                settings=_build_settings_response(current)
            )
        
        logger.info(f"Mise à jour paramètres user {user_id}: {list(update_data.keys())}")
        
        # Mettre à jour
        result = client.table("user_settings").update(update_data).eq("user_id", user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Échec de la mise à jour des paramètres"
            )
        
        updated_settings = result.data[0]
        
        return SettingsUpdateResponse(
            success=True,
            message="Paramètres mis à jour avec succès",
            settings=_build_settings_response(updated_settings)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour paramètres: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour des paramètres: {str(e)}"
        )
