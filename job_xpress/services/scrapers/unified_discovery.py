"""
Unified Reverse API Engine pour JobXpress.
Orchestre l'interrogation concurrente des plateformes d'emploi (Free-Work, Remotive, Jobicy),
applique la déduplication intelligente et unifie les données au format JobOffer standard.
"""

import asyncio
import re
import logging
from typing import List, Optional, Set
from models.job_offer_v2 import JobOffer
from services.scrapers.free_work_scraper import FreeWorkScraper
from services.scrapers.remotive_scraper import RemotiveScraper
from services.scrapers.jobicy_scraper import JobicyScraper

logger = logging.getLogger("jobxpress.scrapers")

def normalize_text(text: str) -> str:
    """Normalise un texte pour comparaison et déduplication."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return " ".join(text.split())

class UnifiedReverseApiEngine:
    """
    Moteur de découverte d'offres d'emploi multi-sources 100% Reverse API.
    Remplace définitivement JSearch et RapidAPI.
    """

    def __init__(self):
        self.scrapers = [
            FreeWorkScraper(),
            RemotiveScraper(),
            JobicyScraper(),
        ]

    async def find_jobs(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15
    ) -> List[JobOffer]:
        """
        Interroge toutes les Reverse APIs en parallèle et déduplique les résultats.
        """
        logger.info(f"🚀 Sourcing Reverse API multi-sources pour '{job_title}' à '{location or 'France'}' (limite={limit})")

        # Exécution concurrente sur tous les connecteurs
        tasks = [
            scraper.search(
                job_title=job_title,
                location=location,
                contract_type=contract_type,
                limit=limit
            )
            for scraper in self.scrapers
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_offers: List[JobOffer] = []
        for i, res in enumerate(results):
            scraper_name = self.scrapers[i].name
            if isinstance(res, Exception):
                logger.error(f"❌ Scraper '{scraper_name}' a échoué: {res}")
            elif isinstance(res, list):
                logger.info(f"📦 Scraper '{scraper_name}': {len(res)} offres retournées")
                all_offers.extend(res)

        # Déduplication par signature (titre_normalisé + entreprise_normalisée) et par URL
        unique_offers: List[JobOffer] = []
        seen_keys: Set[str] = set()
        seen_urls: Set[str] = set()

        for offer in all_offers:
            # Clé de déduplication sémantique
            norm_title = normalize_text(offer.title)
            norm_comp = normalize_text(offer.company)
            dedup_key = f"{norm_title}::{norm_comp}"

            clean_url = offer.url.split("?")[0].rstrip("/")

            if dedup_key in seen_keys or clean_url in seen_urls:
                continue

            seen_keys.add(dedup_key)
            seen_urls.add(clean_url)
            unique_offers.append(offer)

            if len(unique_offers) >= limit:
                break

        logger.info(f"🎯 Total offres unifiées et dédupliquées: {len(unique_offers)} (sur {len(all_offers)} brutes)")
        return unique_offers

    async def find_job_urls(self, job_title: str, location: Optional[str] = None) -> List[str]:
        """Récupère une liste d'URLs directes d'offres pour compatibilité avec le pipeline existant."""
        jobs = await self.find_jobs(job_title=job_title, location=location, limit=10)
        return [j.url for j in jobs if j.url]