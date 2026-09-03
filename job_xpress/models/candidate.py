"""
Modèles de données pour les candidats avec validation renforcée.
Inclut la protection contre les injections et la sanitization des entrées.
"""

import re
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# --- 1. Enum WorkType pour le type d'emploi ---


class WorkType(str, Enum):
    """
    Type de travail souhaité par le candidat.
    TOUS est la valeur par défaut quand aucune préférence n'est spécifiée.
    """

    FULL_REMOTE = "Full Remote"
    HYBRIDE = "Hybride"
    PRESENTIEL = "Présentiel"
    TOUS = "Tous"  # Recherche tous les types (défaut)


# Patterns de validation
PHONE_PATTERN = re.compile(r"^(\+33|0)[1-9](\d{2}){4}$")
NAME_PATTERN = re.compile(r"^[\w\s\-\'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$")
XSS_PATTERN = re.compile(r'[<>"\']')


def sanitize_text(value: str, max_length: int = 200) -> str:
    """
    Nettoie une chaîne de caractères pour éviter les injections.
    - Supprime les balises HTML/script
    - Limite la longueur
    - Strip les espaces
    """
    if not value:
        return ""

    # Supprimer les caractères potentiellement dangereux
    cleaned = XSS_PATTERN.sub("", value)

    # Limiter la longueur et strip
    return cleaned.strip()[:max_length]


# --- 2. Modèle Domaine avec Validation Renforcée ---


class CandidateProfile(BaseModel):
    """
    Modèle de candidat avec validation et sanitization complètes.

    Protections:
    - Validation des formats (email, téléphone)
    - Sanitization anti-XSS
    - Limites de longueur
    - Valeurs par défaut sécurisées
    """

    first_name: str = Field(
        ..., min_length=1, max_length=100, description="Prénom du candidat"
    )
    last_name: str = Field(
        ..., min_length=1, max_length=100, description="Nom du candidat"
    )
    email: EmailStr = Field(..., description="Email valide du candidat")
    phone: Optional[str] = Field(
        None, max_length=20, description="Numéro de téléphone FR"
    )
    job_title: str = Field(
        ..., min_length=2, max_length=200, description="Poste recherché"
    )
    contract_type: str = Field(default="Non spécifié", max_length=50)
    work_type: WorkType = Field(
        default=WorkType.TOUS, description="Type de travail souhaité"
    )
    experience_level: str = Field(default="Non spécifié", max_length=50)
    location: str = Field(
        default="France", max_length=100, description="Localisation souhaitée"
    )
    cv_url: Optional[str] = Field(None, max_length=500, description="URL du CV uploadé")
    cv_text: Optional[str] = Field(default="", description="Texte extrait du CV (OCR)")
    key_skills: List[str] = Field(default_factory=list, description="Compétences clés")
    user_id: Optional[str] = Field(
        None, description="ID de l'utilisateur connecté (auth.users.id)"
    )

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def sanitize_names(cls, v):
        """Nettoie et valide les noms."""
        if not v or not isinstance(v, str):
            return "Inconnu"

        cleaned = sanitize_text(v, max_length=100)

        # Vérifier le format
        if not cleaned or not NAME_PATTERN.match(cleaned):
            # On garde quand même un nom nettoyé plutôt que de rejeter
            return re.sub(r"[^\w\s\-]", "", cleaned) or "Inconnu"

        return cleaned.title()  # Capitaliser proprement

    @field_validator("job_title", mode="before")
    @classmethod
    def sanitize_job_title(cls, v):
        """Nettoie le titre de poste."""
        if not v or not isinstance(v, str):
            return "Non spécifié"

        cleaned = sanitize_text(v, max_length=200)

        # Garder uniquement les caractères alphanumériques et ponctuation simple
        return re.sub(r"[^\w\s\-/()&+]", "", cleaned) or "Non spécifié"

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        """Valide et formate le numéro de téléphone."""
        if not v or not isinstance(v, str):
            return None

        # Nettoyer les espaces et tirets
        cleaned = re.sub(r"[\s\-\.]", "", v.strip())

        # Vérifier le format FR
        if PHONE_PATTERN.match(cleaned):
            return cleaned

        # Si le format est invalide mais contient des chiffres, on le garde
        digits_only = re.sub(r"[^\d+]", "", v)
        if len(digits_only) >= 10:
            return digits_only[:15]  # Limiter à 15 caractères

        return None

    @field_validator("location", mode="before")
    @classmethod
    def sanitize_location(cls, v):
        """Nettoie la localisation."""
        if not v or not isinstance(v, str):
            return "France"

        return sanitize_text(v, max_length=100) or "France"

    @field_validator("cv_url", mode="before")
    @classmethod
    def validate_cv_url(cls, v):
        """Valide l'URL du CV."""
        if not v or not isinstance(v, str):
            return None

        # Vérifier que c'est une URL valide
        if v.startswith(("http://", "https://")):
            return v[:500]  # Limiter la longueur

        return None

    @model_validator(mode="after")
    def ensure_valid_profile(self):
        """Validation finale du profil complet."""
        # S'assurer que l'email n'est pas vide (déjà validé par EmailStr)
        if not self.email:
            raise ValueError("L'email est obligatoire")

        return self
