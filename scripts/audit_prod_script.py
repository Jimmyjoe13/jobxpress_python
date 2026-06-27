import asyncio
from playwright.async_api import async_playwright
import os

async def audit_production():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print("🌍 Chargement de https://jobxpress.fr...")
        await page.goto("https://jobxpress.fr", wait_until="networkidle")
        
        # 1. Vérification SEO
        title = await page.title()
        description = await page.get_attribute('meta[name="description"]', "content")
        print(f"✅ Titre SEO : {title}")
        print(f"✅ Description SEO : {description}")
        
        # 2. Capture d'écran pour vérification visuelle
        await page.screenshot(path="prod_landing_audit.png", full_page=True)
        print("📸 Capture d'écran enregistrée sous 'prod_landing_audit.png'")
        
        # 3. Vérification des liens critiques
        login_btn = page.locator("a[href='/login']")
        is_login_present = await login_btn.count() > 0
        print(f"🔗 Bouton Connexion présent : {is_login_present}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(audit_production())
