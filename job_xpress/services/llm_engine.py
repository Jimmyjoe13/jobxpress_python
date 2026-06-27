import json
import asyncio
import hashlib
from typing import List, Dict, Any, Optional
from core.config import settings
from core.logging_config import get_logger
from models.candidate import CandidateProfile
from models.job_offer import JobOffer
from services.llm_providers.openai_provider import OpenAIProvider
from services.cache_service import cache_service

logger = get_logger()

class LLMEngine:
    """
    Moteur IA de JobXpress V2, alimenté par OpenAI GPT-5.
    Optimisé pour les coûts via le routage dynamique et le cache par hash.
    """
    def __init__(self):
        self.openai = OpenAIProvider()
        self.model_mini = settings.OPENAI_MODEL_FAST # gpt-5-nano
        self.model_pro = settings.OPENAI_MODEL_PREMIUM # gpt-5

    def _generate_job_hash(self, offer: JobOffer) -> str:
        """Génère un hash unique pour une offre d'emploi."""
        content = f"{offer.title}|{offer.company}|{offer.description}"
        return hashlib.md5(content.encode()).hexdigest()

    async def analyze_offers_parallel(
        self, candidate: CandidateProfile, offers: List[JobOffer]
    ) -> List[JobOffer]:
        """
        Analyse toutes les offres en parallèle avec OpenAI (Modèle Mini + Cache).
        """
        logger.info(f"🧠 Analyse OpenAI GPT-5 Mini pour {len(offers)} offres")
        
        candidate_json = {
            "job_title": candidate.job_title,
            "experience_level": candidate.experience_level,
            "skills": candidate.skills if hasattr(candidate, 'skills') else [],
        }

        tasks = [self._analyze_single_offer(candidate_json, offer) for offer in offers]
        return await asyncio.gather(*tasks)

    async def _analyze_single_offer(
        self, candidate_json: Dict[str, Any], offer: JobOffer
    ) -> JobOffer:
        """Analyse une offre individuelle avec gestion du cache."""
        job_hash = self._generate_job_hash(offer)
        cache_key = f"job_analysis:{job_hash}"
        
        # 1. Vérifier le cache
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info(f"💾 Cache Hit pour l'offre: {offer.title}")
            analysis = json.loads(cached_result)
            offer.match_score = analysis.get("score", 0)
            offer.ai_analysis = analysis.get("reasoning", "")
            return offer

        # 2. Appel API (Modèle Mini pour le coût)
        try:
            prompt = [
                {"role": "system", "content": "Tu es un expert en recrutement. Note la compatibilité entre un candidat et une offre d'emploi de 0 à 100. Réponds en JSON: {\"score\": int, \"reasoning\": str}"},
                {"role": "user", "content": f"Candidat: {json.dumps(candidate_json)}\nOffre: {offer.title} chez {offer.company}\nDescription: {offer.description[:2000]}"}
            ]
            
            result = await self.openai.generate_json(prompt, model=self.model_mini)
            
            offer.match_score = result.get("score", 0)
            offer.ai_analysis = result.get("reasoning", "")
            
            # 3. Sauvegarder dans le cache (TTL 24h)
            await cache_service.set(cache_key, json.dumps(result), ttl_seconds=86400)
            
        except Exception as e:
            logger.error(f"⚠️ Erreur OpenAI sur '{offer.title}': {e}")
            offer.match_score = 0
        
        return offer

    async def generate_strategic_advice(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> Dict[str, Any]:
        """Génère un dossier de préparation entretien au lieu d'une simple lettre."""
        logger.info(f"🧠 Génération dossier stratégique Pro pour {offer.title}")
        
        prompt = [
            {"role": "system", "content": """Tu es un coach en carrière expert. 
            Génère un dossier de préparation d'entretien structuré en HTML (balises h3, p, ul, li uniquement).
            Le dossier doit contenir:
            1. 🎯 Points forts du candidat pour ce poste.
            2. 🛠️ Faiblesses ou lacunes à combler/justifier.
            3. ❓ 3 Questions probables que le recruteur posera et comment y répondre.
            4. ✨ Mots-clés et compétences à mettre en avant sur le CV pour ce poste spécifique."""},
            {"role": "user", "content": f"Candidat: {candidate.first_name} {candidate.last_name}, {candidate.job_title}. CV: {candidate.cv_text[:2000]}. Offre: {offer.title} chez {offer.company}. Description: {offer.description[:2000]}"}
        ]
        
        advice_html = await self.openai.chat(prompt, model=self.model_pro)
        
        return {
            "html_content": advice_html,
            "strategic_advice": "Dossier de préparation généré par GPT-5 Pro."
        }

    async def stream_strategic_advice(
        self, candidate: CandidateProfile, offer: JobOffer
    ):
        """Streame le dossier stratégique."""
        logger.info(f"✍️ Streaming dossier Pro pour {offer.title}")
        
        prompt = [
            {"role": "system", "content": "Tu es un coach en carrière expert. Génère un dossier de préparation d'entretien structuré en HTML (h3, p, ul, li)."},
            {"role": "user", "content": f"Candidat: {candidate.first_name} {candidate.last_name}, {candidate.job_title}. Offre: {offer.title} chez {offer.company}. Description: {offer.description[:2000]}"}
        ]
        
        async for chunk in self.openai.stream_chat(prompt, model=self.model_pro):
            yield chunk

# Instance globale
llm_engine = LLMEngine()
