from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JobOffer(BaseModel):
    """
    Représente une offre d'emploi standardisée + Analyse IA.
    """
    title: str
    company: str
    location: Optional[str] = "Non spécifié"
    description: str
    url: str
    date_posted: Optional[str] = None
    contract_type: Optional[str] = None
    is_remote: bool = False
    
    # --- Champs pour l'IA (Nouveau) ---
    match_score: int = 0  # 0 à 100
    ai_analysis: Optional[Dict[str, Any]] = None # Stockera le JSON complet de l'IA
    
    class Config:
        from_attributes = True