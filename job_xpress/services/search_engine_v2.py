"""
SearchEngine V2 - Moteur de recherche "Unstoppable" basé sur l'orchestrateur V2.
Utilise Gemini 1.5 Flash pour l'analyse et le Scrapping Furtif pour la récupération.
"""

import asyncio
from typing import List, Optional, Dict, Any
from core.config import settings
from core.logging_config import get_logger
from models.candidate import CandidateProfile
from models.job_offer_v2 import JobOffer
from services.orchestrator import JobXpressOrchestrator

logger = get_logger()

class SearchEngineV2:
    """
    Interface de recherche V2 compatible avec les endpoints FastAPI existants.
    Encapsule le JobXpressOrchestrator.
    """

    def __init__(self):
        self.orchestrator = JobXpressOrchestrator(gemini_key=settings.GEMINI_API_KEY)

    async def find_jobs_v2(
        self,
        candidate: CandidateProfile,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> List[JobOffer]:
        """
        Exécute le workflow "Unstoppable" de découverte d'offres.
        """
        logger.info(f"🔎 SearchEngineV2 (Unstoppable): {candidate.job_title} à {candidate.location}")

        # Conversion du profil candidat pour l'orchestrateur
        candidate_dict = {
            "job_title": candidate.job_title,
            "experience_level": candidate.experience_level,
            "contract_type": candidate.contract_type,
            "location": candidate.location,
            "top_skills": candidate.skills if hasattr(candidate, 'skills') else []
        }

        try:
            # Appel de l'orchestrateur V2
            results = await self.orchestrator.run_discovery(
                job_title=candidate.job_title,
                location=candidate.location,
                candidate_profile=candidate_dict
            )
            
            # On retourne les meilleurs résultats dans la limite demandée
            return results[:limit]

        except Exception as e:
            logger.error(f"❌ Erreur critique SearchEngineV2: {e}")
            return []

# Factory function pour créer l'instance
def create_search_engine_v2():
    """Crée une instance de SearchEngineV2."""
    return SearchEngineV2()
