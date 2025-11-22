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
        Analyse toutes les offres en parallèle en injectant des données Web et OCR.
        """
        print(f"🧠 Analyse IA + Vérification Web pour {len(offers)} offres...")
        
        tasks = [self._analyze_single_offer(candidate, offer) for offer in offers]
        analyzed_offers = await asyncio.gather(*tasks)
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        
        return analyzed_offers

    async def _analyze_single_offer(self, candidate: CandidateProfile, offer: JobOffer) -> JobOffer:
        """
        1. Cherche infos Web sur l'entreprise.
        2. Analyse IA avec contexte Web + Offre + Candidat (CV complet).
        """
        # 1. Données Web
        web_context = await web_search.get_company_reputation(offer.company)

        # 2. Prompt Intelligent et IMPITOYABLE
        # On injecte le CV complet et les règles strictes
        prompt = f"""
        Tu es un expert en recrutement. Ton but est de filtrer les offres selon des critères STRICTS.

        ⚠️ CRITÈRES ÉLIMINATOIRES (KILLER CRITERIA) :
        
        1. TYPE DE CONTRAT : Le candidat veut "{candidate.contract_type}".
           - Si l'offre est clairement un "Stage" (Internship) de courte durée (< 12 mois) alors que le candidat veut "Alternance" (Apprenticeship) -> SCORE 0.
           - Si l'offre est un "CDI" alors que le candidat veut "Alternance" -> SCORE 0 (sauf si "CDI" est mentionné comme possible après alternance).
           
        2. MODE DE TRAVAIL : Le candidat veut "{candidate.work_type}".
           - Si candidat = "Full Remote" et l'offre exige une présence sur site (Hybride/Présentiel) -> SCORE 0.
           - Si candidat = "Présentiel" et l'offre est "Full Remote" -> Pénalité (mais pas 0, car adaptable).

        3. TYPE D'ENTREPRISE :
           - Si c'est une ÉCOLE, un CFA ou un organisme de formation qui cherche à vendre une formation (et non un emploi salarié) -> SCORE 0.

        --- CONTEXTE ---
        Infos Web Entreprise : {web_context}
        
        --- OFFRE D'EMPLOI ---
        Entreprise : {offer.company}
        Titre : {offer.title}
        Description : {offer.description[:2500]}... (tronqué)

        --- PROFIL CANDIDAT ---
        Poste visé : {candidate.job_title}
        Expérience : {candidate.experience_level}
        Contrat visé : {candidate.contract_type}
        Mode de travail souhaité : {candidate.work_type}
        
        DÉTAILS DU CV (OCR) :
        {candidate.cv_text[:3000] if candidate.cv_text else "Pas de CV analysé."}

        Réponds UNIQUEMENT en JSON valide :
        {{
            "match_probability": (int 0-100),
            "reasoning": "Pourquoi ce score ? (Mentionne explicitement si le contrat ou le remote ne colle pas)",
            "summary": "Résumé court de l'offre",
            "company_type": "Entreprise" ou "École/Formation"
        }}
        """

        if not self.api_key:
            offer.match_score = 50
            offer.ai_analysis = {"summary": "Simulation", "reasoning": "Mode Mock"}
            return offer

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Tu es un analyste JSON strict."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0, # Rigueur maximale
            "response_format": { "type": "json_object" }
        }

        async with httpx.AsyncClient() as client:
            try:
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
        Génère la lettre de motivation en utilisant les détails du CV (OCR).
        """
        print(f"✍️  Rédaction de la lettre pour : {offer.title} chez {offer.company}...")
        
        prompt = f"""
        Tu es un expert en recrutement. Rédige une lettre de motivation personnalisée et percutante.
        
        CANDIDAT:
        - Nom: {candidate.first_name} {candidate.last_name}
        - Poste actuel: {candidate.job_title}
        - Expérience: {candidate.experience_level}
        - Type de contrat visé: {candidate.contract_type}
        
        DÉTAILS DU PARCOURS (CV) :
        {candidate.cv_text[:4000] if candidate.cv_text else "Pas de CV fourni."}
        
        OFFRE CIBLE:
        - Entreprise: {offer.company}
        - Titre: {offer.title}
        - Contexte: {offer.description[:1500]}...
        
        INSTRUCTIONS:
        1. La lettre doit être professionnelle, convaincante et formatée en HTML propre (balises <p>, <br>, <strong>).
        2. Utilise les détails du CV pour faire des liens concrets avec l'offre (ex: "Mon expérience chez X m'a permis de...").
        3. Ne mets PAS les balises <html> ou <body>, juste le contenu des paragraphes.
        4. Ajoute une section "conseils" séparée.

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
                response = await client.post(
                    self.API_URL, 
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=120.0 
                )
                response.raise_for_status()
                return json.loads(response.json()['choices'][0]['message']['content'])
            except Exception as e:
                print(f"❌ Erreur Génération Lettre : {e}")
                return {"html_content": "<p>Erreur de génération (Délai dépassé).</p>", "strategic_advice": "Réessayez."}

llm_engine = LLMEngine()