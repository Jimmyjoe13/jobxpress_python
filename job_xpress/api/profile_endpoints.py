"""
API V2 - Endpoints de gestion du profil utilisateur.

Ce module contient les endpoints pour:
- GET /api/v2/profile - Récupérer le profil complet
- PUT /api/v2/profile - Mettre à jour le profil
- POST /api/v2/profile/avatar - Upload d'avatar
- POST /api/v2/profile/cv - Upload de CV
"""

from datetime import datetime, timezone
from typing import Optional
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from models.user_profile import (
    UserProfileRead,
    UserProfileUpdate,
    ProfileUpdateResponse,
    AvatarUploadResponse,
    CVUploadResponse,
)
from services.database import db_service
from services.billing import PLANS

logger = get_logger()

# Router pour les endpoints profil
router = APIRouter(prefix="/api/v2/profile", tags=["Profile"])

# Taille maximale des fichiers
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_CV_SIZE = 10 * 1024 * 1024  # 10 MB

# Types de fichiers acceptés
ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_CV_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]


# ===========================================
# HELPERS
# ===========================================


def _build_profile_response(profile_data: dict, email: str = None) -> UserProfileRead:
    """Construit un objet UserProfileRead à partir des données DB."""
    plan = profile_data.get("plan", "FREE")

    return UserProfileRead(
        id=str(profile_data.get("id", "")),
        email=email,
        first_name=profile_data.get("first_name"),
        last_name=profile_data.get("last_name"),
        phone=profile_data.get("phone"),
        avatar_url=profile_data.get("avatar_url"),
        job_title=profile_data.get("job_title"),
        location=profile_data.get("location", "France"),
        experience_level=profile_data.get("experience_level", "Non spécifié"),
        preferred_contract_type=profile_data.get("preferred_contract_type", "CDI"),
        preferred_work_type=profile_data.get("preferred_work_type", "Tous"),
        key_skills=profile_data.get("key_skills") or [],
        cv_url=profile_data.get("cv_url"),
        cv_uploaded_at=profile_data.get("cv_uploaded_at"),
        credits=profile_data.get("credits", 5),
        plan=plan,
        plan_name=PLANS.get(plan, PLANS["FREE"])["name"],
        created_at=profile_data.get("created_at"),
        updated_at=profile_data.get("updated_at"),
    )


async def _get_user_email(client, user_id: str) -> Optional[str]:
    """Récupère l'email de l'utilisateur depuis auth.users via RPC."""
    try:
        # On utilise le client admin pour accéder aux métadonnées auth
        admin_client = db_service.admin_client
        if admin_client:
            result = admin_client.auth.admin.get_user_by_id(user_id)
            if result and result.user:
                return result.user.email
    except Exception as e:
        logger.warning(f"⚠️ Impossible de récupérer l'email: {e}")
    return None


# ===========================================
# ENDPOINTS
# ===========================================


@router.get("", response_model=UserProfileRead)
async def get_profile(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère le profil complet de l'utilisateur connecté.

    Retourne toutes les informations du profil, y compris:
    - Informations personnelles (nom, prénom, téléphone)
    - Avatar et CV
    - Préférences de candidature
    - Crédits et plan
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        # Récupérer le profil
        result = (
            client.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            # Créer un profil par défaut si inexistant
            logger.warning(f"⚠️ Profil non trouvé pour {user_id[:8]}..., création...")
            client.table("user_profiles").insert(
                {"id": user_id, "credits": 5, "plan": "FREE"}
            ).execute()

            result = (
                client.table("user_profiles")
                .select("*")
                .eq("id", user_id)
                .single()
                .execute()
            )

        # Récupérer l'email depuis auth (fallback via admin si nécessaire)
        email = await _get_user_email(client, user_id)

        logger.info(f"👤 Profil récupéré pour {user_id[:8]}...")
        return _build_profile_response(result.data, email)

    except Exception as e:
        logger.error(f"❌ Erreur récupération profil: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.put("", response_model=ProfileUpdateResponse)
async def update_profile(
    profile: UserProfileUpdate,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Met à jour le profil de l'utilisateur connecté.

    Seuls les champs fournis seront mis à jour.
    Les champs null ou non fournis ne seront pas modifiés.

    **Champs modifiables:**
    - first_name, last_name, phone
    - job_title, location, experience_level
    - preferred_contract_type, preferred_work_type
    - key_skills (liste de compétences)
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        # Construire les données de mise à jour (exclure les None)
        update_data = {k: v for k, v in profile.model_dump().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

        # Ajouter le timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Mise à jour
        result = (
            client.table("user_profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        logger.info(
            f"✅ Profil mis à jour pour {user_id[:8]}... ({list(update_data.keys())})"
        )

        # Récupérer le profil mis à jour
        email = await _get_user_email(client, user_id)
        updated_profile = _build_profile_response(result.data[0], email)

        return ProfileUpdateResponse(
            success=True,
            message="Profil mis à jour avec succès",
            profile=updated_profile,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour profil: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload un avatar pour l'utilisateur connecté.

    **Formats acceptés:** JPEG, PNG, WebP, GIF
    **Taille max:** 5 MB

    L'avatar précédent sera remplacé.
    """
    # Validation du type
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Type de fichier non supporté. Acceptés: JPEG, PNG, WebP, GIF",
        )

    # Lire le contenu
    content = await file.read()

    # Validation de la taille
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=400, detail="Fichier trop volumineux. Maximum: 5 MB"
        )

    client = db_service.admin_client  # Besoin de admin pour Storage
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion Storage")

    try:
        # Générer un nom de fichier unique
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
            ext = "jpg"
        avatar_filename = f"{user_id}/{uuid.uuid4()}.{ext}"

        # Essayer d'abord le bucket 'avatars' (recommandé)
        bucket_name = "avatars"
        try:
            client.storage.from_(bucket_name).upload(
                path=avatar_filename,
                file=content,
                file_options={"content-type": file.content_type, "upsert": "true"},
            )
        except Exception as bucket_error:
            # Si le bucket 'avatars' n'existe pas, essayer 'cvs' avec un sous-dossier
            logger.warning(
                f"⚠️ Bucket 'avatars' non trouvé, fallback sur 'cvs': {bucket_error}"
            )
            bucket_name = "cvs"
            avatar_filename = f"avatars/{avatar_filename}"

            # Pour les buckets avec restriction MIME, on peut essayer de forcer le type
            try:
                client.storage.from_(bucket_name).upload(
                    path=avatar_filename,
                    file=content,
                    file_options={"content-type": file.content_type, "upsert": "true"},
                )
            except Exception as fallback_error:
                logger.error(
                    f"❌ Échec upload avatar (bucket {bucket_name}): {fallback_error}"
                )
                raise HTTPException(
                    status_code=500,
                    detail="Le bucket Storage ne supporte pas les images. "
                    "Créez un bucket 'avatars' dans Supabase Storage avec les types MIME: image/jpeg, image/png, image/webp, image/gif",
                )

        # Obtenir l'URL publique
        avatar_url = client.storage.from_(bucket_name).get_public_url(avatar_filename)

        # Mettre à jour le profil
        user_client = db_service.get_user_client(token)
        if user_client:
            user_client.table("user_profiles").update(
                {
                    "avatar_url": avatar_url,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", user_id).execute()

        logger.info(f"📸 Avatar uploadé pour {user_id[:8]}... (bucket: {bucket_name})")

        return AvatarUploadResponse(
            avatar_url=avatar_url, message="Avatar uploadé avec succès"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur upload avatar: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")


@router.post("/cv", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload un CV pour l'utilisateur connecté.

    **Formats acceptés:** PDF, DOC, DOCX
    **Taille max:** 10 MB

    Le CV sera utilisé comme défaut pour les nouvelles candidatures.
    """
    # Validation du type
    if file.content_type not in ALLOWED_CV_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Type de fichier non supporté. Acceptés: PDF, DOC, DOCX",
        )

    # Lire le contenu
    content = await file.read()

    # Validation de la taille
    if len(content) > MAX_CV_SIZE:
        raise HTTPException(
            status_code=400, detail="Fichier trop volumineux. Maximum: 10 MB"
        )

    client = db_service.admin_client  # Besoin de admin pour Storage
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion Storage")

    try:
        # Générer un nom de fichier unique
        ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        # Nettoyer le nom du fichier original
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")[
            :50
        ]
        cv_filename = f"cvs/{user_id}/{uuid.uuid4()}_{safe_filename}"

        # Upload vers Supabase Storage
        client.storage.from_("cvs").upload(
            path=cv_filename,
            file=content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        # Obtenir l'URL publique
        cv_url = client.storage.from_("cvs").get_public_url(cv_filename)
        now = datetime.now(timezone.utc)

        # Mettre à jour le profil
        user_client = db_service.get_user_client(token)
        if user_client:
            user_client.table("user_profiles").update(
                {
                    "cv_url": cv_url,
                    "cv_uploaded_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            ).eq("id", user_id).execute()

        logger.info(f"📄 CV uploadé pour {user_id[:8]}...")

        return CVUploadResponse(
            cv_url=cv_url, cv_uploaded_at=now, message="CV uploadé avec succès"
        )

    except Exception as e:
        logger.error(f"❌ Erreur upload CV: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")


@router.delete("/avatar")
async def delete_avatar(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Supprime l'avatar de l'utilisateur.
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        client.table("user_profiles").update(
            {"avatar_url": None, "updated_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", user_id).execute()

        logger.info(f"🗑️ Avatar supprimé pour {user_id[:8]}...")

        return {"success": True, "message": "Avatar supprimé"}

    except Exception as e:
        logger.error(f"❌ Erreur suppression avatar: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.delete("/cv")
async def delete_cv(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
):
    """
    Supprime le CV par défaut de l'utilisateur.
    """
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")

    try:
        client.table("user_profiles").update(
            {
                "cv_url": None,
                "cv_uploaded_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", user_id).execute()

        logger.info(f"🗑️ CV supprimé pour {user_id[:8]}...")

        return {"success": True, "message": "CV supprimé"}

    except Exception as e:
        logger.error(f"❌ Erreur suppression CV: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
