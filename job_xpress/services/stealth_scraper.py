import random
import asyncio
import time
import requests
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse
from services.dynamic_scraper import dynamic_scraper

class ProxyManager:
    """
    Gère un pool de proxies et suit leur état de santé.
    """
    def __init__(self, proxies: List[str] = None):
        self.proxies = proxies or []
        self.proxy_stats = {p: {'success': 0, 'fail': 0, 'banned': False} for p in self.proxies}

    def get_proxy(self) -> Optional[Dict[str, str]]:
        if not self.proxies:
            return None
        
        available = [p for p in self.proxies if not self.proxy_stats[p]['banned']]
        if not available:
            # Reset si tout est banni (cas de secours)
            for p in self.proxies: self.proxy_stats[p]['banned'] = False
            available = self.proxies
            
        proxy_url = random.choice(available)
        return {"http": proxy_url, "https": proxy_url}

    def report_status(self, proxy_url: str, success: bool, status_code: int = 200):
        if not proxy_url: return
        if success:
            self.proxy_stats[proxy_url]['success'] += 1
        else:
            self.proxy_stats[proxy_url]['fail'] += 1
            if status_code in [403, 429]:
                self.proxy_stats[proxy_url]['banned'] = True

class StealthScraper:
    """
    "THE UNSTOPPABLE" - Architecture Hybride (Requests + Playwright)
    Combine la rapidité de requests avec la puissance de Playwright pour le JS.
    """
    CHROME_120_HEADERS = {
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    # Domaines connus pour nécessiter un rendu JavaScript
    JS_HEAVY_DOMAINS = ["linkedin.com", "indeed.com", "glassdoor.com", "hellowork.com", "welcometothejungle.com"]

    def __init__(self, base_delay: int = 2000, proxies: List[str] = None):
        self.base_delay = base_delay
        self.proxy_manager = ProxyManager(proxies)
        self.session = requests.Session()

    def _get_human_delay(self):
        return max(0.5, random.gauss(self.base_delay / 1000, (self.base_delay * 0.3) / 1000))

    async def fetch_page(self, url: str) -> Optional[str]:
        """
        Tente un fetch rapide (Requests), sinon bascule sur Playwright.
        """
        domain = urlparse(url).netloc

        # 1. Vérification de la nécessité de Playwright immédiate
        if any(d in domain for d in self.JS_HEAVY_DOMAINS):
            print(f"🕵️ Domaine complexe détecté ({domain}), utilisation directe de Playwright.")
            return await dynamic_scraper.fetch_page_dynamic(url)

        # 2. Tentative Requests (Mode Rapide)
        headers = self.CHROME_120_HEADERS.copy()
        headers["Host"] = domain
        proxy = self.proxy_manager.get_proxy()
        
        await asyncio.sleep(self._get_human_delay())

        try:
            # On utilise asyncio.to_thread pour ne pas bloquer l'event loop par requests
            response = await asyncio.to_thread(
                self.session.get, 
                url, 
                headers=headers, 
                proxies=proxy, 
                timeout=15,
                allow_redirects=True
            )
            
            # Reporting au manager
            proxy_url = proxy["http"] if proxy else None
            self.proxy_manager.report_status(proxy_url, response.ok, response.status_code)
            
            # 3. Fallback sur Playwright si le contenu est suspect ou bloqué
            if response.status_code in [403, 429] or len(response.text) < 5000:
                print(f"⚠️ Contenu bloqué ou pauvre ({len(response.text)} chars), bascule vers Playwright...")
                return await dynamic_scraper.fetch_page_dynamic(url)
            
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"❌ Erreur Requests sur {url}: {e}. Tentative Playwright de secours...")
            return await dynamic_scraper.fetch_page_dynamic(url)
