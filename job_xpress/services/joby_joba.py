"""
Service JobyJoba - Coach IA contextuel avec mémoire de candidature.

Ce service gère les conversations avec l'assistant IA qui aide
les candidats à préparer leurs entretiens d'embauche.
"""

import httpx
from typing import List, Dict, Any
from core.config import settings
from core.logging_config import get_logger

logger = get_logger()


JOBYJOBA_SYSTEM_PROMPT = """Tu es JobyJoba, un coach emploi expert, bienveillant et proactif.

🎯 TON RÔLE:
Tu accompagnes les candidats dans leur préparation aux entretiens d'embauche. 
Tu as accès au contexte complet de leur candidature.

📋 CONTEXTE DE LA CANDIDATURE:
- Poste visé: {job_title}
- Entreprise: {company}
- Localisation: {location}
- Type de contrat: {contract_type}

📄 CV DU CANDIDAT:
{cv_text}

✉️ LETTRE DE MOTIVATION GÉNÉRÉE:
{cover_letter}

🎯 TES MISSIONS:
1. Préparer le candidat aux questions d'entretien
2. L'aider à valoriser son parcours
3. Anticiper les questions pièges
4. Conseiller sur la négociation salariale
5. Donner des tips pour le jour J

⚠️ RÈGLES IMPORTANTES:
- Sois proactif: propose des exercices, pose des questions
- Limite: Le candidat a {remaining_messages} messages restants
- À chaque réponse, guide-le vers la prochaine étape utile
- Sois concis mais pertinent (max 200 mots par réponse)
- Utilise des emojis pour rendre l'échange dynamique
- Si le candidat n'a plus de messages, félicite-le et résume les points clés

🗣️ TON STYLE:
- Tutoiement amical mais professionnel
- Encourageant et motivant
- Direct et actionnable
"""


class JobyJobaService:
    """
    Service de chat IA contextuel pour la préparation aux entretiens.
    """

    def __init__(self):
        from services.llm_providers.open_router_provider import OpenRouterProvider
        self.provider = OpenRouterProvider()

    def build_system_prompt(
        self,
        job_title: str,
        company: str,
        location: str,
        contract_type: str,
        cv_text: str,
        cover_letter: str,
        remaining_messages: int,
    ) -> str:
        """Construit le prompt système avec le contexte de la candidature."""
        return JOBYJOBA_SYSTEM_PROMPT.format(
            job_title=job_title or "Non spécifié",
            company=company or "Non spécifiée",
            location=location or "Non spécifiée",
            contract_type=contract_type or "Non spécifié",
            cv_text=cv_text[:3000] if cv_text else "Non fourni",
            cover_letter=cover_letter[:2000] if cover_letter else "Non générée",
            remaining_messages=remaining_messages,
        )

    async def chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        context: Dict[str, Any],
        remaining_messages: int,
    ) -> str:
        """
        Génère une réponse de JobyJoba.

        Args:
            user_message: Message de l'utilisateur
            conversation_history: Historique [{role, content}, ...]
            context: Contexte de la candidature
            remaining_messages: Messages restants pour l'utilisateur

        Returns:
            Réponse de JobyJoba
        """
        if not self.provider.api_key:
            logger.warning("⚠️ Clé API LLM manquante")
            return "Je suis temporairement indisponible. Réessaie plus tard ! 🔧"

        try:
            # Construire le prompt système
            system_prompt = self.build_system_prompt(
                job_title=context.get("job_title"),
                company=context.get("company"),
                location=context.get("location"),
                contract_type=context.get("contract_type"),
                cv_text=context.get("cv_text", ""),
                cover_letter=context.get("cover_letter", ""),
                remaining_messages=remaining_messages,
            )

            # Construire les messages pour l'API
            messages = [{"role": "system", "content": system_prompt}]

            # Ajouter l'historique (limiter pour ne pas dépasser le contexte)
            for msg in conversation_history[-10:]:
                messages.append(
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                )

            # Ajouter le nouveau message
            messages.append({"role": "user", "content": user_message})

            assistant_response = await self.provider.chat(
                messages=messages,
                model=settings.OPENROUTER_MODEL_MAIN,
                temperature=0.7,
                max_tokens=1000,
                timeout=30.0
            )

            logger.info(f"💬 JobyJoba a répondu ({len(assistant_response)} chars)")
            return assistant_response

        except Exception as e:
            logger.exception(f"❌ Erreur JobyJoba: {e}")
            return "Je rencontre un problème technique. Réessaie dans quelques instants ! 🛠️"

    async def stream_chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        context: Dict[str, Any],
        remaining_messages: int,
    ):
        """
        Générateur asynchrone pour streamer la réponse de JobyJoba.
        """
        if not self.provider.api_key:
            yield "Je suis temporairement indisponible. 🔧"
            return

        try:
            system_prompt = self.build_system_prompt(
                job_title=context.get("job_title"),
                company=context.get("company"),
                location=context.get("location"),
                contract_type=context.get("contract_type"),
                cv_text=context.get("cv_text", ""),
                cover_letter=context.get("cover_letter", ""),
                remaining_messages=remaining_messages,
            )

            messages = [{"role": "system", "content": system_prompt}]
            for msg in conversation_history[-10:]:
                messages.append(
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                )
            messages.append({"role": "user", "content": user_message})

            async for chunk in self.provider.stream_chat(
                messages=messages,
                model=settings.OPENROUTER_MODEL_MAIN,
                temperature=0.7,
                max_tokens=1000,
                timeout=30.0
            ):
                yield chunk

        except Exception as e:
            logger.exception(f"❌ Erreur stream JobyJoba: {e}")
            yield "Oups, j'ai rencontré un problème technique. 🛠️"

    def get_welcome_message(
        self,
        job_title: str,
        company: str,
        max_messages: int = 10,
        is_daily_limit: bool = False,
    ) -> str:
        """
        Message d'accueil de JobyJoba, adapté selon le plan utilisateur.

        Args:
            job_title: Titre du poste
            company: Nom de l'entreprise
            max_messages: Nombre de messages disponibles
            is_daily_limit: True si limite journalière (Pro), False si par session
        """
        limit_text = (
            f"**{max_messages} messages par jour**"
            if is_daily_limit
            else f"**{max_messages} messages** pour cette session"
        )
        pro_bonus = (
            "\n\n💎 En tant qu'utilisateur **Pro**, tu bénéficies du quota journalier renouvelé chaque jour !"
            if is_daily_limit
            else ""
        )

        return f"""Salut ! 👋 Je suis **JobyJoba**, ton coach emploi personnel !

Je vois que tu candidates pour **{job_title}** chez **{company}**. Super choix ! 🎯

J'ai analysé ton CV et ta lettre de motivation. Je suis prêt à t'aider à :

1. 💬 **Préparer tes réponses** aux questions classiques
2. 🎭 **Simuler un entretien** pour t'entraîner
3. 💰 **Négocier ton salaire** avec assurance
4. ✨ **Valoriser ton parcours** efficacement

Tu as {limit_text}. Utilise-les bien !{pro_bonus}

Par quoi veux-tu commencer ? 🚀"""


# Instance singleton
joby_joba_service = JobyJobaService()
