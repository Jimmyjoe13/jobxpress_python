"""
Modèles Pydantic pour la gestion du profil utilisateur.

Ces modèles définissent la structure des données pour les endpoints
GET/PUT /api/v2/profile.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# Patterns de validation
PHONE_PATTERN = re.compile(r'^(\+33|0)[1-9](\d{2}){4}$')


class UserProfileBase(BaseModel):
    """Champs de base du profil utilisateur."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    
    # Profil professionnel
    job_title: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field("France", max_length=100)
    experience_level: Optional[str] = Field("Non spécifié", max_length=50)
    
    # Préférences
    preferred_contract_type: Optional[str] = Field("CDI", max_length=50)
    preferred_work_type: Optional[str] = Field("Tous", max_length=50)
    key_skills: List[str] = Field(default_factory=list)
    
    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        """Valide et formate le numéro de téléphone."""
        if not v:
            return None
        
        # Nettoyer les espaces et tirets
        cleaned = re.sub(r'[\s\-\.]', '', str(v).strip())
        
        # Accepter les formats FR valides
        if cleaned and len(cleaned) >= 10:
            return cleaned[:20]  # Limiter à 20 caractères
        
        return v
    
    @field_validator('key_skills', mode='before')
    @classmethod
    def validate_skills(cls, v):
        """Valide et nettoie les compétences."""
        if not v:
            return []
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        if isinstance(v, list):
            return [str(s).strip() for s in v if s][:20]  # Max 20 compétences
        return []


class UserProfileRead(UserProfileBase):
    """
    Modèle de lecture du profil (GET /api/v2/profile).
    Inclut les champs calculés et read-only.
    """
    id: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    cv_url: Optional[str] = None
    cv_uploaded_at: Optional[datetime] = None
    
    # Crédits (read-only)
    credits: int = 5
    plan: str = "FREE"
    plan_name: str = "Gratuit"
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserProfileUpdate(UserProfileBase):
    """
    Modèle de mise à jour du profil (PUT /api/v2/profile).
    Tous les champs sont optionnels.
    """
    pass


class AvatarUploadResponse(BaseModel):
    """Réponse de l'upload d'avatar."""
    avatar_url: str
    message: str = "Avatar uploadé avec succès"


class CVUploadResponse(BaseModel):
    """Réponse de l'upload de CV."""
    cv_url: str
    cv_uploaded_at: datetime
    message: str = "CV uploadé avec succès"


class ProfileUpdateResponse(BaseModel):
    """Réponse de mise à jour du profil."""
    success: bool = True
    message: str = "Profil mis à jour avec succès"
    profile: UserProfileRead
