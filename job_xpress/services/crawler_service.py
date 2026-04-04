import asyncio
from typing import List, Set, Dict, Any, Optional
from services.stealth_scraper import StealthScraper
from services.gemini_engine import GeminiEngine

class CrawlerService:
    """
    GÃ¨re la navigation récursive et la pagination (Deep Extraction).
    """

    def __init__(self, scraper: StealthScraper, ai: GeminiEngine, max_pages: int = 3):
        self.scraper = scraper
        self.ai = ai
        self.max_pages = max_pages
        self.visited_urls: Set[str] = set()

    async def crawl_and_extract(self, start_url: str) -> List[str]:
        """
        Parcourt une URL de dÃ©part, gÃ¨re la pagination et extrait les URLs d'offres.
        """
        queue = [start_url]
        job_urls = set()
        pages_processed = 0

        while queue and pages_processed < self.max_pages:
            current_url = queue.pop(0)
            if current_url in self.visited_urls:
                continue
            
            print(f"â³ Crawling page {pages_processed + 1}: {current_url}")
            html = await self.scraper.fetch_page(current_url)
            self.visited_urls.add(current_url)

            
            if not html:
                continue

            # Analyse de la structure par l'IA
            analysis = await self.ai.analyze_page_structure(html, current_url)
            page_type = analysis.get("page_type")
            
            if page_type == "OFFRE_UNIQUE":
                job_urls.add(current_url)
            elif page_type == "LISTE_OFFRES":
                # Ajouter les URLs d'offres trouvÃ©es
                for url in analysis.get("job_urls", []):
                    job_urls.add(url)
                
                # GÃ©rer la pagination
                next_page = analysis.get("next_page_url")
                if next_page and next_page not in self.visited_urls:
                    queue.append(next_page)
            
            pages_processed += 1
            await asyncio.sleep(1) # Petit dÃ©lai entre les pages de liste

        return list(job_urls)
