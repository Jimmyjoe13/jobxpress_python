import json
import httpx
from typing import Dict, Any, Optional

class CoverLetterService:
    """
    GÃ©nÃ¨re des lettres de motivation ultra-personnalisÃ©es via Gemini.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    async def generate_letter(self, candidate_profile: Dict[str, Any], job_offer: Dict[str, Any]) -> str:
        """
        GÃ©nÃ¨re une lettre basÃ©e sur le profil et l'offre.
        """
        prompt = f"""
        RÃ©dige une lettre de motivation percutante et personnalisÃ©e.
        
        CONTEXTE CANDIDAT :
        {json.dumps(candidate_profile, indent=2)}
        
        OFFRE D'EMPLOI :
        {json.dumps(job_offer, indent=2)}
        
        RÃˆGLES DE RÃ‰DACTION :
        1. Ton : Professionnel, enthousiaste mais naturel (Ã©vite le style robotique).
        2. Structure : Accroche directe, lien entre les skills du candidat et les besoins de l'offre, appel Ã  l'action.
        3. Langue : FranÃ§ais.
        4. Longueur : Environ 250 mots.
        
        Retourne uniquement le texte de la lettre.
        """

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}?key={self.api_key}",
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            try:
                return result['candidates'][0]['content']['parts'][0]['text'].strip()
            except (KeyError, IndexError):
                return "Erreur lors de la gÃ©nÃ©ration de la lettre."
