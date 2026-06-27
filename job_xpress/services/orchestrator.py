import asyncio
import logging
from typing import List
from services.stealth_scraper import StealthScraper
from services.gemini_engine import GeminiEngine
from services.discovery_engine import discovery_engine
from services.deep_extractor import DeepExtractor
from models.job_offer_v2 import JobOffer

logger = logging.getLogger(__name__)

class JobXpressOrchestrator:
    """
    Chef d'orchestre de la V2.
    """

    def __init__(self, gemini_key: str):
        self.scraper = StealthScraper()
        self.ai = GeminiEngine(api_key=gemini_key)
        self.deep_extractor = DeepExtractor(gemini_key=gemini_key)

    async def run_discovery(self, job_title: str, location: str, candidate_profile: dict) -> List[JobOffer]:
        """
        Lance la recherche d'offres sur le web, les scrappe et les analyse en profondeur.
        """
        # 1. Recherche via le moteur de découverte
        logger.info(f"Recherche d'offres pour '{job_title}' à '{location}'...")
        seed_urls = await discovery_engine.find_job_urls(job_title, location)
        logger.info(f"{len(seed_urls)} points d'entrée trouvés.")

        # 2. Extraction Profonde (Exploration récursive des listes)
        all_job_urls = set()
        # On traite les 3 meilleurs résultats de recherche pour ne pas saturer
        for url in seed_urls[:3]:
            logger.info(f"Exploration profonde de: {url}")
            job_urls = await self.deep_extractor.extract_recursive(url, max_pages=2)
            all_job_urls.update(job_urls)

        logger.info(f"{len(all_job_urls)} offres potentielles à analyser.")

        # 3. Scrapping Furtif et Extraction IA
        results = []
        # On limite l'analyse finale à 10 offres pour ce test
        for url in list(all_job_urls)[:10]:
            logger.info(f"Analyse détaillée: {url}")
            html = await self.scraper.fetch_page(url)
            if html:
                # 4. Extraction IA via Gemini
                job_data = await self.ai.extract_job_details(html)
                if job_data:
                    job_data["url"] = url
                    offer = JobOffer(**job_data)

                    # 5. Scoring
                    offer.match_score = await self.ai.score_offer_for_candidate(candidate_profile, job_data)
                    logger.info(f"Score: {offer.match_score} pour '{offer.title}'")
                    results.append(offer)

        # Trier par score
        results.sort(key=lambda x: x.match_score, reverse=True)
        return results
