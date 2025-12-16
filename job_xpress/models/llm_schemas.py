"""
Schémas Pydantic pour valider les réponses structurées du LLM (DeepSeek).

Ces schémas garantissent que les réponses JSON du LLM sont conformes
à notre format attendu, même si le LLM hallucine des clés ou des valeurs.
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class LLMScoreResponse(BaseModel):
    """
    Schéma strict pour la réponse de scoring DeepSeek.
    
    Valide les 3 axes de scoring + métadonnées.
    """
    score_technical: int = Field(ge=0, le=100, default=0, description="Score technique (hard skills)")
    score_structural: int = Field(ge=0, le=100, default=0, description="Score structurel (contrat/remote)")
    score_experience: int = Field(ge=0, le=100, default=0, description="Score expérience (niveau)")
    is_school_scheme: bool = Field(default=False, description="True si c'est une école/CFA")
    reasoning: str = Field(default="", max_length=1000, description="Analyse courte")
    strengths: List[str] = Field(default_factory=list, description="Points forts")
    weaknesses: List[str] = Field(default_factory=list, description="Points faibles")

    @field_validator('score_technical', 'score_structural', 'score_experience', mode='before')
    @classmethod
    def coerce_to_int(cls, v):
        """Gère les cas où le LLM renvoie un string, float ou None."""
        if v is None:
            return 0
        if isinstance(v, str):
            try:
                return int(float(v.strip()))
            except (ValueError, TypeError):
                return 0
        if isinstance(v, float):
            return int(v)
        return v

    @field_validator('is_school_scheme', mode='before')
    @classmethod
    def coerce_to_bool(cls, v):
        """Gère les cas où le LLM renvoie 'true'/'false' comme string."""
        if v is None:
            return False
        if isinstance(v, str):
            return v.lower() in ('true', '1', 'yes', 'oui')
        return bool(v)

    @field_validator('strengths', 'weaknesses', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Gère les cas où le LLM renvoie un string au lieu d'une liste."""
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v.strip() else []
        if not isinstance(v, list):
            return []
        # Filtrer les valeurs non-string et limiter à 5 éléments
        return [str(item) for item in v if item][:5]

    @field_validator('reasoning', mode='before')
    @classmethod
    def ensure_string(cls, v):
        """Gère les cas où le LLM renvoie autre chose qu'un string."""
        if v is None:
            return ""
        if not isinstance(v, str):
            return str(v)
        return v[:1000]  # Tronquer si trop long
    
    def calculate_weighted_score(
        self, 
        w_tech: float = 0.4, 
        w_struct: float = 0.3, 
        w_exp: float = 0.3
    ) -> int:
        """
        Calcule le score final pondéré.
        
        Args:
            w_tech: Poids du score technique (défaut: 40%)
            w_struct: Poids du score structurel (défaut: 30%)
            w_exp: Poids du score expérience (défaut: 30%)
        
        Returns:
            Score final arrondi (0-100)
        """
        if self.is_school_scheme:
            return 0
        
        score = (
            self.score_technical * w_tech +
            self.score_structural * w_struct +
            self.score_experience * w_exp
        )
        return int(score)


class LLMCoverLetterResponse(BaseModel):
    """
    Schéma pour la réponse de génération de lettre de motivation.
    """
    subject: str = Field(default="Candidature", description="Objet de la lettre")
    html_content: str = Field(default="", description="Contenu HTML de la lettre")
    text_content: Optional[str] = Field(default=None, description="Version texte brut (optionnel)")
    
    @field_validator('subject', 'html_content', mode='before')
    @classmethod
    def ensure_string(cls, v):
        """Gère les cas où le LLM renvoie autre chose qu'un string."""
        if v is None:
            return ""
        if not isinstance(v, str):
            return str(v)
        return v
