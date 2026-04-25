"""
PlaywrightScraper - DEPRECATED
Ce service a été remplacé par JSearch API pour une meilleure stabilité en production sur Render.
"""

class PlaywrightScraper:
    def __init__(self, *args, **kwargs):
        pass
    
    async def fetch_page(self, url: str):
        print(f"⚠️ PlaywrightScraper est obsolète. Tentative d'accès à {url} ignorée.")
        return None
