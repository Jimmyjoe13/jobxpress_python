"""
SearchEngine V2 - Moteur de recherche "Unstoppable" basé sur l'orchestrateur V2.
Utilise Gemini 1.5 Flash pour l'analyse et le Scrapping Furtif pour la récupération.
"""

import asyncio
import json
from typing import List, Optional, Dict, Any
from core.config import settings
from core.logging_config import get_logger
from models.candidate import CandidateProfile
from models.job_offer_v2 import JobOffer
from services.discovery_engine import discovery_engine
from services.llm_providers.openai_provider import OpenAIProvider
from services.database import db_service

logger = get_logger()

class SearchEngineV2:
    """
    Interface de recherche V2 compatible avec les endpoints FastAPI existants.
    Optimisée pour JSearch API et pgvector.
    """

    def __init__(self):
        self.discovery = discovery_engine
        self.openai = OpenAIProvider()

    async def find_jobs_v2(
        self,
        candidate: CandidateProfile,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> List[JobOffer]:
        """
        Exécute le workflow optimisé : Vector Search (DB) + JSearch API (Web).
        """
        logger.info(f"🔎 SearchEngineV2 (API Hybrid): {candidate.job_title} à {candidate.location}")

        # 1. Recherche Vectorielle dans la base existante
        db_results = []
        try:
            search_query = f"{candidate.job_title} {candidate.experience_level} {candidate.location}"
            if candidate.cv_text:
                search_query += f" {candidate.cv_text[:1000]}"

            embedding = await self.openai.generate_embeddings(search_query)

            matches = db_service.search_jobs_vector(
                query_embedding=embedding,
                match_threshold=0.5,
                match_count=limit,
                user_id=candidate.user_id
            )

            if matches:
                logger.info(f"🎯 {len(matches)} offres trouvées via Vector Search")
                db_results = []
                for m in matches:
                    # Conversion score float (0-1) vers int (0-100)
                    m["match_score"] = int(float(m.get("match_score", 0)) * 100)
                    db_results.append(JobOffer(**m))
        except Exception as e:
            logger.warning(f"⚠️ Échec Vector Search: {e}")

        # 2. Découverte d'offres via API (si pas assez de résultats en DB)
        if len(db_results) < limit:
            logger.info("🌐 Lancement de la découverte d'offres via JSearch API...")
            
            try:
                web_results = await self.discovery.find_jobs(
                    job_title=candidate.job_title,
                    location=candidate.location,
                    limit=limit - len(db_results)
                )
                
                # Sauvegarder les nouveaux résultats en DB avec embedding
                for job in web_results:
                    asyncio.create_task(self._index_job_vector(job, candidate.user_id))
                
                return db_results + web_results

            except Exception as e:
                logger.error(f"❌ Erreur Discovery Engine: {e}")
                return db_results

        return db_results[:limit]

    async def _index_job_vector(self, job: JobOffer, user_id: str = None):
        """Génère l'embedding et sauvegarde l'offre en DB."""
        try:
            content = f"{job.title} {job.company} {job.description}"
            embedding = await self.openai.generate_embeddings(content)
            db_service.save_job_v2(job, user_id=user_id, embedding=embedding)
        except Exception as e:
            logger.error(f"⚠️ Échec indexation vectorielle job: {e}")

# Factory function pour créer l'instance
def create_search_engine_v2():
    """Crée une instance de SearchEngineV2."""
    return SearchEngineV2()
