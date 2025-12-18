from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JobOffer(BaseModel):
    """
    Représente une offre d'emploi standardisée + Analyse IA.
    
    V2: Ajout des champs pour la déduplication et le filtrage intelligent.
    """
    title: str
    company: str
    location: Optional[str] = "Non spécifié"
    description: str
    url: str
    date_posted: Optional[str] = None
    contract_type: Optional[str] = None
    is_remote: bool = False
    work_type: Optional[str] = None  # "Full Remote", "Hybride", "Présentiel" ou None
    
    # --- Champs V2 (déduplication & filtres) ---
    source: Optional[str] = None  # "jsearch", "active_jobs", "serpapi"
    salary_warning: bool = False  # True si salaire non mentionné
    is_agency: bool = False  # True si cabinet de recrutement détecté
    
    # --- Champs pour l'IA ---
    match_score: int = 0  # 0 à 100
    ai_analysis: Optional[Dict[str, Any]] = None  # JSON complet de l'analyse IA
    
    class Config:
        from_attributes = True