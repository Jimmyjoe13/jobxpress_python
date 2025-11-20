import httpx
import json
import asyncio
from typing import List, Dict, Any
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer
from services.web_search import web_search  # <-- Import du service Web

class LLMEngine:
    API_URL = "https://api.deepseek.com/v1/chat/completions"
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY

    async def analyze_offers_parallel(self, candidate: CandidateProfile, offers: List[JobOffer]) -> List[JobOffer]:
        """
        Analyse toutes les offres en parallèle en injectant des données Web.
        """
        print(f"🧠 Analyse IA + Vérification Web pour {len(offers)} offres...")
        
        # Création des tâches asynchrones
        tasks = [self._analyze_single_offer(candidate, offer) for offer in offers]
        
        # Exécution parallèle
        analyzed_offers = await asyncio.gather(*tasks)
        
        # Tri par score décroissant
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)
        
        return analyzed_offers

    async def _analyze_single_offer(self, candidate: CandidateProfile, offer: JobOffer) -> JobOffer:
        """
        1. Cherche infos Web sur l'entreprise.
        2. Analyse IA avec contexte Web + Offre + Candidat.
        """
        
        # --- ÉTAPE 1 : ENRICHISSEMENT WEB ---
        # On demande à DuckDuckGo qui est cette entreprise
        web_context = await web_search.get_company_reputation(offer.company)

        # --- ÉTAPE 2 : CONSTRUCTION DU PROMPT ---
        prompt = f"""
        Tu es un expert en recrutement "Growth". Ton but est de filtrer les offres.

        ⚠️ RÈGLE CRITIQUE (KILLER CRITERIA) :
        Si l'entreprise semble être une ÉCOLE, un CENTRE DE FORMATION, ou un BOOTCAMP qui cherche à vendre une formation (même en alternance) plutôt qu'à recruter un employé :
        -> METS LE SCORE "match_probability" À 0 IMMÉDIATEMENT.
        -> Dans "weaknesses", écris "ALERTE : Semble être une offre de formation/école".

        ANALYSE CROISÉE (OFFRE + WEB):
        
        --- DONNÉES WEB SUR L'ENTREPRISE ---
        {web_context}
        ------------------------------------

        --- DÉTAILS OFFRE ---
        Entreprise : {offer.company}
        Titre : {offer.title}
        Description : {offer.description[:1500]}... (tronqué)

        --- PROFIL CANDIDAT ---
        Poste : {candidate.job_title}
        Expérience : {candidate.experience_level}
        Contrat visé : {candidate.contract_type}

        Réponds UNIQUEMENT en JSON valide :
        {{
            "match_probability": (int 0-100),
            "summary": (string court 1 phrase),
            "strengths": (list string),
            "weaknesses": (list string),
            "is_training_center": (boolean)
        }}
        """

        # Mode Simulation (si pas de clé API)
        if not self.api_key:
            offer.match_score = 50
            offer.ai_analysis = {
                "summary": "Mode Simulation (Pas de Web/IA)", 
                "is_training_center": False,
                "strengths": ["Simulation"],
                "weaknesses": ["Pas de clé API"]
            }
            return offer

        # Préparation de la requête IA
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Tu es un filtre anti-spam pour chercheur d'emploi. Tu ne réponds que du JSON strict."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0, # Rigueur maximale pour le filtrage
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
                result = response.json()
                
                # Parsing de la réponse
                content_str = result['choices'][0]['message']['content']
                data = json.loads(content_str)
                
                # Mise à jour de l'offre
                offer.match_score = data.get("match_probability", 0)
                offer.ai_analysis = data
                
            except Exception as e:
                print(f"⚠️ Erreur IA/Web sur '{offer.title}': {e}")
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
            "temperature": 0.7, # Un peu de créativité pour l'écriture
            "response_format": { "type": "json_object" }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.API_URL, 
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=45.0
                )
                response.raise_for_status()
                return json.loads(response.json()['choices'][0]['message']['content'])
            except Exception as e:
                print(f"❌ Erreur Génération Lettre : {e}")
                return {"html_content": "<p>Erreur de génération.</p>", "strategic_advice": "Erreur."}

llm_engine = LLMEngine()