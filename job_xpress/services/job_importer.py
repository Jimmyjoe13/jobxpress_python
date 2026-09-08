"""
Service d'importation d'offres externes pour JobXpress.

Permet à l'utilisateur d'importer une offre d'emploi :
- Soit via une URL (LinkedIn, Indeed, WTTJ, site carrières, etc.)
- Soit en collant directement le texte brut de l'annonce

Coût : 100% GRATUIT (0 crédit débité).
L'offre est extraite, normalisée par l'IA et automatiquement ajoutée au Kanban de suivi.
"""

import html
import json
import logging
import re
import uuid
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from core.config import settings
from core.logging_config import get_logger
from services.database import db_service
from services.llm_providers.open_router_provider import OpenRouterProvider

logger = get_logger()


def clean_html_to_text(html_content: str) -> str:
    """Convertit du HTML brut en texte nettoyé sans dépendance externe lourde."""
    # Retirer balises de scripts, styles, SVG, noscript
    text = re.sub(
        r"<(script|style|svg|noscript)[^>]*>.*?</\1>",
        " ",
        html_content,
        flags=re.DOTALL | re.IGNORECASE,
    )
    # Saut de ligne pour les blocs
    text = re.sub(
        r"<(br|p|div|h[1-6]|li|tr)[^>]*>", "\n", text, flags=re.IGNORECASE
    )
    # Supprimer toutes les balises HTML restantes
    text = re.sub(r"<[^>]+>", " ", text)
    # Décoder les entités HTML (&amp;, &eacute;, etc.)
    text = html.unescape(text)
    # Normaliser les espaces et retours chariot
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


class JobImportRequest(BaseModel):
    url: Optional[str] = Field(None, description="URL de l'offre d'emploi")
    raw_text: Optional[str] = Field(None, description="Texte brut de l'annonce si copié manuellement")


class JobImportResponse(BaseModel):
    application_id: str
    job_id: str
    title: str
    company: str
    location: Optional[str]
    contract_type: Optional[str]
    work_type: Optional[str]
    salary: Optional[str]
    description: str
    skills: List[str]
    url: str
    tracking_status: str = "SAVED"
    message: str


class JobImporterService:
    """Service d'extraction et de persistance des offres externes."""

    def __init__(self):
        self.llm = OpenRouterProvider()
        self.model = settings.OPENROUTER_MODEL_FAST or "openrouter/owl-alpha"

    async def fetch_url_content(self, url: str) -> str:
        """Récupère et nettoie le contenu textuel d'une URL d'offre."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)

                if response.status_code in (401, 403, 999):
                    logger.warning(f"🔒 Accès refusé par le site distant ({response.status_code}) pour {url}")
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Le site bloque l'accès automatique (protection anti-robot ou connexion requise). "
                            "Veuillez copier-coller directement le texte de l'annonce dans le champ dédié."
                        ),
                    )

                response.raise_for_status()
                extracted_text = clean_html_to_text(response.text)

                # Si la page est quasi vide (ex: SPA rendered client-side)
                if len(extracted_text) < 150:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Le contenu de la page n'a pas pu être extrait automatiquement. "
                            "Veuillez copier-coller directement le texte de l'annonce."
                        ),
                    )

                return extracted_text[:7000]

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Erreur lors du fetch de {url}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de joindre le lien : {str(e)}. Vous pouvez coller le texte directement.",
            )

    async def parse_offer_text(self, text_content: str, user_id: str) -> Dict[str, Any]:
        """Utilise le LLM pour extraire les champs structurés de l'offre."""
        system_prompt = (
            "Tu es un analyseur expert d'offres d'emploi. Ton rôle est d'extraire les informations "
            "clés d'une annonce d'emploi textuelle.\n"
            "Tu dois répondre STRICTEMENT au format JSON avec les clés suivantes :\n"
            "{\n"
            '  "title": "Intitulé précis du poste",\n'
            '  "company": "Nom de l\'entreprise (ou Confidentiel si non mentionné)",\n'
            '  "location": "Lieu, ville ou France / Télétravail",\n'
            '  "contract_type": "CDI / CDD / Freelance / Alternance / Stage",\n'
            '  "work_type": "Présentiel / Hybride / Full Remote",\n'
            '  "salary": "Salaire mentionné (ex: 45-50k€) ou null",\n'
            '  "description": "Synthèse structurée et claire des missions principales et du profil recherché (300 à 600 mots)",\n'
            '  "skills": ["compétence 1", "compétence 2", "compétence 3"],\n'
            '  "experience_level": "Junior / Confirmé / Sénior"\n'
            "}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Voici l'annonce à analyser :\n\n{text_content[:6000]}"},
        ]

        try:
            parsed = await self.llm.generate_json(
                messages=messages,
                model=self.model,
                temperature=0.1,
                user_id=user_id,
            )
            return parsed
        except Exception as e:
            logger.error(f"❌ Erreur LLM parsing offre: {e}")
            # Fallback en cas d'erreur de parsing
            return {
                "title": "Offre importée",
                "company": "Entreprise externe",
                "location": "France",
                "contract_type": "CDI",
                "work_type": "Présentiel",
                "salary": None,
                "description": text_content[:2000],
                "skills": [],
                "experience_level": "Confirmé",
            }

    async def import_job(
        self,
        request: JobImportRequest,
        user_id: str,
        access_token: str,
    ) -> JobImportResponse:
        """
        Orchestre l'importation complète d'une offre externe (0 crédit débité).
        """
        if not request.url and not request.raw_text:
            raise HTTPException(
                status_code=400,
                detail="Veuillez fournir soit une URL d'offre, soit le texte de l'annonce.",
            )

        client = db_service.get_user_client(access_token)
        if not client:
            raise HTTPException(status_code=500, detail="Connexion base de données indisponible")

        # 1. Récupération du texte
        content_text = ""
        source_url = request.url.strip() if request.url else ""

        if source_url:
            content_text = await self.fetch_url_content(source_url)
        else:
            content_text = request.raw_text.strip()

        if len(content_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Le texte de l'offre est trop court pour être exploité.",
            )

        # 2. Parsing IA
        parsed = await self.parse_offer_text(content_text, user_id=user_id)

        job_id = str(uuid.uuid4())
        app_id = str(uuid.uuid4())
        offer_url = source_url or f"https://jobxpress.fr/imported/{job_id}"

        # 3. Récupérer les infos de profil du candidat pour pré-remplir la candidature
        candidate_first_name = ""
        candidate_last_name = ""
        candidate_email = ""
        cv_url = None

        try:
            profile_res = (
                client.table("user_profiles")
                .select("first_name, last_name, email, cv_url")
                .eq("id", user_id)
                .single()
                .execute()
            )
            if profile_res.data:
                candidate_first_name = profile_res.data.get("first_name") or ""
                candidate_last_name = profile_res.data.get("last_name") or ""
                candidate_email = profile_res.data.get("email") or ""
                cv_url = profile_res.data.get("cv_url")
        except Exception as e:
            logger.warning(f"⚠️ Erreur récupération profil lors de l'import: {e}")

        # 4. Enregistrement dans job_offers_v2
        job_offer_data = {
            "id": job_id,
            "url": offer_url,
            "title": parsed.get("title", "Poste sans titre"),
            "company": parsed.get("company", "Entreprise"),
            "description": parsed.get("description", content_text[:2000]),
            "location": parsed.get("location", "France"),
            "salary": parsed.get("salary"),
            "contract_type": parsed.get("contract_type", "CDI"),
            "is_remote": (
                "remote" in (parsed.get("work_type") or "").lower()
                or "télétravail" in (parsed.get("work_type") or "").lower()
            ),
            "skills": parsed.get("skills", []),
            "user_id": user_id,
            "match_score": 0,
        }

        try:
            # Upsert si l'URL existe déjà
            client.table("job_offers_v2").upsert(
                job_offer_data, on_conflict="url"
            ).execute()
        except Exception as e:
            logger.warning(f"⚠️ Insertion job_offers_v2: {e}")

        # 5. Enregistrement dans saved_jobs
        try:
            client.table("saved_jobs").insert({
                "user_id": user_id,
                "job_data": job_offer_data,
                "source": "external_import",
                "notes": f"Importé depuis {source_url}" if source_url else "Importé manuellement",
            }).execute()
        except Exception as e:
            logger.warning(f"⚠️ Insertion saved_jobs: {e}")

        # 6. Création de la carte dans applications_v2 (statut SAVED -> colonne 'À postuler')
        app_data = {
            "id": app_id,
            "user_id": user_id,
            "status": "DRAFT",
            "tracking_status": "SAVED",
            "job_title": parsed.get("title", "Poste sans titre"),
            "location": parsed.get("location", "France"),
            "contract_type": parsed.get("contract_type", "CDI"),
            "work_type": parsed.get("work_type", "Présentiel"),
            "experience_level": parsed.get("experience_level", "Confirmé"),
            "cv_url": cv_url,
            "candidate_first_name": candidate_first_name,
            "candidate_last_name": candidate_last_name,
            "candidate_email": candidate_email,
            "final_choice": {
                "id": job_id,
                "title": parsed.get("title", "Poste sans titre"),
                "company": parsed.get("company", "Entreprise"),
                "url": offer_url,
                "score": 0,
                "skills": parsed.get("skills", []),
                "description": parsed.get("description", content_text[:1000]),
            },
            "raw_jobs": [job_offer_data],
            "selected_jobs": [job_offer_data],
            "job_filters": {},
        }

        try:
            client.table("applications_v2").insert(app_data).execute()
            logger.info(f"✅ Offre externe importée et ajoutée au Kanban: {app_id[:8]} (0 crédit)")
        except Exception as e:
            logger.error(f"❌ Erreur insertion applications_v2: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la candidature.")

        return JobImportResponse(
            application_id=app_id,
            job_id=job_id,
            title=parsed.get("title", "Poste sans titre"),
            company=parsed.get("company", "Entreprise"),
            location=parsed.get("location", "France"),
            contract_type=parsed.get("contract_type", "CDI"),
            work_type=parsed.get("work_type", "Présentiel"),
            salary=parsed.get("salary"),
            description=parsed.get("description", ""),
            skills=parsed.get("skills", []),
            url=offer_url,
            tracking_status="SAVED",
            message="Offre importée avec succès dans votre tableau de suivi (0 crédit consommé).",
        )


job_importer_service = JobImporterService()
