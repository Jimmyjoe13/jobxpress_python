"""
Modèles Pydantic V2 pour le workflow State Machine.

Définit les états de candidature, les filtres de recherche,
et les schémas de requête/réponse pour les endpoints Human-in-the-Loop.
"""
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class ApplicationStatus(str, Enum):
    """
    États du workflow de candidature.
    
    Transitions valides:
    DRAFT -> SEARCHING -> WAITING_SELECTION -> ANALYZING -> GENERATING_DOCS -> COMPLETED
                      |                                                      |
                      +------------------> FAILED <--------------------------+
    """
    DRAFT = "DRAFT"
    SEARCHING = "SEARCHING"
    WAITING_SELECTION = "WAITING_SELECTION"
    ANALYZING = "ANALYZING"
    GENERATING_DOCS = "GENERATING_DOCS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class UserPlan(str, Enum):
    """Plans utilisateur pour le système de crédits."""
    FREE = "FREE"
    PRO = "PRO"


class JobFilters(BaseModel):
    """Filtres avancés pour affiner la recherche."""
    min_salary: Optional[int] = Field(None, ge=0, description="Salaire minimum en euros")
    remote_only: bool = Field(False, description="Filtrer uniquement les offres remote")
    exclude_agencies: bool = Field(True, description="Exclure les cabinets de recrutement")
    max_days_old: int = Field(14, ge=1, le=90, description="Ancienneté max des offres en jours")


class SearchStartRequest(BaseModel):
    """Requête pour démarrer une recherche d'offres."""
    job_title: str = Field(..., min_length=2, max_length=200, description="Intitulé du poste recherché")
    location: str = Field("France", max_length=100, description="Localisation souhaitée")
    contract_type: str = Field("CDI", description="Type de contrat")
    work_type: str = Field("Tous", description="Présentiel, Hybride, Full Remote ou Tous")
    experience_level: str = Field("Non spécifié", description="Junior, Confirmé ou Senior")
    filters: Optional[JobFilters] = Field(None, description="Filtres avancés optionnels")
    cv_url: Optional[str] = Field(None, max_length=500, description="URL du CV uploadé")
    # Infos candidat pour l'email
    candidate_email: Optional[str] = Field(None, max_length=255, description="Email du candidat")
    first_name: Optional[str] = Field(None, max_length=100, description="Prénom")
    last_name: Optional[str] = Field(None, max_length=100, description="Nom")
    phone: Optional[str] = Field(None, max_length=50, description="Téléphone")


class SearchStartResponse(BaseModel):
    """Réponse après démarrage d'une recherche."""
    application_id: str = Field(..., description="UUID de la candidature créée")
    status: ApplicationStatus
    message: str
    credits_remaining: int = Field(..., ge=0)


class JobResultItem(BaseModel):
    """Représentation d'une offre dans les résultats de recherche."""
    id: str = Field(..., description="ID interne pour sélection")
    title: str
    company: str
    location: str = Field("Non spécifié", description="Localisation de l'offre")
    url: str
    date_posted: Optional[str] = None
    is_remote: bool = False
    work_type: Optional[str] = None
    salary_warning: bool = Field(False, description="True si salaire non mentionné")
    is_agency: bool = Field(False, description="True si cabinet de recrutement détecté")
    source: Optional[str] = Field(None, description="Source de l'offre (jsearch, serpapi, etc.)")


class ApplicationResults(BaseModel):
    """Résultats d'une recherche en attente de sélection utilisateur."""
    application_id: str
    status: ApplicationStatus
    total_found: int = Field(..., ge=0)
    jobs: List[JobResultItem]
    message: str


class SelectJobsRequest(BaseModel):
    """Requête pour sélectionner les offres retenues."""
    selected_job_ids: List[str] = Field(
        ..., 
        min_length=1, 
        max_length=5,
        description="Liste des IDs d'offres sélectionnées (1 à 5)"
    )


class SelectJobsResponse(BaseModel):
    """Réponse après sélection des offres."""
    status: ApplicationStatus
    message: str
    selected_count: int


class AdviceRequest(BaseModel):
    """Requête pour obtenir des conseils d'entretien."""
    include_company_research: bool = Field(True, description="Inclure une analyse de l'entreprise")


class AdviceResponse(BaseModel):
    """Conseils d'entretien générés par l'IA."""
    advice: str
    company_insights: Optional[str] = None
    credits_remaining: int


# --- Modèles pour la base de données ---

class ApplicationV2Create(BaseModel):
    """Données pour créer une nouvelle candidature."""
    user_id: str
    job_title: str
    location: str = "France"
    contract_type: Optional[str] = None
    work_type: Optional[str] = None
    experience_level: Optional[str] = None
    job_filters: Optional[dict] = Field(default_factory=dict)
    cv_url: Optional[str] = None


class ApplicationV2InDB(ApplicationV2Create):
    """Représentation complète d'une candidature en base."""
    id: str
    status: ApplicationStatus = ApplicationStatus.DRAFT
    raw_jobs: Optional[List[dict]] = None
    selected_jobs: Optional[List[dict]] = None
    final_choice: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


# --- Modèles pour le système de crédits ---

class UserCredits(BaseModel):
    """État des crédits d'un utilisateur."""
    user_id: str
    credits: int = Field(..., ge=0)
    plan: UserPlan = UserPlan.FREE
    last_credit_reset: Optional[datetime] = None
    next_reset_at: Optional[datetime] = None


class CreditTransaction(BaseModel):
    """Transaction de crédit (pour historique)."""
    user_id: str
    amount: int  # Négatif = débit, Positif = crédit
    reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now())
