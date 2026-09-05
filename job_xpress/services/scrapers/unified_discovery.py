"""
Unified Reverse API Engine pour JobXpress.
Orchestre l'interrogation concurrente des plateformes d'emploi (Free-Work, Remotive, Jobicy),
applique la mise en cache Redis (TTL 2h), la déduplication avancée et la fusion intelligente d'offres.
"""

import asyncio
import hashlib
import logging
from typing import List, Optional
from models.job_offer_v2 import JobOffer
from services.scrapers.free_work_scraper import FreeWorkScraper
from services.scrapers.remotive_scraper import RemotiveScraper
from services.scrapers.jobicy_scraper import JobicyScraper
from services.scrapers.deduplication import deduplicate_job_offers, clean_title
from services.redis_cache import redis_cache

logger = logging.getLogger("jobxpress.scrapers")

class UnifiedReverseApiEngine:
    """
    Moteur de découverte d'offres d'emploi multi-sources 100% Reverse API.
    Remplace définitivement JSearch et RapidAPI avec cache Redis et déduplication intelligente.
    """

    CACHE_TTL_SECONDS = 7200  # 2 heures de fraîcheur en cache

    def __init__(self):
        self.scrapers = [
            FreeWorkScraper(),
            RemotiveScraper(),
            JobicyScraper(),
        ]

    def _generate_cache_key(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None
    ) -> str:
        """Génère un hash MD5 déterministe pour la clé de cache de recherche."""
        clean_t = clean_title(job_title)
        clean_l = (location or "france").lower().strip()
        clean_c = (contract_type or "all").lower().strip()
        raw = f"{clean_t}::{clean_l}::{clean_c}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    async def find_jobs(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15,
        no_cache: bool = False
    ) -> List[JobOffer]:
        """
        Recherche des offres avec cache Redis et fallback d'interrogation multi-sources.
        """
        cache_key = self._generate_cache_key(job_title, location, contract_type)

        # 1. Vérification du Cache Redis (< 15ms)
        if not no_cache and redis_cache.is_available:
            try:
                cached_data = redis_cache.get(cache_key, prefix="search:v2:")
                if cached_data and isinstance(cached_data, list):
                    cached_offers = [
                        JobOffer(**item) if isinstance(item, dict) else item
                        for item in cached_data
                    ]
                    logger.info(
                        f"🎯 [Redis Cache HIT] {len(cached_offers)} offres restituées instantanément pour '{job_title}' à '{location or 'France'}' (key={cache_key[:8]})"
                    )
                    return cached_offers[:limit]
            except Exception as e:
                logger.warning(f"⚠️ Erreur lecture cache Redis: {e}")

        logger.info(
            f"🚀 [Redis Cache MISS] Sourcing Reverse API multi-sources pour '{job_title}' à '{location or 'France'}' (limite={limit})"
        )

        # 2. Exécution concurrente sur tous les connecteurs Reverse API
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

        # 3. Déduplication avancée et fusion intelligente
        unique_offers = deduplicate_job_offers(all_offers, limit=max(limit, 30))
        logger.info(f"🎯 Total offres unifiées et dédupliquées: {len(unique_offers)} (sur {len(all_offers)} brutes)")

        # 4. Mise en cache Redis (TTL 2h)
        if redis_cache.is_available and unique_offers:
            try:
                serialized = [
                    offer.model_dump() if hasattr(offer, "model_dump") else offer.dict()
                    for offer in unique_offers
                ]
                redis_cache.set(
                    cache_key,
                    serialized,
                    ttl=self.CACHE_TTL_SECONDS,
                    prefix="search:v2:"
                )
                logger.info(
                    f"💾 [Redis Cache SET] {len(unique_offers)} offres indexées en cache (TTL={self.CACHE_TTL_SECONDS}s, key={cache_key[:8]})"
                )
            except Exception as e:
                logger.warning(f"⚠️ Erreur enregistrement cache Redis: {e}")

        return unique_offers[:limit]

    async def find_job_urls(self, job_title: str, location: Optional[str] = None) -> List[str]:
        """Récupère une liste d'URLs directes d'offres pour compatibilité avec le pipeline existant."""
        jobs = await self.find_jobs(job_title=job_title, location=location, limit=10)
        return [j.url for j in jobs if j.url]