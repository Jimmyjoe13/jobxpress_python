"""
Modèles Pydantic pour la gestion des paramètres utilisateur.

Ces modèles définissent la structure des données pour les endpoints
GET/PUT /api/v2/settings.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserSettingsBase(BaseModel):
    """Champs de base des paramètres utilisateur."""
    
    # Notifications
    email_candidatures: bool = Field(True, description="Recevoir un email à chaque candidature envoyée")
    email_new_offers: bool = Field(True, description="Recevoir des alertes pour les nouvelles offres")
    email_newsletter: bool = Field(False, description="Recevoir la newsletter hebdomadaire")
    push_notifications: bool = Field(True, description="Activer les notifications push navigateur")
    
    # Préférences
    language: str = Field("fr", description="Langue de l'interface", max_length=10)
    timezone: str = Field("Europe/Paris", description="Fuseau horaire", max_length=50)
    dark_mode: bool = Field(True, description="Activer le mode sombre")
    
    @field_validator('language', mode='before')
    @classmethod
    def validate_language(cls, v):
        """Valide que la langue est supportée."""
        allowed = ['fr', 'en']
        if v not in allowed:
            return 'fr'
        return v
    
    @field_validator('timezone', mode='before')
    @classmethod
    def validate_timezone(cls, v):
        """Valide et nettoie le fuseau horaire."""
        allowed = [
            'Europe/Paris', 'Europe/London', 
            'America/New_York', 'Asia/Tokyo'
        ]
        if v not in allowed:
            return 'Europe/Paris'
        return v


class UserSettingsRead(UserSettingsBase):
    """
    Modèle de lecture des paramètres (GET /api/v2/settings).
    Inclut les champs système read-only.
    """
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserSettingsUpdate(BaseModel):
    """
    Modèle de mise à jour des paramètres (PUT /api/v2/settings).
    Tous les champs sont optionnels pour permettre les mises à jour partielles.
    """
    # Notifications (optionnels)
    email_candidatures: Optional[bool] = None
    email_new_offers: Optional[bool] = None
    email_newsletter: Optional[bool] = None
    push_notifications: Optional[bool] = None
    
    # Préférences (optionnels)
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    dark_mode: Optional[bool] = None
    
    @field_validator('language', mode='before')
    @classmethod
    def validate_language(cls, v):
        """Valide que la langue est supportée."""
        if v is None:
            return None
        allowed = ['fr', 'en']
        if v not in allowed:
            return 'fr'
        return v
    
    @field_validator('timezone', mode='before')
    @classmethod
    def validate_timezone(cls, v):
        """Valide le fuseau horaire."""
        if v is None:
            return None
        allowed = [
            'Europe/Paris', 'Europe/London', 
            'America/New_York', 'Asia/Tokyo'
        ]
        if v not in allowed:
            return 'Europe/Paris'
        return v


class SettingsUpdateResponse(BaseModel):
    """Réponse de mise à jour des paramètres."""
    success: bool = True
    message: str = "Paramètres mis à jour avec succès"
    settings: UserSettingsRead
