# -*- coding: utf-8 -*-
"""
Provider OpenRouter pour JobXpress.
Implémente BaseLLMProvider avec l'API compatible OpenAI d'OpenRouter.
Supporte le streaming, le function calling et le JSON structuré.
"""

import httpx
import json
import logging
from typing import Dict, Any, List, Optional
from core.config import settings
from .base import BaseLLMProvider
from services.database import db_service

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseLLMProvider):
    """
    Provider OpenRouter — API compatible OpenAI.

    Utilise les modèles hébergés par OpenRouter (ex: openrouter/owl-alpha).
    Headers HTTP-Referer et X-Title pour le classement sur openrouter.ai.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip('/')
        self.api_url = f"{self.base_url}/chat/completions"
        self.site_url = settings.OPENROUTER_SITE_URL or ""
        self.site_name = settings.OPENROUTER_SITE_NAME or "JobXpress"

    def _get_headers(self) -> Dict[str, str]:
        """Headers avec authentification + metadata OpenRouter."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        # Headers optionnels pour le classement OpenRouter
        if self.site_url:
            headers["HTTP-Referer"] = self.site_url
        if self.site_name:
            headers["X-Title"] = self.site_name
        return headers

    def _clean_payload_for_model(self, payload: Dict[str, Any], model: str) -> Dict[str, Any]:
        """Retire les paramètres non compatibles pour certains modèles."""
        # Les modèles de type "reasoning" (o1, owl-alpha, etc.) peuvent interdire température/max_tokens
        lower_model = model.lower()
        if any(tag in lower_model for tag in ["o1", "o3", "owl", "reasoning"]):
            payload.pop("temperature", None)
            payload.pop("max_tokens", None)
        return payload

    async def _handle_request(self, payload: Dict[str, Any], timeout: float) -> httpx.Response:
        """Envoie la requête à l'API OpenRouter."""
        model = payload.get("model", "")
        payload = self._clean_payload_for_model(payload, model)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                headers=self._get_headers(),
                json=payload,
                timeout=timeout,
            )

            if not response.is_success:
                try:
                    error_details = response.json()
                except Exception:
                    error_details = response.text
                logger.error(f"❌ OpenRouter HTTP {response.status_code}: {json.dumps(error_details)}")
                logger.error(f"🔎 Payload: {json.dumps(payload, default=str)}")

            return response

    async def _handle_usage(
        self,
        response_data: Dict[str, Any],
        user_id: Optional[str],
        feature: str = "llm_generation",
    ):
        """Enregistre l'utilisation des tokens dans usage_logs."""
        if not user_id or "usage" not in response_data:
            return

        try:
            usage = response_data["usage"]
            payload = {
                "user_id": user_id,
                "feature": feature,
                "provider": "openrouter",
                "model": response_data.get("model", "unknown"),
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
                "metadata": {
                    "total_tokens": usage.get("total_tokens", 0),
                    "system_fingerprint": response_data.get("system_fingerprint"),
                },
            }

            if db_service.admin_client:
                db_service.admin_client.table("usage_logs").insert(payload).execute()

        except Exception as e:
            logger.warning(f"⚠️ Usage log failed: {e}")

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.1,
        timeout: float = 60.0,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Génère une réponse JSON structuré."""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        response = await self._handle_request(payload, timeout)
        response.raise_for_status()
        data = response.json()

        await self._handle_usage(data, user_id, feature="generate_json")

        raw_content = data["choices"][0]["message"]["content"]
        return json.loads(raw_content)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        timeout: float = 120.0,
        user_id: Optional[str] = None,
    ) -> str:
        """Appel LLM textuel standard (non-streaming)."""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        response = await self._handle_request(payload, timeout)
        response.raise_for_status()
        data = response.json()

        await self._handle_usage(data, user_id, feature="chat")

        return data["choices"][0]["message"]["content"]

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
        user_id: Optional[str] = None,
    ):
        """Générateur asynchrone pour le streaming NDJSON."""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            "stream_options": {"include_usage": True},
        }

        payload = self._clean_payload_for_model(payload, model)

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                self.api_url,
                headers=self._get_headers(),
                json=payload,
            ) as response:
                if not response.is_success:
                    await response.aread()
                    try:
                        error_details = response.json()
                    except Exception:
                        error_details = response.text
                    logger.error(f"❌ OpenRouter Stream {response.status_code}: {json.dumps(error_details)}")

                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)

                            if "usage" in chunk_data:
                                await self._handle_usage(chunk_data, user_id, feature="stream_chat")

                            if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                delta = chunk_data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except (KeyError, json.JSONDecodeError):
                            continue

    async def chat_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Appel LLM avec function calling / tools."""
        payload = {
            "model": model,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        response = await self._handle_request(payload, timeout)
        response.raise_for_status()
        data = response.json()

        await self._handle_usage(data, user_id, feature="chat_with_tools")

        return data["choices"][0]["message"]

    async def generate_embeddings(self, text: str) -> List[float]:
        """Génère un vecteur d'embedding."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=self._get_headers(),
                json={
                    "model": "text-embedding-3-small",
                    "input": text[:8191],
                },
                timeout=20.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["embedding"]
