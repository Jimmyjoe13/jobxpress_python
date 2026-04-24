import asyncio
import random
import os
import subprocess
from typing import Optional
from playwright.async_api import async_playwright

def get_chromium_path():
    """Tente de trouver le chemin du binaire Chromium dans l'image Docker."""
    # Chemins probables dans l'image Docker
    paths = [
        "/app/pw-browsers/chromium-1208/chrome-linux/chrome",
        "/app/pw-browsers/chromium-1208/chrome-headless-shell-linux64/chrome-headless-shell",
        "/root/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
        "/home/appuser/.cache/ms-playwright/chromium-1208/chrome-linux/chrome"
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

class PlaywrightScraper:
    """
    Scraper ultra-robuste utilisant Playwright pour les sites SPA/JavaScript.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def fetch_page(self, url: str) -> Optional[str]:
        """
        Charge une page web en simulant un navigateur rÃ©el.
        """
        async with async_playwright() as p:
            # Recherche du binaire Chromium installé
            exe_path = get_chromium_path()
            
            launch_args = {
                "headless": self.headless,
                "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            }
            if exe_path:
                launch_args["executable_path"] = exe_path
                print(f"🚀 Playwright: Utilisation du binaire à {exe_path}")

            try:
                browser = await p.chromium.launch(**launch_args)
            except Exception as e:
                print(f"❌ Échec lancement direct, tentative standard: {e}")
                browser = await p.chromium.launch(headless=self.headless)
            
            # Context avec User-Agent rÃ©el
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )

            page = await context.new_page()
            
            # Injection de scripts de furtivitÃ© (simulÃ© ici, nÃ©cessite playwright-stealth rÃ©ellement)
            # await stealth_async(page) 

            print(f"ðŸ•µï¸  Playwright: Chargement de {url}...")
            
            try:
                # On attend que le rÃ©seau soit calme (indique que le JS est chargÃ©)
                await page.goto(url, wait_until="networkidle", timeout=60000)
                
                # Simulation de scroll humain pour dÃ©clencher les lazy-loadings
                await self._human_scroll(page)
                
                content = await page.content()
                await browser.close()
                return content
            except Exception as e:
                print(f"âŒ  Playwright Error ({url}): {e}")
                await browser.close()
                return None

    async def _human_scroll(self, page):
        """Simule un scroll humain pour dÃ©bloquer le contenu dynamique."""
        for _ in range(3):
            scroll_amount = random.randint(300, 700)
            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await asyncio.sleep(random.uniform(0.5, 1.5))
