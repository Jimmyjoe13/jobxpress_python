import json
import asyncio
from typing import List, Dict, Any, Optional
from core.config import settings
from core.logging_config import get_logger
from models.candidate import CandidateProfile
from models.job_offer import JobOffer
from services.gemini_engine import GeminiEngine

logger = get_logger()

class LLMEngine:
    """
    Moteur IA de JobXpress V2, alimenté par Gemini 1.5 Flash.
    Remplace l'ancienne implémentation OpenAI/DeepSeek pour plus de rapidité et de précision.
    """
    def __init__(self):
        self.gemini = GeminiEngine(api_key=settings.GEMINI_API_KEY)

    async def analyze_offers_parallel(
        self, candidate: CandidateProfile, offers: List[JobOffer]
    ) -> List[JobOffer]:
        """
        Analyse toutes les offres en parallèle avec Gemini.
        """
        logger.info(f"🧠 Analyse Gemini V2 pour {len(offers)} offres")
        
        # 1. Structurer le profil candidat si ce n'est pas déjà fait
        candidate_json = {
            "job_title": candidate.job_title,
            "experience_level": candidate.experience_level,
            "top_skills": candidate.skills if hasattr(candidate, 'skills') else [],
            "preferred_contract": candidate.contract_type
        }

        # 2. Lancer les analyses en parallèle
        tasks = [self._analyze_single_offer(candidate_json, offer) for offer in offers]
        return await asyncio.gather(*tasks)

    async def _analyze_single_offer(
        self, candidate_json: Dict[str, Any], offer: JobOffer
    ) -> JobOffer:
        """Analyse une offre individuelle."""
        try:
            # On utilise le titre et la description pour le scoring
            job_json = {
                "title": offer.title,
                "company": offer.company,
                "description": offer.description[:3000]
            }
            
            score = await self.gemini.score_offer_for_candidate(candidate_json, job_json)
            offer.match_score = score
            offer.ai_analysis = {"reasoning": f"Score calculé par Gemini 1.5 Flash: {score}%"}
        except Exception as e:
            logger.error(f"⚠️ Erreur Gemini sur '{offer.title}': {e}")
            offer.match_score = 50 # Fallback
        
        return offer

    async def generate_cover_letter(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> Dict[str, Any]:
        """Génère la lettre de motivation V2."""
        candidate_json = {
            "name": f"{candidate.first_name} {candidate.last_name}",
            "job_title": candidate.job_title,
            "top_skills": candidate.skills if hasattr(candidate, 'skills') else [],
            "experience_level": candidate.experience_level
        }
        
        job_json = {
            "title": offer.title,
            "company": offer.company,
            "description": offer.description[:2000]
        }
        
        letter_html = await self.gemini.generate_cover_letter_v2(candidate_json, job_json)
        
        return {
            "html_content": letter_html,
            "strategic_advice": "Lettre optimisée par Gemini 1.5 Flash."
        }

# Instance globale
llm_engine = LLMEngine()
