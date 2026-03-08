import httpx
import json
import asyncio
from typing import List, Dict, Any
from pydantic import ValidationError
from core.config import settings
from core.logging_config import get_logger
from core.retry import CircuitBreaker
from models.candidate import CandidateProfile, WorkType
from models.job_offer import JobOffer
from models.llm_schemas import LLMScoreResponse
from services.web_search import web_search

# Logger structuré
logger = get_logger()

# Circuit breaker pour DeepSeek
deepseek_circuit = CircuitBreaker(failure_threshold=3, recovery_timeout=180)


class LLMEngine:
    def __init__(self):
        from services.llm_providers.openai_provider import OpenAIProvider
        self.provider = OpenAIProvider()

    async def analyze_offers_parallel(
        self, candidate: CandidateProfile, offers: List[JobOffer]
    ) -> List[JobOffer]:
        """
        Analyse toutes les offres en parallèle avec le nouveau scoring expert.
        """
        logger.info(f"🧠 Analyse IA Expert pour {len(offers)} offres")

        tasks = [self._analyze_single_offer(candidate, offer) for offer in offers]
        analyzed_offers = await asyncio.gather(*tasks)

        # Tri par le nouveau score calculé (Pondéré)
        analyzed_offers.sort(key=lambda x: x.match_score, reverse=True)

        return analyzed_offers

    async def _analyze_single_offer(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> JobOffer:
        """
        Analyse une offre sur 3 axes (Tech, Structure, Exp) et calcule un score pondéré.
        """
        # 1. Contexte Web (E-réputation)
        web_context = await web_search.get_company_reputation(offer.company)

        # 2. Prompt de Scoring Multidimensionnel
        prompt = f"""
        Agis comme un Directeur du Recrutement expert. Evalue la compatibilité de cette offre pour le candidat.

        🚨 RÈGLE D'OR (KILLER CRITERIA) :
        - Si l'entreprise est une ÉCOLE, un CFA ou vend une formation : Mets TOUS les scores à 0.

        ANALYSE SUR 3 AXES (Note chaque axe de 0 à 100) :

        1. **TECHNIQUE (Hard Skills)** :
           - Les compétences du CV correspondent-elles aux besoins de l'offre ?
           - Le candidat maitrise-t-il la stack/outils demandés ?

        2. **STRUCTUREL (Contrat & Remote)** :
           - Le candidat veut : "{candidate.contract_type}" en "{candidate.work_type}".
           - Si l'offre est un Stage alors qu'il veut Alternance -> Note faible (ex: 20).
           - Si l'offre est Présentiel alors qu'il veut Full Remote -> Note faible.
           - Si c'est parfait -> 100.

        3. **EXPÉRIENCE (Niveau)** :
           - Le candidat est : "{candidate.experience_level}".
           - Si l'offre demande 5 ans d'xp et qu'il est Junior -> Note faible.

        --- DONNÉES ---
        Entreprise (Web Info) : {web_context}
        Offre (Contenu) : {offer.description[:2500]}...
        Candidat (CV) : {candidate.cv_text[:3000] if candidate.cv_text else "Non fourni"}

        Réponds UNIQUEMENT en JSON valide :
        {{
            "score_technical": (0-100),
            "score_structural": (0-100),
            "score_experience": (0-100),
            "is_school_scheme": (boolean, true si c'est une école),
            "reasoning": "Analyse courte en 1 phrase",
            "strengths": ["Point fort 1", "Point fort 2"],
            "weaknesses": ["Point faible 1"]
        }}
        """

        if not self.provider.api_key:
            offer.match_score = 50
            offer.ai_analysis = {"summary": "Simulation", "reasoning": "Mode Mock"}
            return offer

        messages = [
            {"role": "system", "content": "Tu es un analyste JSON strict."},
            {"role": "user", "content": prompt},
        ]

        try:
            score_dict = await self.provider.generate_json(
                messages=messages,
                model=settings.OPENAI_MODEL_MAIN,
                temperature=0.1,
                timeout=60.0
            )

            # --- VALIDATION PYDANTIC ---
            try:
                score_data = LLMScoreResponse.model_validate(score_dict)
            except ValidationError as ve:
                logger.warning(
                    f"⚠️ Validation Pydantic échouée pour '{offer.title}': {ve.error_count()} erreurs"
                )
                logger.debug(f"Détails validation: {ve.errors()}")
                return self._fallback_scoring(candidate, offer)

            # --- CALCUL DU SCORE PONDÉRÉ via le modèle ---
            final_score = score_data.calculate_weighted_score(
                w_tech=0.4,  # 40% Compétences
                w_struct=0.3,  # 30% Contrat/Lieu
                w_exp=0.3,  # 30% Expérience
            )

            offer.match_score = final_score
            # On stocke les détails pour l'affichage dans l'email
            offer.ai_analysis = score_data.model_dump()

        except httpx.TimeoutException:
            logger.warning(f"⚠️ Timeout IA sur '{offer.title}'")
            return self._fallback_scoring(candidate, offer)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("⚠️ Quota LLM dépassé")
            else:
                logger.warning(f"⚠️ Erreur HTTP LLM: {e.response.status_code}")
            return self._fallback_scoring(candidate, offer)
        except Exception as e:
            logger.warning(f"⚠️ Erreur IA sur '{offer.title}': {e}")
            return self._fallback_scoring(candidate, offer)

        return offer

    def _fallback_scoring(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> JobOffer:
        """
        Scoring heuristique sans IA en cas d'échec DeepSeek.
        Permet de continuer le traitement même si l'IA est down.
        """
        logger.info(f"🔄 Fallback scoring pour: {offer.title}")

        score = 40  # Base

        # +20 si le titre correspond
        if candidate.job_title.lower() in offer.title.lower():
            score += 20
        elif any(
            word in offer.title.lower() for word in candidate.job_title.lower().split()
        ):
            score += 10

        # +15 si même localisation
        if candidate.location.lower() in (offer.location or "").lower():
            score += 15

        # Scoring work_type amélioré avec toutes les combinaisons
        offer_work_type = offer.work_type or (
            "Full Remote" if offer.is_remote else None
        )
        match (candidate.work_type, offer_work_type):
            case (WorkType.FULL_REMOTE, "Full Remote"):
                score += 15  # Match parfait
            case (WorkType.HYBRIDE, "Hybride"):
                score += 15  # Match parfait
            case (WorkType.HYBRIDE, "Full Remote"):
                score += 10  # Compatible (remote ok pour hybride)
            case (WorkType.PRESENTIEL, None) | (WorkType.PRESENTIEL, "Présentiel"):
                score += 10  # Présumé présentiel
            case (WorkType.TOUS, _):
                score += 5  # Neutre, pas de préférence
            case (WorkType.FULL_REMOTE, "Présentiel") | (WorkType.FULL_REMOTE, None):
                score -= 10  # Pénalité: incompatible
            case _:
                pass  # Autres combinaisons: neutre

        # Détection école basique (mots-clés)
        school_keywords = ["formation", "école", "cfa", "campus", "academy", "bootcamp"]
        desc_lower = (offer.description or "").lower()
        if any(kw in desc_lower for kw in school_keywords):
            score = max(score - 30, 0)

        offer.match_score = min(score, 75)  # Cap à 75 sans IA
        offer.ai_analysis = {
            "mode": "fallback_heuristic",
            "reasoning": "Score basé sur heuristiques (IA indisponible)",
            "score_technical": score,
            "score_structural": score,
            "score_experience": score,
        }

        return offer

    async def generate_cover_letter(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> Dict[str, Any]:
        """
        Génère la lettre de motivation en utilisant les détails du CV (OCR).
        """
        logger.info(f"✍️ Rédaction lettre pour: {offer.title} chez {offer.company}")

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

        if not self.provider.api_key:
            return {
                "html_content": f"<p>Lettre générée (Simulation) pour {offer.company}.</p>",
                "strategic_advice": "Ceci est un conseil factice.",
            }

        messages = [
            {"role": "system", "content": "Tu es un assistant JSON strict."},
            {"role": "user", "content": prompt},
        ]

        try:
            return await self.provider.generate_json(
                messages=messages,
                model=settings.OPENAI_MODEL_MAIN,
                temperature=0.7,
                timeout=120.0
            )
        except httpx.TimeoutException:
            logger.error("❌ Timeout génération lettre")
            return self._generate_fallback_letter(candidate, offer)
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Erreur HTTP génération lettre: {e.response.status_code}")
            return self._generate_fallback_letter(candidate, offer)
        except Exception as e:
            logger.exception(f"❌ Erreur Génération Lettre: {e}")
            return self._generate_fallback_letter(candidate, offer)

    def _generate_fallback_letter(
        self, candidate: CandidateProfile, offer: JobOffer
    ) -> Dict[str, str]:
        """Génère une lettre basique en cas d'échec de l'IA."""
        return {
            "html_content": f"<p>Madame, Monsieur,</p><p>Je me permets de vous adresser ma candidature pour le poste de {offer.title} au sein de {offer.company}.</p><p>Mon profil de {candidate.job_title} avec une expérience {candidate.experience_level} correspond aux exigences de ce poste.</p><p>Je reste à votre disposition pour un entretien.</p><p>Cordialement,<br/>{candidate.first_name} {candidate.last_name}</p>",
            "strategic_advice": "Lettre générée en mode fallback. Personnalisez-la avant envoi.",
        }


llm_engine = LLMEngine()
