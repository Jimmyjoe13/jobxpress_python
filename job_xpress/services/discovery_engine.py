import httpx
import asyncio
import logging
from typing import List, Dict, Any
from core.config import settings
from models.job_offer_v2 import JobOffer

logger = logging.getLogger("jobxpress")

class DiscoveryEngine:
    """
    Moteur de découverte d'offres d'emploi utilisant l'API JSearch (RapidAPI).
    Remplace le scraping web instable par une solution de production fiable.
    """
    
    def __init__(self):
        self.api_key = settings.RAPIDAPI_KEY
        self.base_url = "https://jsearch.p.rapidapi.com/search"
        self.host = "jsearch.p.rapidapi.com"

    async def find_jobs(self, job_title: str, location: str, limit: int = 10) -> List[JobOffer]:
        """
        Trouve des offres d'emploi via JSearch API.
        """
        if not self.api_key:
            logger.error("❌ RAPIDAPI_KEY non configurée")
            return []

        logger.info(f"🔎 JSearch: Recherche de '{job_title}' à '{location}'")

        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.host
        }
        
        params = {
            "query": f"{job_title} in {location}",
            "page": "1",
            "num_pages": "1",
            "date_posted": "all"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.base_url, headers=headers, params=params)
                
                if response.status_code != 200:
                    logger.error(f"❌ Erreur JSearch API ({response.status_code}): {response.text}")
                    return []
                
                data = response.json()
                results = data.get("data", [])
                
                job_offers = []
                for item in results[:limit]:
                    offer = JobOffer(
                        title=item.get("job_title", "Sans titre"),
                        company=item.get("employer_name", "Entreprise inconnue"),
                        location=f"{item.get('job_city', '')} {item.get('job_country', '')}".strip() or location,
                        description=item.get("job_description", ""),
                        url=item.get("job_apply_link", ""),
                        salary=item.get("job_salary_currency", "") + str(item.get("job_min_salary", "")) if item.get("job_min_salary") else "N/A",
                        contract_type=item.get("job_employment_type", "CDI"),
                        is_remote=item.get("job_is_remote", False),
                        skills=[], # Sera rempli par l'analyse IA si besoin
                        match_score=0
                    )
                    job_offers.append(offer)
                
                logger.info(f"✅ JSearch: {len(job_offers)} offres trouvées")
                return job_offers

        except Exception as e:
            logger.error(f"❌ Erreur critique DiscoveryEngine (JSearch): {e}")
            return []

    async def find_job_urls(self, job_title: str, location: str) -> List[str]:
        """
        Méthode legacy pour compatibilité, retourne les URLs des offres trouvées.
        """
        offers = await self.find_jobs(job_title, location)
        return [o.url for o in offers if o.url]

# Instance globale
discovery_engine = DiscoveryEngine()
