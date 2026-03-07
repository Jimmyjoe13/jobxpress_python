import json
import httpx
from typing import Dict, Any, List
from datetime import datetime, timezone
import logging

from core.config import settings
from services.search_engine_v2 import create_search_engine_v2
from services.database import db_service
from models.candidate import CandidateProfile

_search_engine_instance = None
logger = logging.getLogger(__name__)


def get_search_engine():
    global _search_engine_instance
    if _search_engine_instance is None:
        _search_engine_instance = create_search_engine_v2()
    return _search_engine_instance


AGENT_SYSTEM_PROMPT = """Tu es l'assistant IA de JobXpress, conçu pour accompagner les chercheurs d'emploi de manière proactive.

🎯 TON RÔLE PRINCIPAL:
- Comprendre les besoins professionnels de l'utilisateur.
- Effectuer des recherches d'offres d'emploi pour lui via l'outil `search_jobs` quand c'est pertinent.
- Répondre à ses questions sur sa recherche d'emploi.

🛠️ OUTILS À TA DISPOSITION:
Tu peux appeler la fonction de recherche d'emploi pour trouver des offres pertinentes.
N'invente **jamais** de fausses offres. Utilise toujours l'outil `search_jobs` pour chercher de vraies offres.

🗣️ TON STYLE:
- Tutoiement amical, motivant, professionnel.
- Réponses concises. Maximum 3-4 phrases.
- Propose toujours une prochaine action logique (ex: affiner la recherche, candidater).
- Utilise des emojis.
"""


class ChatAgent:
    """Agent IA global avec capacités de router des actions / function calling."""

    API_URL = "https://api.deepseek.com/v1/chat/completions"

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY

        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_jobs",
                    "description": "Recherche de vraies offres d'emploi actuelles selon des critères.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "job_title": {
                                "type": "string",
                                "description": "L'intitulé du poste recherché (ex: Développeur Python, Data Analyst)",
                            },
                            "location": {
                                "type": "string",
                                "description": "La ville ou région (ex: Paris, Remote)",
                            },
                        },
                        "required": ["job_title"],
                    },
                },
            }
        ]

    async def execute_tool(
        self, tool_call: Dict[str, Any], user_id: str, token: str
    ) -> str:
        """Exécute l'outil demandé par le LLM."""
        function_name = tool_call["function"]["name"]
        arguments = json.loads(tool_call["function"]["arguments"])

        logger.info(f"🔧 Agent exécute l'outil {function_name} avec {arguments}")

        if function_name == "search_jobs":
            job_title = arguments.get("job_title", "")
            location = arguments.get("location", "")

            try:
                # 1. Vérifier le quota (Free ou Crédit)
                client = db_service.admin_client
                if not client:
                    return "Erreur technique : impossible de vérifier tes crédits recherche."

                quota_result = client.rpc(
                    "check_and_use_search_quota", {"p_user_id": user_id}
                ).execute()

                if not quota_result.data or len(quota_result.data) == 0:
                    return "Désolé, je n'ai pas pu valider ton quota de recherche."

                quota = quota_result.data[0]
                allowed = quota.get("allowed", False)
                free_remaining = quota.get("free_remaining", 0)
                used_credit = quota.get("used_credit", False)

                if not allowed:
                    return "Tu as épuisé tes recherches gratuites et tes crédits. Recharges ton compte pour continuer !"

                # 2. Exécuter la recherche
                # On crée un profil minimal pour satisfaire find_jobs_v2
                candidate = CandidateProfile(
                    first_name="ChatAgent",
                    last_name=user_id[:8],
                    email="chat@jobxpress.fr",
                    job_title=job_title,
                    location=location or "France",
                    contract_type="Indifférent",
                )

                try:
                    engine = get_search_engine()
                    results = await engine.find_jobs_v2(
                        candidate=candidate, filters={}, limit=5
                    )
                except Exception as e:
                    logger.error(f"❌ SearchEngineV2 indisponible dans ChatAgent: {e}")
                    return "Désolé, le moteur de recherche est temporairement indisponible. Réessaie dans quelques instants."

                # 3. Formater les résultats pour le LLM
                if not results:
                    return (
                        "Je n'ai malheureusement trouvé aucune offre pour ces critères."
                    )

                formatted_results = []
                for idx, job in enumerate(results[:5]):
                    # On utilise getattr car ce sont des objets JobOffer, pas des dicts
                    title = getattr(job, "title", "Poste inconnu")
                    company = getattr(job, "company", "Entreprise inconnue")
                    loc = getattr(job, "location", "Lieu inconnu")
                    url = getattr(job, "url", "#")

                    formatted_results.append(
                        f"{idx + 1}. {title} chez {company} ({loc}) - URL: {url}"
                    )

                quota_msg = ""
                if used_credit:
                    quota_msg = "\n(1 crédit utilisé)"
                else:
                    quota_msg = (
                        f"\n({free_remaining} recherche(s) gratuite(s) restante(s))"
                    )

                # Signal ACTION:NAVIGATE_SEARCH pour que le frontend sache qu'il doit rediriger
                return (
                    "\n".join(formatted_results)
                    + quota_msg
                    + "\n\n[ACTION:NAVIGATE_SEARCH]"
                )
            except Exception as e:
                logger.error(f"❌ Erreur recherche ChatAgent: {e}")
                return (
                    f"Une erreur technique est survenue pendant la recherche : {str(e)}"
                )
                return f"Erreur lors de la recherche: {str(e)}"

        return f"Outil '{function_name}' non reconnu."

    async def process_message(
        self,
        user_message: str,
        conversation_history: List[Dict[str, Any]],
        user_id: str,
        token: str,
    ) -> Dict[str, Any]:
        """
        Gère un message utilisateur, en utilisant éventuellement des outils.
        """
        if not self.api_key:
            return {
                "role": "assistant",
                "content": "Je suis en pause (API Key manquante). 🛠️",
            }

        try:
            # 1. Préparer les messages
            messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]

            # Ajouter l'historique
            for msg in conversation_history[-10:]:
                # Copie sans informations non standard pour l'API
                clean_msg = {"role": msg["role"]}
                if "content" in msg and msg["content"]:
                    clean_msg["content"] = msg["content"]
                if "tool_calls" in msg:
                    clean_msg["tool_calls"] = msg["tool_calls"]
                if "tool_call_id" in msg:
                    clean_msg["tool_call_id"] = msg["tool_call_id"]
                messages.append(clean_msg)

            # Ajouter le message utilisateur actuel
            messages.append({"role": "user", "content": user_message})

            # 2. Premier appel au LLM
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": messages,
                        "tools": self.tools,
                        "tool_choice": "auto",
                        "temperature": 0.7,
                        "max_tokens": 1000,
                    },
                )
                response.raise_for_status()
                data = response.json()

            response_message = data["choices"][0]["message"]

            # 3. Vérifier s'il y a un appel d'outil
            if response_message.get("tool_calls"):
                logger.info("🤖 L'agent a décidé d'utiliser un outil.")

                # Ajouter la demande d'outil à l'historique
                messages.append(response_message)

                # Pour chaque appel (normalement 1)
                tool_results = []
                for tool_call in response_message["tool_calls"]:
                    tool_call_id = tool_call["id"]
                    tool_result_content = await self.execute_tool(
                        tool_call, user_id, token
                    )

                    # Ajouter le résultat de l'outil
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": tool_result_content,
                    }
                    messages.append(tool_message)
                    tool_results.append(
                        {"tool_call": tool_call, "result": tool_result_content}
                    )

                # 4. Deuxième appel au LLM avec le résultat de l'outil
                async with httpx.AsyncClient(timeout=30.0) as client:
                    second_response = await client.post(
                        self.API_URL,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "deepseek-chat",
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": 1000,
                        },
                    )
                    second_response.raise_for_status()
                    second_data = second_response.json()

                final_content = second_data["choices"][0]["message"]["content"]

                # Si la recherche a retourné des offres, ajouter des quick replies
                quick_replies = []
                if "search_jobs" in [
                    tc["function"]["name"] for tc in response_message["tool_calls"]
                ]:
                    quick_replies = [
                        {
                            "label": "⭐ Sauvegarder dans mes favoris",
                            "action": "save_jobs_alert",
                        },
                        {"label": "🔄 Chercher ailleurs", "action": "search_other"},
                    ]

                return {
                    "role": "assistant",
                    "content": final_content,
                    "tool_calls_executed": tool_results,
                    "quick_replies": quick_replies,
                }
            else:
                # Réponse normale sans outil
                return {"role": "assistant", "content": response_message["content"]}

        except Exception as e:
            logger.exception(f"❌ Erreur ChatAgent: {e}")
            return {
                "role": "assistant",
                "content": "J'ai rencontré une petite erreur technique. Peux-tu reformuler ? 🛠️",
            }

    async def stream_message(
        self,
        user_message: str,
        conversation_history: List[Dict[str, Any]],
        user_id: str,
        token: str,
    ):
        """
        Générateur asynchrone pour streamer la réponse au message.
        """
        if not self.api_key:
            yield "Je suis en pause (API Key manquante). 🛠️"
            return

        try:
            # 1. Préparer les messages
            messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
            for msg in conversation_history[-10:]:
                clean_msg = {"role": msg["role"]}
                if "content" in msg and msg["content"]:
                    clean_msg["content"] = msg["content"]
                if "tool_calls" in msg:
                    clean_msg["tool_calls"] = msg["tool_calls"]
                if "tool_call_id" in msg:
                    clean_msg["tool_call_id"] = msg["tool_call_id"]
                messages.append(clean_msg)

            messages.append({"role": "user", "content": user_message})

            # 2. Appel initial (non-streamé pour gérer les outils facilement)
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": messages,
                        "tools": self.tools,
                        "tool_choice": "auto",
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "stream": False,
                    },
                )
                response.raise_for_status()
                data = response.json()

            response_message = data["choices"][0]["message"]

            # 3. Exécution d'outils
            if response_message.get("tool_calls"):
                logger.info("🤖 L'agent streameur a décidé d'utiliser un outil.")
                messages.append(response_message)

                for tool_call in response_message["tool_calls"]:
                    tool_call_id = tool_call["id"]
                    tool_result_content = await self.execute_tool(
                        tool_call, user_id, token
                    )
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": tool_result_content,
                    })

                # Deuxième appel AVEC streaming
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream(
                        "POST",
                        self.API_URL,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "deepseek-chat",
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": 1000,
                            "stream": True,
                        },
                    ) as stream_resp:
                        async for line in stream_resp.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk_data = json.loads(data_str)
                                    delta = chunk_data["choices"][0]["delta"]
                                    if "content" in delta:
                                        yield delta["content"]
                                except (KeyError, json.JSONDecodeError):
                                    continue
            else:
                # Pas de tool, on simule le streaming du contenu
                content = response_message.get("content", "")
                import asyncio
                # Chunkage pour l'effet "frappe"
                words = content.split(' ')
                for i, word in enumerate(words):
                    yield word + (' ' if i < len(words) - 1 else '')
                    await asyncio.sleep(0.01)

        except Exception as e:
            logger.exception(f"❌ Erreur stream ChatAgent: {e}")
            yield "Désolé, j'ai rencontré un problème technique. 🛠️"

    async def get_proactive_message(self, user_id: str, token: str) -> Dict[str, Any]:
        """Gère le premier message d'accueil proactif selon le profil du user."""
        client = db_service.get_user_client(token)
        profile_res = (
            client.table("user_profiles").select("*").eq("id", user_id).execute()
        )

        job_title = None
        has_profile = False
        if profile_res.data and len(profile_res.data) > 0:
            profile = profile_res.data[0]
            job_title = profile.get("job_title")
            has_profile = True

        if not has_profile or not job_title:
            content = "Salut ! 👋 Je suis l'assistant IA de JobXpress. Je vois que ton profil n'est pas complètement rempli. Dis-moi quel poste tu recherches pour que je puisse t'aider !"
            quick_replies = [
                {"label": "📝 Remplir mon profil", "action": "goto_profile"}
            ]
        else:
            content = f"Bonjour ! 👋 Je suis prêt à t'aider pour trouver ton futur poste de **{job_title}**. Veux-tu que je lance une recherche pour voir les offres du jour ?"
            quick_replies = [
                {"label": "🔍 Oui, lance une recherche", "action": "search_now"},
                {"label": "💬 J'ai une question", "action": "ask_question"},
            ]

        return {
            "role": "assistant",
            "content": content,
            "quick_replies": quick_replies,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


chat_agent = ChatAgent()
