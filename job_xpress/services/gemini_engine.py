import json
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class GeminiEngine:
    """
    Moteur IA basé sur Gemini 1.5 Flash pour une extraction rapide et précise.
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    async def extract_job_details(self, html_content: str) -> Dict[str, Any]:
        """
        Extrait les détails structurés d'une offre d'emploi à partir du HTML/Texte brut.
        """
        prompt = f"""
        Analyse l'offre d'emploi suivante et extrais les informations structurées en JSON.
        
        RÈGLES :
        - Retourne UNIQUEMENT du JSON.
        - Si une information est manquante, mets null.
        
        STRUCTURE ATTENDUE :
        {{
            "title": "Titre du poste",
            "company": "Nom de l'entreprise",
            "location": "Ville ou Télétravail",
            "salary": "Fourchette salariale si indiquée",
            "description": "Résumé propre de l'offre",
            "skills": ["Compétence 1", "Compétence 2"],
            "contract_type": "CDI, CDD, Alternance, etc.",
            "is_remote": boolean
        }}

        CONTENU :
        {html_content[:10000]}
        """

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
            }
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
                # Gemini retourne le texte dans candidates[0].content.parts[0].text
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                return json.loads(text_response)
            except (KeyError, json.JSONDecodeError) as e:
                print(f"Erreur de parsing Gemini: {e}")
                return {}

    async def structure_candidate_profile(self, raw_cv_text: str) -> Dict[str, Any]:
        """
        Transforme le texte brut d'un CV en profil structuré pour un meilleur matching.
        """
        prompt = f"""
        Analyse ce CV et extrais les informations clés en JSON.
        
        STRUCTURE :
        {{
            "job_title": "Poste actuel ou visé",
            "experience_level": "Junior, Senior, etc.",
            "top_skills": ["Skill 1", "Skill 2", "Skill 3"],
            "education": "Niveau d'études",
            "preferred_contract": "CDI, Freelance, etc. (si mentionné)",
            "summary": "Résumé de 2 phrases du profil"
        }}

        CV :
        {raw_cv_text[:5000]}
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.api_url}?key={self.api_key}", json=payload)
            response.raise_for_status()
            result = response.json()
            return json.loads(result['candidates'][0]['content']['parts'][0]['text'])

    async def score_offer_for_candidate(self, candidate_profile: Dict[str, Any], job_offer: Dict[str, Any]) -> int:
        """
        Calcule un score de compatibilité entre un candidat et une offre.
        """
        prompt = f"""
        Évalue la compatibilité entre ce candidat et cette offre d'emploi.
        Retourne un score entre 0 et 100.
        
        CANDIDAT :
        {json.dumps(candidate_profile)}
        
        OFFRE :
        {json.dumps(job_offer)}
        
        Retourne uniquement un entier (le score).
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
            text_score = result['candidates'][0]['content']['parts'][0]['text'].strip()
            
            try:
                return int(text_score)
            except ValueError:
                return 50

    async def generate_cover_letter_v2(self, candidate_profile: Dict[str, Any], job_offer: Dict[str, Any]) -> str:
        """
        Génère une lettre de motivation percutante en utilisant les données structurées.
        """
        prompt = f"""
        Rédige une lettre de motivation courte et percutante (max 250 mots).
        
        PROFIL CANDIDAT :
        {json.dumps(candidate_profile)}
        
        OFFRE CIBLE :
        {json.dumps(job_offer)}

        CONSIGNES :
        1. Ne sois pas générique. Utilise les "top_skills" du candidat pour répondre aux besoins de l'offre.
        2. Le ton doit être professionnel mais moderne.
        3. Structure : Introduction captivante, Lien entre profil et besoins, Appel à l'action.
        4. Retourne la lettre au format HTML simple (balises <p> et <br>).
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.api_url}?key={self.api_key}", json=payload, timeout=60.0)
            response.raise_for_status()
            result = response.json()
            return result['candidates'][0]['content']['parts'][0]['text']

    async def analyze_page_structure(self, html_content: str, base_url: str) -> Dict[str, Any]:
        """
        Détermine si la page est une offre unique ou une liste d'offres, 
        et extrait les URLs pertinentes (offres et pagination).
        """
        prompt = f"""
        Analyse la structure de cette page web (provenant de {base_url}).

        OBJECTIFS :
        1. Déterminer si c'est une "OFFRE_UNIQUE" ou une "LISTE_OFFRES".
        2. Extraire les URLs des offres d'emploi présentes (si c'est une liste).
        3. Extraire l'URL de la page suivante (pagination) si elle existe.

        RÈGLES :
        - Retourne UNIQUEMENT du JSON.
        - Assure-toi que les URLs sont valides.

        STRUCTURE JSON :
        {{
            "page_type": "OFFRE_UNIQUE" | "LISTE_OFFRES" | "AUTRE",
            "job_urls": ["url1", "url2", ...],
            "next_page_url": "url_pagination" | null
        }}

        CONTENU :
        {html_content[:15000]}
        """

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
            }
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
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                return json.loads(text_response)
            except (KeyError, json.JSONDecodeError):
                return {"page_type": "AUTRE", "job_urls": [], "next_page_url": None}
