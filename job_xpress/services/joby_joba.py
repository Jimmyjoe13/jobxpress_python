"""
Service JobyJoba - Coach IA contextuel avec mémoire de candidature.

Ce service gère les conversations avec l'assistant IA qui aide
les candidats à préparer leurs entretiens d'embauche.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from core.config import settings
from core.logging_config import get_logger
from core.retry import resilient_post

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
    
    API_URL = "https://api.deepseek.com/v1/chat/completions"
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
    
    def build_system_prompt(
        self,
        job_title: str,
        company: str,
        location: str,
        contract_type: str,
        cv_text: str,
        cover_letter: str,
        remaining_messages: int
    ) -> str:
        """Construit le prompt système avec le contexte de la candidature."""
        return JOBYJOBA_SYSTEM_PROMPT.format(
            job_title=job_title or "Non spécifié",
            company=company or "Non spécifiée",
            location=location or "Non spécifiée",
            contract_type=contract_type or "Non spécifié",
            cv_text=cv_text[:3000] if cv_text else "Non fourni",
            cover_letter=cover_letter[:2000] if cover_letter else "Non générée",
            remaining_messages=remaining_messages
        )
    
    async def chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        context: Dict[str, Any],
        remaining_messages: int
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
        if not self.api_key:
            logger.warning("⚠️ Clé API DeepSeek manquante")
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
                remaining_messages=remaining_messages
            )
            
            # Construire les messages pour l'API
            messages = [{"role": "system", "content": system_prompt}]
            
            # Ajouter l'historique (limiter pour ne pas dépasser le contexte)
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            # Ajouter le nouveau message
            messages.append({"role": "user", "content": user_message})
            
            # Appel API DeepSeek
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "deepseek-chat",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
                "stream": False
            }
            
            response = await resilient_post(
                self.API_URL,
                json_data=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response and "choices" in response:
                assistant_response = response["choices"][0]["message"]["content"]
                logger.info(f"💬 JobyJoba a répondu ({len(assistant_response)} chars)")
                return assistant_response
            else:
                logger.warning(f"⚠️ Réponse API invalide: {response}")
                return "Oups, j'ai eu un petit souci technique. Reformule ta question ! 🔄"
                
        except Exception as e:
            logger.exception(f"❌ Erreur JobyJoba: {e}")
            return "Je rencontre un problème technique. Réessaie dans quelques instants ! 🛠️"
    
    def get_welcome_message(self, job_title: str, company: str) -> str:
        """Message d'accueil de JobyJoba."""
        return f"""Salut ! 👋 Je suis **JobyJoba**, ton coach emploi personnel !

Je vois que tu candidates pour **{job_title}** chez **{company}**. Super choix ! 🎯

J'ai analysé ton CV et ta lettre de motivation. Je suis prêt à t'aider à :

1. 💬 **Préparer tes réponses** aux questions classiques
2. 🎭 **Simuler un entretien** pour t'entraîner
3. 💰 **Négocier ton salaire** avec assurance
4. ✨ **Valoriser ton parcours** efficacement

Tu as **10 messages** pour cette session. Utilise-les bien !

Par quoi veux-tu commencer ? 🚀"""


# Instance singleton
joby_joba_service = JobyJobaService()
