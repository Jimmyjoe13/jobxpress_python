import json
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging

from core.config import settings
from services.search_engine_v2 import create_search_engine_v2
from services.database import db_service
from models.candidate import CandidateProfile, WorkType

search_engine_v2 = create_search_engine_v2()
logger = logging.getLogger(__name__)

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
                                "description": "L'intitulé du poste recherché (ex: Développeur Python, Data Analyst)"
                            },
                            "location": {
                                "type": "string",
                                "description": "La ville ou région (ex: Paris, Remote)"
                            }
                        },
                        "required": ["job_title"]
                    }
                }
            }
        ]

    async def execute_tool(self, tool_call: Dict[str, Any], user_id: str, token: str) -> str:
        """Exécute l'outil demandé par le LLM."""
        function_name = tool_call["function"]["name"]
        arguments = json.loads(tool_call["function"]["arguments"])
        
        logger.info(f"🔧 Agent exécute l'outil {function_name} avec {arguments}")
        
        if function_name == "search_jobs":
            job_title = arguments.get("job_title", "")
            location = arguments.get("location", "")
            
            try:
                # Utiliser la nouvelle méthode quick_search si elle existe, ou fallback sur find_jobs_v2
                if hasattr(search_engine_v2, 'quick_search'):
                    results = await search_engine_v2.quick_search(
                        job_title=job_title,
                        location=location
                    )
                else:
                    # Fallback au cas où quick_search n'est pas encore implémenté
                    # On crée un profil minimal pour satisfaire find_jobs_v2
                    candidate = CandidateProfile(
                        first_name="User",
                        last_name=user_id[:8],
                        email="chat@jobxpress.fr",
                        job_title=job_title,
                        location=location or "France",
                        contract_type="Indifférent"
                    )
                    results = await search_engine_v2.find_jobs_v2(
                        candidate=candidate,
                        filters={},
                        limit=5
                    )
                
                # Formater les résultats pour le LLM
                if not results:
                    return "Aucune offre trouvée pour ces critères."
                
                formatted_results = []
                for idx, job in enumerate(results[:5]):
                    formatted_results.append(
                        f"{idx+1}. {job.get('title', 'Titre inconnu')} chez {job.get('company', 'Entreprise inconnue')} "
                        f"({job.get('location', 'Lieu inconnu')}) - URL: {job.get('url', '#')}"
                    )
                
                return "Voici les offres trouvées :\n" + "\n".join(formatted_results)
            except Exception as e:
                logger.error(f"Erreur lors de la recherche : {e}")
                return f"Erreur lors de la recherche: {str(e)}"
                
        return f"Outil '{function_name}' non reconnu."

    async def process_message(
        self, 
        user_message: str, 
        conversation_history: List[Dict[str, Any]], 
        user_id: str,
        token: str
    ) -> Dict[str, Any]:
        """
        Gère un message utilisateur, en utilisant éventuellement des outils.
        """
        if not self.api_key:
            return {"role": "assistant", "content": "Je suis en pause (API Key manquante). 🛠️"}
            
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
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": messages,
                        "tools": self.tools,
                        "tool_choice": "auto",
                        "temperature": 0.7,
                        "max_tokens": 1000
                    }
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
                    tool_result_content = await self.execute_tool(tool_call, user_id, token)
                    
                    # Ajouter le résultat de l'outil
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": tool_result_content
                    }
                    messages.append(tool_message)
                    tool_results.append({
                        "tool_call": tool_call,
                        "result": tool_result_content
                    })
                
                # 4. Deuxième appel au LLM avec le résultat de l'outil
                async with httpx.AsyncClient(timeout=30.0) as client:
                    second_response = await client.post(
                        self.API_URL,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "deepseek-chat",
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": 1000
                        }
                    )
                    second_response.raise_for_status()
                    second_data = second_response.json()
                
                final_content = second_data["choices"][0]["message"]["content"]
                
                # Si la recherche a retourné des offres, ajouter des quick replies
                quick_replies = []
                if "search_jobs" in [tc["function"]["name"] for tc in response_message["tool_calls"]]:
                    quick_replies = [
                        {"label": "⭐ Sauvegarder dans mes favoris", "action": "save_jobs_alert"},
                        {"label": "🔄 Chercher ailleurs", "action": "search_other"}
                    ]
                
                return {
                    "role": "assistant",
                    "content": final_content,
                    "tool_calls_executed": tool_results,
                    "quick_replies": quick_replies
                }
            else:
                # Réponse normale sans outil
                return {
                    "role": "assistant",
                    "content": response_message["content"]
                }
                
        except Exception as e:
            logger.exception(f"❌ Erreur ChatAgent: {e}")
            return {"role": "assistant", "content": "J'ai rencontré une petite erreur technique. Peux-tu reformuler ? 🛠️"}

    async def get_proactive_message(self, user_id: str, token: str) -> Dict[str, Any]:
        """Gère le premier message d'accueil proactif selon le profil du user."""
        client = db_service.get_user_client(token)
        profile_res = client.table("user_profiles").select("*").eq("id", user_id).execute()
        
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
                {"label": "💬 J'ai une question", "action": "ask_question"}
            ]
            
        return {
            "role": "assistant",
            "content": content,
            "quick_replies": quick_replies,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

chat_agent = ChatAgent()
