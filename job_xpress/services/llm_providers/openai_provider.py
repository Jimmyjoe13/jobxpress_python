import httpx
import json
import logging
from typing import Dict, Any, List, Optional
from core.config import settings
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        # Pour une flexibilité totale, on prend la clé OpenAI, ou on retombe sur DeepSeek si OpenAI n'est pas configuré.
        # Cela permet un fallback natif pendant la transition.
        self.api_key = settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY
        self.base_url = settings.OPENAI_BASE_URL.rstrip('/')
        self.api_url = f"{self.base_url}/chat/completions"

    def _clean_payload_for_model(self, payload: Dict[str, Any], model: str) -> Dict[str, Any]:
        """ Retire les paramètres non compatibles pour la génération 'gpt-5' (ou o1-like). """
        if "gpt-5" in model.lower():
            # Les modèles orientés 'reasoning' interdisent ces paramètres
            payload.pop("temperature", None)
            payload.pop("max_tokens", None)
            
            # Si jamais on utilise structuré json format qui poserait problème, on peut le commenter
            # Selon la doc OpenAI certains modèles ne supportent pas de response_format
            
        return payload

    async def _handle_request(self, payload: Dict[str, Any], timeout: float) -> httpx.Response:
        model = payload.get("model", "")
        payload = self._clean_payload_for_model(payload, model)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=timeout,
            )
            
            # --- LOG AVANT LE RAISE DE L'EXCEPTION ---
            if not response.is_success:
                try:
                    error_details = response.json()
                except Exception:
                    error_details = response.text
                logger.error(f"❌ OpenAI HTTP {response.status_code} Error: {json.dumps(error_details)}")
                logger.error(f"🔎 Sent Payload: {json.dumps(payload, default=str)}")
                
            return response

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.1,
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }
        
        response = await self._handle_request(payload, timeout)
        response.raise_for_status()
        raw_content = response.json()["choices"][0]["message"]["content"]
        return json.loads(raw_content)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        
        response = await self._handle_request(payload, timeout)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ):
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        
        payload = self._clean_payload_for_model(payload, model)

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                if not response.is_success:
                    await response.aread()
                    try:
                        error_details = response.json()
                    except Exception:
                        error_details = response.text
                    logger.error(f"❌ OpenAI HTTP Stream {response.status_code} Error: {json.dumps(error_details)}")
                    logger.error(f"🔎 Sent Payload: {json.dumps(payload, default=str)}")
                    
                response.raise_for_status()
                async for line in response.aiter_lines():
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

    async def chat_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
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
        return response.json()["choices"][0]["message"]
