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
        """
        Analyse toutes les offres en parallèle en injectant des données Web.
        """
        print(f"🧠 Analyse IA + Vérification Web pour {len(offers)} offres...")
        
        tasks = [self._analyze_single_offer(candidate, offer) for offer in offers]
        analyzed_offers = await asyncio.gather(*tasks)
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        
        return analyzed_offers

    async def _analyze_single_offer(self, candidate: CandidateProfile, offer: JobOffer) -> JobOffer:
        """
        1. Cherche infos Web sur l'entreprise.
        2. Analyse IA avec contexte Web + Offre + Candidat.
        """
        # 1. Données Web
        web_context = await web_search.get_company_reputation(offer.company)

        # 2. Prompt Intelligent
        prompt = f"""
        Tu es un expert en recrutement. Ton but est d'identifier les VRAIES opportunités d'emploi.

        ANALYSE DU TYPE D'ENTREPRISE (DISTINCTION CRUCIALE) :
        
        🟢 TYPE A : ENTREPRISE VALIDE (Score Normal)
        - Agence, Startup, PME, Grand Groupe.
        - MÊME SI elle travaille dans le secteur de la formation (EdTech).
        - Indice : Elle recrute un salarié ou un alternant pour travailler sur des projets.

        🔴 TYPE B : ÉCOLE / FAUSSE OFFRE (Score = 0)
        - École de commerce, CFA, Bootcamp qui cherche des "étudiants" à inscrire.
        - L'offre demande de s'inscrire à une formation.

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
                # Timeout augmenté à 60s pour l'analyse (par sécurité)
                response = await client.post(
                    self.API_URL, 
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=60.0 
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

    async def generate_cover_letter(self, candidate: CandidateProfile, offer: JobOffer) -> Dict[str, Any]:
        """
        Génère la lettre de motivation pour le meilleur candidat.
        """
        print(f"✍️  Rédaction de la lettre pour : {offer.title} chez {offer.company}...")
        
        prompt = f"""
        Tu es un expert en recrutement. Rédige une lettre de motivation personnalisée.
        
        CANDIDAT:
        - Nom: {candidate.first_name} {candidate.last_name}
        - Poste actuel: {candidate.job_title}
        - Expérience: {candidate.experience_level}
        
        OFFRE CIBLE:
        - Entreprise: {offer.company}
        - Titre: {offer.title}
        - Contexte: {offer.description[:1000]}...
        
        INSTRUCTIONS:
        1. La lettre doit être professionnelle, convaincante et formatée en HTML propre (balises <p>, <br>, <strong>).
        2. Ne mets PAS les balises <html> ou <body>, juste le contenu des paragraphes.
        3. Ajoute une section "conseils" séparée.

        FORMAT DE RÉPONSE ATTENDU (JSON):
        {{
            "html_content": "<p>Monsieur, Madame,...</p>",
            "strategic_advice": "Mettez en avant votre expérience sur..."
        }}
        """
        
        if not self.api_key:
            return {
                "html_content": f"<p>Lettre générée (Simulation) pour {offer.company}.</p>",
                "strategic_advice": "Ceci est un conseil factice."
            }

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Tu es un assistant JSON strict."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "response_format": { "type": "json_object" }
        }

        async with httpx.AsyncClient() as client:
            try:
                # --- MODIFICATION ICI : Timeout passé à 120 secondes ---
                response = await client.post(
                    self.API_URL, 
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=120.0 
                )
                response.raise_for_status()
                return json.loads(response.json()['choices'][0]['message']['content'])
            except Exception as e:
                print(f"❌ Erreur Génération Lettre (Timeout ou autre) : {e}")
                return {"html_content": "<p>Erreur de génération (Délai dépassé).</p>", "strategic_advice": "Réessayez."}

llm_engine = LLMEngine()