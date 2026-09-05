"""
DiscoveryEngine - Moteur de découverte d'offres d'emploi multi-sources Reverse API.
Remplace l'ancienne dépendance RapidAPI / JSearch par une infrastructure souveraine,
performante et gratuite (Free-Work, Remotive, Jobicy).
"""

import logging
from typing import List, Optional
from models.job_offer_v2 import JobOffer
from services.scrapers.unified_discovery import UnifiedReverseApiEngine

logger = logging.getLogger("jobxpress.discovery")


class DiscoveryEngine:
    """
    Moteur de découverte d'offres d'emploi basé sur les Reverse APIs de jobboards.
    Émancipation totale de RapidAPI et JSearch.
    """

    def __init__(self):
        self.engine = UnifiedReverseApiEngine()

    async def find_jobs(
        self,
        job_title: str,
        location: str = "France",
        limit: int = 15,
        contract_type: Optional[str] = None,
        no_cache: bool = False,
    ) -> List[JobOffer]:
        """
        Trouve des offres d'emploi réelles via les Reverse APIs des plateformes.
        """
        logger.info(f"🔎 DiscoveryEngine: Sourcing Reverse API pour '{job_title}' à '{location}'")
        return await self.engine.find_jobs(
            job_title=job_title,
            location=location,
            contract_type=contract_type,
            limit=limit,
            no_cache=no_cache,
        )

    async def find_job_urls(self, job_title: str, location: str = "France") -> List[str]:
        """
        Retourne les URLs des offres trouvées.
        """
        return await self.engine.find_job_urls(job_title=job_title, location=location)


# Instance globale singleton
discovery_engine = DiscoveryEngine()

