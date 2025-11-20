import httpx
import json
import asyncio
from typing import List, Dict, Any
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer
from services.web_search import web_search

class LLMEngine:
    API_URL = "https://api.deepseek.com/v1/chat/completions"
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY

    async def analyze_offers_parallel(self, candidate: CandidateProfile, offers: List[JobOffer]) -> List[JobOffer]:
        print(f"🧠 Analyse IA + Vérification Web pour {len(offers)} offres...")
        tasks = [self._analyze_single_offer(candidate, offer) for offer in offers]
        analyzed_offers = await asyncio.gather(*tasks)
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        return analyzed_offers

    async def _analyze_single_offer(self, candidate: CandidateProfile, offer: JobOffer) -> JobOffer:
        
        # 1. Données Web
        web_context = await web_search.get_company_reputation(offer.company)

        # 2. Prompt Intelligent
        prompt = f"""
        Tu es un expert en recrutement. Ton but est d'identifier les VRAIES opportunités d'emploi.

        ANALYSE DU TYPE D'ENTREPRISE (DISTINCTION CRUCIALE) :
        
        🟢 TYPE A : ENTREPRISE VALIDE (Score Normal)
        - Agence (Web, Pub, Presse), Startup, PME, Grand Groupe.
        - MÊME SI elle travaille dans le secteur de la formation (EdTech) ou vend de la formation à ses clients.
        - Indice : Elle recrute un salarié ou un alternant pour travailler sur des projets internes ou clients.
        - Exemples valides : "Media-Start" (Agence), "Digi-Certif" (Service aux entreprises).

        🔴 TYPE B : ÉCOLE / FAUSSE OFFRE (Score = 0)
        - École de commerce, CFA, Bootcamp qui cherche des "étudiants".
        - L'offre demande de s'inscrire à une formation payante ou "gratuite financée".
        - Exemples invalides : "ISCOD", "OpenClassrooms", "MyDigitalSchool" (si l'offre est pour devenir étudiant).

        --- INFOS WEB ---
        {web_context}
        -----------------

        --- OFFRE ---
        Entreprise : {offer.company}
        Titre : {offer.title}
        Desc : {offer.description[:1500]}...

        --- CANDIDAT ---
        Poste : {candidate.job_title} (Exp: {candidate.experience_level})

        Réponds UNIQUEMENT en JSON :
        {{
            "match_probability": (int 0-100, mettre 0 SI Type B),
            "company_type": "Entreprise" ou "École/Formation",
            "summary": (court résumé),
            "reasoning": (pourquoi ce score ?),
            "is_school_scheme": (boolean)
        }}
        """

        if not self.api_key:
            offer.match_score = 50
            offer.ai_analysis = {"summary": "Simulation", "company_type": "Inconnu"}
            return offer

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Tu es un analyste JSON strict."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "response_format": { "type": "json_object" }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.API_URL, 
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = json.loads(response.json()['choices'][0]['message']['content'])
                
                offer.match_score = data.get("match_probability", 0)
                offer.ai_analysis = data
                
            except Exception as e:
                print(f"⚠️ Erreur IA sur '{offer.title}': {e}")
                offer.match_score = 0
                offer.ai_analysis = {"error": str(e)}
        
        return offer

    # ... (Garde la fonction generate_cover_letter inchangée ci-dessous) ...
    async def generate_cover_letter(self, candidate: CandidateProfile, offer: JobOffer) -> Dict[str, Any]:
        # Recopie le code de generate_cover_letter de l'étape précédente ici
        # (Je ne le remets pas pour alléger la réponse, mais il doit y être !)
        prompt = f"""
        Rédige une lettre de motivation HTML pour {candidate.first_name} {candidate.last_name}.
        Cible : {offer.title} chez {offer.company}.
        Réponds en JSON : {{"html_content": "...", "strategic_advice": "..."}}
        """
        if not self.api_key: return {"html_content": "<p>Simulation</p>"}
        
        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": { "type": "json_object" }
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(self.API_URL, headers={"Authorization": f"Bearer {self.api_key}"}, json=payload, timeout=45.0)
            return json.loads(res.json()['choices'][0]['message']['content'])

llm_engine = LLMEngine()