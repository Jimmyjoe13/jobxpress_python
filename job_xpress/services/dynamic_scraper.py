from playwright.async_api import async_playwright
import asyncio
import random

class DynamicScraper:
    """
    Scraper utilisant Playwright pour naviguer dans les sites Modernes (JS-heavy).
    Supporte le rendu JS et le Lazy Loading.
    """
    
    async def fetch_page_dynamic(self, url: str) -> str:
        """
        Récupère le contenu HTML complet après rendu JavaScript.
        """
        async with async_playwright() as p:
            # On utilise un navigateur Chromium réel
            browser = await p.chromium.launch(headless=True)
            
            # Configuration furtive du contexte
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080},
                device_scale_factor=1,
            )
            
            page = await context.new_page()
            
            # Simulation comportement humain (mouvement souris léger)
            await page.mouse.move(random.randint(0, 100), random.randint(0, 100))
            
            try:
                print(f"🌐 Playwright : Navigation vers {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                
                # Attente pour le chargement des scripts AJAX
                await asyncio.sleep(random.uniform(2, 4))
                
                # Simulation de scroll pour charger les offres en Lazy Loading
                await page.evaluate("window.scrollBy(0, 500)")
                await asyncio.sleep(1)
                
                # Capture du HTML final rendu
                content = await page.content()
                return content
                
            except Exception as e:
                print(f"❌ Erreur Playwright sur {url}: {e}")
                return ""
            finally:
                await browser.close()

# Instance globale
dynamic_scraper = DynamicScraper()
