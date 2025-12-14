"""
Modèles de données pour les candidats avec validation renforcée.
Inclut la protection contre les injections et la sanitization des entrées.
"""
import re
from enum import Enum
from typing import List, Optional, Any
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
    
    @classmethod
    def from_tally_id(cls, tally_id: Optional[str]) -> "WorkType":
        """
        Convertit l'ID Tally en WorkType.
        Retourne TOUS si l'ID est None ou inconnu (comportement optionnel).
        """
        if not tally_id:
            return cls.TOUS
        
        mapping = {
            "29694558-89d8-4dfa-973b-19506de2a1ad": cls.FULL_REMOTE,
            "74591379-f02b-4565-93f8-53d2251ec6ab": cls.HYBRIDE,
            "4f646aeb-c80a-4acf-b772-786f64834a8e": cls.PRESENTIEL,
        }
        return mapping.get(tally_id, cls.TOUS)


# --- 2. Dictionnaires de Mapping (Tally IDs -> Valeurs lisibles) ---

EXPERIENCE_MAP = {
    "df23bccc-d7ea-4f63-a91b-cff4f63b5369": "Junior",
    "6089233a-8e41-442d-81c1-517c21a95c85": "Confirmé",
    "f97c4c37-e7b4-44f1-a685-2ac0cabd9b50": "Sénior"
}

CONTRACT_MAP = {
    "ff75b0f4-4254-42f5-906c-994b6c443a64": "CDD",
    "5bdc568d-a217-464e-af74-bf1a5add3c9c": "CDI",
    "3ecaa138-be90-4b08-b948-7a912fbccdc6": "Alternance",
    "b1bd7297-85fe-467f-8f46-e541aff12900": "Stage"
}

WORK_TYPE_MAP = {
    "29694558-89d8-4dfa-973b-19506de2a1ad": "Full Remote",
    "74591379-f02b-4565-93f8-53d2251ec6ab": "Hybride",
    "4f646aeb-c80a-4acf-b772-786f64834a8e": "Présentiel"
}

# Patterns de validation
PHONE_PATTERN = re.compile(r'^(\+33|0)[1-9](\d{2}){4}$')
NAME_PATTERN = re.compile(r'^[\w\s\-\'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$')
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
    cleaned = XSS_PATTERN.sub('', value)
    
    # Limiter la longueur et strip
    return cleaned.strip()[:max_length]


# --- 2. Modèles pour la structure brute de Tally (Payload) ---

class TallyField(BaseModel):
    key: str
    label: str
    value: Any
    type: str


class TallyData(BaseModel):
    responseId: str
    submissionId: str
    fields: List[TallyField]


class TallyWebhookPayload(BaseModel):
    eventId: str
    createdAt: str
    data: TallyData


# --- 3. Modèle Domaine avec Validation Renforcée ---

class CandidateProfile(BaseModel):
    """
    Modèle de candidat avec validation et sanitization complètes.
    
    Protections:
    - Validation des formats (email, téléphone)
    - Sanitization anti-XSS
    - Limites de longueur
    - Valeurs par défaut sécurisées
    """
    first_name: str = Field(..., min_length=1, max_length=100, description="Prénom du candidat")
    last_name: str = Field(..., min_length=1, max_length=100, description="Nom du candidat")
    email: EmailStr = Field(..., description="Email valide du candidat")
    phone: Optional[str] = Field(None, max_length=20, description="Numéro de téléphone FR")
    job_title: str = Field(..., min_length=2, max_length=200, description="Poste recherché")
    contract_type: str = Field(default="Non spécifié", max_length=50)
    work_type: WorkType = Field(default=WorkType.TOUS, description="Type de travail souhaité")
    experience_level: str = Field(default="Non spécifié", max_length=50)
    location: str = Field(default="France", max_length=100, description="Localisation souhaitée")
    cv_url: Optional[str] = Field(None, max_length=500, description="URL du CV uploadé")
    cv_text: Optional[str] = Field(default="", description="Texte extrait du CV (OCR)")
    key_skills: List[str] = Field(default_factory=list, description="Compétences clés")
    
    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def sanitize_names(cls, v):
        """Nettoie et valide les noms."""
        if not v or not isinstance(v, str):
            return "Inconnu"
        
        cleaned = sanitize_text(v, max_length=100)
        
        # Vérifier le format
        if not cleaned or not NAME_PATTERN.match(cleaned):
            # On garde quand même un nom nettoyé plutôt que de rejeter
            return re.sub(r'[^\w\s\-]', '', cleaned) or "Inconnu"
        
        return cleaned.title()  # Capitaliser proprement
    
    @field_validator('job_title', mode='before')
    @classmethod
    def sanitize_job_title(cls, v):
        """Nettoie le titre de poste."""
        if not v or not isinstance(v, str):
            return "Non spécifié"
        
        cleaned = sanitize_text(v, max_length=200)
        
        # Garder uniquement les caractères alphanumériques et ponctuation simple
        return re.sub(r'[^\w\s\-/()&+]', '', cleaned) or "Non spécifié"
    
    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        """Valide et formate le numéro de téléphone."""
        if not v or not isinstance(v, str):
            return None
        
        # Nettoyer les espaces et tirets
        cleaned = re.sub(r'[\s\-\.]', '', v.strip())
        
        # Vérifier le format FR
        if PHONE_PATTERN.match(cleaned):
            return cleaned
        
        # Si le format est invalide mais contient des chiffres, on le garde
        digits_only = re.sub(r'[^\d+]', '', v)
        if len(digits_only) >= 10:
            return digits_only[:15]  # Limiter à 15 caractères
        
        return None
    
    @field_validator('location', mode='before')
    @classmethod
    def sanitize_location(cls, v):
        """Nettoie la localisation."""
        if not v or not isinstance(v, str):
            return "France"
        
        return sanitize_text(v, max_length=100) or "France"
    
    @field_validator('cv_url', mode='before')
    @classmethod
    def validate_cv_url(cls, v):
        """Valide l'URL du CV."""
        if not v or not isinstance(v, str):
            return None
        
        # Vérifier que c'est une URL valide
        if v.startswith(('http://', 'https://')):
            return v[:500]  # Limiter la longueur
        
        return None
    
    @model_validator(mode='after')
    def ensure_valid_profile(self):
        """Validation finale du profil complet."""
        # S'assurer que l'email n'est pas vide (déjà validé par EmailStr)
        if not self.email:
            raise ValueError("L'email est obligatoire")
        
        return self

    @classmethod
    def from_tally(cls, payload: TallyWebhookPayload) -> "CandidateProfile":
        """
        Transforme le JSON Tally complexe en objet CandidateProfile simple.
        Avec validation et sanitization automatiques.
        """
        fields_dict = {f.key: f.value for f in payload.data.fields}

        # Helper pour extraire la valeur proprement
        def get_val(key: str):
            val = fields_dict.get(key)
            if isinstance(val, list) and len(val) > 0 and isinstance(val[0], str):
                return val[0]
            return val

        # Extraction CV
        cv_data = fields_dict.get("question_D7DOXE")
        cv_url = None
        if isinstance(cv_data, list) and len(cv_data) > 0:
            cv_url = cv_data[0].get('url') if isinstance(cv_data[0], dict) else None

        # Mapping des IDs
        contract_id = get_val("question_7NWEGz")
        exp_id = get_val("question_6Z7Po5")
        work_id = get_val("question_Q7Je8X")
        
        # Conversion en valeurs lisibles
        contract_clean = CONTRACT_MAP.get(contract_id, "Non spécifié") if contract_id else "Non spécifié"
        exp_clean = EXPERIENCE_MAP.get(exp_id, "Non spécifié") if exp_id else "Non spécifié"
        # Utilise l'Enum WorkType - retourne TOUS si aucune sélection
        work_type_enum = WorkType.from_tally_id(work_id)

        return cls(
            first_name=fields_dict.get("question_l6NAep") or "Inconnu",
            last_name=fields_dict.get("question_Y4ZO06") or "Inconnu",
            email=fields_dict.get("question_D7V1kj") or "unknown@example.com",
            phone=fields_dict.get("question_RDz4Mp"),
            job_title=fields_dict.get("question_a26zVy") or "Non spécifié",
            contract_type=contract_clean,
            work_type=work_type_enum,
            experience_level=exp_clean,
            location=fields_dict.get("question_4K2egY") or "France",
            cv_url=cv_url,
            cv_text=""
        )