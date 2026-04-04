import asyncio
from typing import List, Set
from services.stealth_scraper import StealthScraper
from services.gemini_engine import GeminiEngine

class DeepExtractor:
    """
    Système d'extraction profonde capable de naviguer dans les listes et la pagination.
    """
    
    def __init__(self, gemini_key: str):
        self.scraper = StealthScraper()
        self.ai = GeminiEngine(api_key=gemini_key)
        self.visited_urls: Set[str] = set()

    async def extract_recursive(self, start_url: str, max_pages: int = 3) -> List[str]:
        """
        Explore une URL de départ et extrait toutes les URLs d'offres trouvées via pagination.
        """
        all_job_urls = set()
        current_url = start_url
        pages_processed = 0

        while current_url and pages_processed < max_pages:
            if current_url in self.visited_urls:
                break
                
            print(f"🌐 Analyse Profonde: {current_url}")
            html = await self.scraper.fetch_page(current_url)
            self.visited_urls.add(current_url)
            
            if not html:
                break
                
            # Demander à l'IA d'analyser la structure (Liste vs Offre unique)
            structure = await self.ai.analyze_page_structure(html, current_url)
            
            if structure["page_type"] == "LISTE_OFFRES":
                found_urls = structure.get("job_urls", [])
                print(f"📍 {len(found_urls)} offres trouvées sur cette page.")
                all_job_urls.update(found_urls)
                
                # Passer à la page suivante
                current_url = structure.get("next_page_url")
                pages_processed += 1
            elif structure["page_type"] == "OFFRE_UNIQUE":
                all_job_urls.add(current_url)
                break
            else:
                break
                
            # Délai entre les pages de liste
            await asyncio.sleep(2)
            
        return list(all_job_urls)
