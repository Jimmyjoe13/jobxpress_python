from ddgs import DDGS
import asyncio
from typing import List
from services.stealth_scraper import StealthScraper

class DiscoveryEngine:
    """
    Moteur de découverte d'offres d'emploi sur le web.
    Cible les agrégateurs et les sites carrières via des recherches avancées.
    """
    
    def __init__(self):
        self.ddgs = DDGS()
        self.scraper = StealthScraper()

    async def find_job_urls(self, job_title: str, location: str) -> List[str]:
        """
        Trouve des URLs d'offres d'emploi pertinentes.
        """
        # Requêtes ciblées sur les gros agrégateurs
        queries = [
            f'site:indeed.fr "{job_title}" "{location}"',
            f'site:hellowork.com "{job_title}" "{location}"',
            f'site:linkedin.com/jobs "{job_title}" "{location}"',
            f'"{job_title}" "{location}" recrutement offres',
        ]
        
        all_urls = set()
        
        for query in queries:
            try:
                # Utilisation de DDGS (synchrone wrappé en async)
                results = await asyncio.to_thread(self._search_sync, query)
                for r in results:
                    all_urls.add(r['href'])
                
                # Petit délai humain entre les recherches
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Erreur recherche DDGS pour '{query}': {e}")
                
        return list(all_urls)

    def _search_sync(self, query: str):
        return list(self.ddgs.text(query, region="fr-fr", max_results=10))

# Instance globale
discovery_engine = DiscoveryEngine()
