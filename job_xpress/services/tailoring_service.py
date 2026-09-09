"""
Service de Diagnostic ATS (1 crédit) et de Génération de CV Adapté (5 crédits).

Permet aux utilisateurs de :
1. Obtenir un diagnostic d'adéquation ATS complet avec analyse des forces, compétences manquantes
   et mots-clés ATS à intégrer (coût : 1 crédit).
2. Générer un CV complet restructuré et adapté sur-mesure pour maximiser le passage des filtres ATS
   et décrocher un entretien (coût : 5 crédits).

Règle éthique : Débit uniquement en cas de génération réussie (No-cure, no-pay).
"""

import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from pydantic import BaseModel, Field

from core.config import settings
from core.logging_config import get_logger
from services.database import db_service
from services.billing import BillingService
from services.llm_providers.open_router_provider import OpenRouterProvider

logger = get_logger()


# ===========================================
# MODÈLES DE REQUÊTE ET RÉPONSE
# ===========================================

class ATSAnalysisRequest(BaseModel):
    application_id: str = Field(..., description="ID de la candidature dans applications_v2")


class ATSAnalysisResponse(BaseModel):
    application_id: str
    match_score: int
    strengths: List[str]
    missing_skills: List[str]
    ats_keywords_to_add: List[str]
    recommendations: List[str]
    credits_remaining: int


class TailoredCVRequest(BaseModel):
    application_id: str = Field(..., description="ID de la candidature dans applications_v2")


class TailoredCVResponse(BaseModel):
    application_id: str
    full_name: str
    target_title: str
    contact: Dict[str, Any]
    pitch: str
    highlighted_skills: List[str]
    experiences: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    ats_score: int
    credits_remaining: int
    message: str


# ===========================================
# SERVICE TAILORING
# ===========================================

class TailoringService:
    """Service d'analyse ATS et de tailoring de CV."""

    def __init__(self):
        self.billing = BillingService(db_service)
        self.llm = OpenRouterProvider()
        self.model = settings.OPENROUTER_MODEL_PREMIUM or "openrouter/owl-alpha"

    async def _get_app_and_profile(
        self, application_id: str, user_id: str, client
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """Récupère la candidature et le profil utilisateur."""
        # 1. Récupération candidature
        app_res = (
            client.table("applications_v2")
            .select("*")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not app_res.data:
            raise HTTPException(status_code=404, detail="Candidature introuvable")

        app_data = app_res.data

        # 2. Récupération profil
        profile_res = (
            client.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile_data = profile_res.data or {}

        return app_data, profile_data

    def _extract_offer_context(self, app_data: Dict[str, Any]) -> str:
        """Extrait le texte de l'offre pour le prompt LLM."""
        final_choice = app_data.get("final_choice") or {}
        title = final_choice.get("title") or app_data.get("job_title") or "Poste"
        company = final_choice.get("company") or "Entreprise"
        description = final_choice.get("description") or ""
        location = app_data.get("location") or "France"
        contract_type = app_data.get("contract_type") or "CDI"

        return (
            f"TITRE : {title}\n"
            f"ENTREPRISE : {company}\n"
            f"LIEU : {location}\n"
            f"CONTRAT : {contract_type}\n"
            f"DESCRIPTION DE L'OFFRE :\n{description[:3500]}"
        )

    def _extract_candidate_context(
        self, app_data: Dict[str, Any], profile_data: Dict[str, Any]
    ) -> str:
        """Extrait le parcours et compétences du candidat."""
        first_name = profile_data.get("first_name") or app_data.get("candidate_first_name") or "Candidat"
        last_name = profile_data.get("last_name") or app_data.get("candidate_last_name") or ""
        job_title = profile_data.get("job_title") or app_data.get("job_title") or ""
        skills = profile_data.get("key_skills") or []
        experience_level = profile_data.get("experience_level") or app_data.get("experience_level") or ""
        cv_text = app_data.get("cv_text") or profile_data.get("cv_text") or ""

        summary = (
            f"NOM : {first_name} {last_name}\n"
            f"TITRE ACTUEL : {job_title}\n"
            f"NIVEAU : {experience_level}\n"
            f"COMPÉTENCES : {', '.join(skills) if isinstance(skills, list) else skills}\n"
        )

        if cv_text:
            summary += f"\nCONTENU DU CV DU CANDIDAT :\n{cv_text[:3500]}"

        return summary

    async def analyze_ats_match(
        self, application_id: str, user_id: str, access_token: str
    ) -> ATSAnalysisResponse:
        """
        Génère une analyse d'adéquation ATS et Gap Analysis (coût : 1 crédit).
        """
        # 1. Vérifier les crédits
        can_proceed, current_credits = await self.billing.can_analyze_ats(user_id, access_token)
        if not can_proceed:
            raise HTTPException(
                status_code=402,
                detail="Crédits insuffisants. 1 crédit est requis pour lancer le diagnostic ATS.",
            )

        client = db_service.get_user_client(access_token)
        if not client:
            raise HTTPException(status_code=500, detail="Connexion base de données indisponible")

        app_data, profile_data = await self._get_app_and_profile(application_id, user_id, client)
        offer_context = self._extract_offer_context(app_data)
        candidate_context = self._extract_candidate_context(app_data, profile_data)

        # 2. Appel IA pour le diagnostic ATS
        system_prompt = """Tu es un expert en recrutement tech et consultant senior ATS (Applicant Tracking Systems).
Analyse avec rigueur la compatibilité entre le profil du candidat et l'offre d'emploi.
Identifie les atouts, les lacunes critiques et les mots-clés exacts que les recruteurs/ATS scannent.
Réponds STRICTEMENT au format JSON avec cette structure :
{
  "match_score": 85,
  "strengths": ["point fort 1 en phase avec l'offre", "point fort 2..."],
  "missing_skills": ["compétence ou prérequis manquant ou peu visible", "..."],
  "ats_keywords_to_add": ["mot-clé ATS exact 1", "mot-clé ATS 2", "..."],
  "recommendations": ["conseil actionnable 1 pour décrocher l'entretien", "..."]
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"=== FICHE DE POSTE ===\n{offer_context}\n\n=== PROFIL DU CANDIDAT ===\n{candidate_context}",
            },
        ]

        try:
            analysis = await self.llm.generate_json(
                messages=messages,
                model=self.model,
                temperature=0.2,
                user_id=user_id,
            )
        except Exception as e:
            logger.error(f"❌ Erreur LLM diagnostic ATS: {e}")
            raise HTTPException(
                status_code=500,
                detail="Erreur lors de l'analyse ATS. Aucun crédit n'a été débité.",
            )

        # 3. Débit de 1 crédit (No cure, no pay respecté)
        try:
            remaining_credits = await self.billing.debit_ats_analysis(user_id, access_token)
        except Exception as e:
            logger.error(f"❌ Erreur débit crédit ATS: {e}")
            remaining_credits = current_credits

        # 4. Sauvegarder dans applications_v2
        final_choice = app_data.get("final_choice") or {}
        final_choice["ats_analysis"] = analysis
        final_choice["score"] = analysis.get("match_score", 0)

        try:
            client.table("applications_v2").update({
                "final_choice": final_choice,
            }).eq("id", application_id).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"⚠️ Erreur mise à jour final_choice ATS: {e}")

        return ATSAnalysisResponse(
            application_id=application_id,
            match_score=analysis.get("match_score", 70),
            strengths=analysis.get("strengths", []),
            missing_skills=analysis.get("missing_skills", []),
            ats_keywords_to_add=analysis.get("ats_keywords_to_add", []),
            recommendations=analysis.get("recommendations", []),
            credits_remaining=remaining_credits,
        )

    async def generate_tailored_cv(
        self, application_id: str, user_id: str, access_token: str
    ) -> TailoredCVResponse:
        """
        Génère un CV adapté sur-mesure pour l'offre ciblée (coût : 5 crédits).
        """
        # 1. Vérifier les crédits (5 crédits requis)
        can_proceed, current_credits = await self.billing.can_tailor_cv(user_id, access_token)
        if not can_proceed:
            raise HTTPException(
                status_code=402,
                detail=f"Crédits insuffisants. 5 crédits sont nécessaires pour générer un CV adapté (vous avez {current_credits} crédit(s)).",
            )

        client = db_service.get_user_client(access_token)
        if not client:
            raise HTTPException(status_code=500, detail="Connexion base de données indisponible")

        app_data, profile_data = await self._get_app_and_profile(application_id, user_id, client)
        offer_context = self._extract_offer_context(app_data)
        candidate_context = self._extract_candidate_context(app_data, profile_data)

        # 2. Appel IA pour composer le CV adapté
        system_prompt = """Tu es le meilleur expert mondial en rédaction de CV pour cadres et talents tech, spécialisé en scoring ATS.
Ta mission : adapter et optimiser le CV du candidat pour l'offre d'emploi ciblée afin qu'il obtienne une note ATS de 90%+.
Règles strictes :
1. Conserve la véracité historique du candidat (entreprises, dates approximatives).
2. Reformule les réalisations et puces d'impact pour mettre en valeur les mots-clés exacts et attentes de la fiche de poste.
3. Rédige un pitch d'introduction magnétique (3-4 lignes) ciblant spécifiquement la valeur ajoutée pour l'entreprise.
4. Réponds STRICTEMENT au format JSON avec cette structure :
{
  "full_name": "Prénom Nom",
  "target_title": "Intitulé cible aligné avec l'offre",
  "contact": {
    "email": "Email",
    "phone": "Téléphone",
    "location": "Ville / Mobilité"
  },
  "pitch": "Résumé professionnel percutant mettant en avant l'adéquation au poste",
  "highlighted_skills": ["Compétence 1", "Compétence 2", "Compétence 3"],
  "experiences": [
    {
      "role": "Intitulé du poste",
      "company": "Entreprise",
      "location": "Lieu",
      "period": "Ex: 2022 - Présent",
      "bullets": [
        "Réalisation concrète intégrant les mots-clés ATS et résultats mesurables...",
        "Action d'impact menée..."
      ]
    }
  ],
  "education": [
    {
      "degree": "Diplôme / Formation",
      "institution": "Établissement",
      "year": "Année"
    }
  ],
  "ats_score": 94
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"=== OFFRE D'EMPLOI CIBLÉE ===\n{offer_context}\n\n"
                    f"=== PARCOURS ET DONNÉES DU CANDIDAT ===\n{candidate_context}"
                ),
            },
        ]

        try:
            tailored_data = await self.llm.generate_json(
                messages=messages,
                model=self.model,
                temperature=0.25,
                user_id=user_id,
            )
        except Exception as e:
            logger.error(f"❌ Erreur LLM génération CV adapté: {e}")
            raise HTTPException(
                status_code=500,
                detail="Erreur lors de la génération du CV adapté. Aucun crédit n'a été débité.",
            )

        # 3. Débit de 5 crédits (No cure, no pay respecté)
        try:
            remaining_credits = await self.billing.debit_cv_tailoring(user_id, access_token)
        except Exception as e:
            logger.error(f"❌ Erreur débit crédits CV adapté: {e}")
            remaining_credits = current_credits - 5

        # 4. Sauvegarde dans applications_v2
        final_choice = app_data.get("final_choice") or {}
        final_choice["tailored_cv"] = tailored_data

        try:
            client.table("applications_v2").update({
                "final_choice": final_choice,
            }).eq("id", application_id).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"⚠️ Erreur sauvegarde tailored_cv: {e}")

        return TailoredCVResponse(
            application_id=application_id,
            full_name=tailored_data.get("full_name", "Candidat"),
            target_title=tailored_data.get("target_title", "Profil"),
            contact=tailored_data.get("contact", {}),
            pitch=tailored_data.get("pitch", ""),
            highlighted_skills=tailored_data.get("highlighted_skills", []),
            experiences=tailored_data.get("experiences", []),
            education=tailored_data.get("education", []),
            ats_score=tailored_data.get("ats_score", 92),
            credits_remaining=remaining_credits,
            message="Votre CV adapté a été généré avec succès (5 crédits consommés).",
        )


tailoring_service = TailoringService()
