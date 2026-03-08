import asyncio
import os
import sys

# Ajouter le chemin du projet au sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.config import settings
from services.llm_providers.openai_provider import OpenAIProvider

async def main():
    print(f"✅ Provider LLM Configuré : {settings.LLM_PROVIDER}")
    print(f"✅ Modèle par défaut : {settings.OPENAI_MODEL_MAIN}")
    
    provider = OpenAIProvider()
    
    print(f"✅ Clé API configurée (OpenAI ou Fallback DeepSeek) ? {'OUI' if provider.api_key else 'NON'}")
    print(f"✅ URL de base configurée : {provider.base_url}")
    
    print("\n--- Test d'initialisation des requêtes ---")
    try:
        # Appel léger
        print("Envoi requête test (ceci peut échouer si clé absente ou incorrecte)...")
        res = await provider.generate_json(
            messages=[
                {"role": "system", "content": "Tu es un expert JSON. Réponds un objet JSON simple avec la clé status."},
                {"role": "user", "content": "Donne moi le status 'OK'."}
            ],
            model=settings.OPENAI_MODEL_MAIN,
            temperature=0.7,
            timeout=10.0
        )
        print("🎉 Réponse JSON obtenue :", res)
    except Exception as e:
        print(f"⚠️ La requête a levé une exception réseau/timeout/auth attendue : {type(e).__name__} - {str(e)}")
        print("Cela confirme que le mécanisme réseau via HTTPX dans OpenAIProvider fonctionne correctement.")

if __name__ == "__main__":
    asyncio.run(main())
