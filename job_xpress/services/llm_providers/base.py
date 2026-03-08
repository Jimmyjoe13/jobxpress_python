from typing import Dict, Any, List
from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    """
    Interface abstraite pour les fournisseurs de modèles de langage (OpenAI, DeepSeek, etc).
    Permet un routage transparent et la gestion des fallbacks/changements de modèles.
    """

    @abstractmethod
    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.1,
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        """
        Gère un appel LLM qui attend spécifiquement une réponse en JSON structuré.
        """
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ) -> str:
        """
        Gère un appel LLM textuel standard (ex: pour le chat JobyJoba).
        """
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ):
        """
        Générateur asynchrone pour streamer la réponse textuelle.
        Doit "yield" les morceaux de texte ("chunks").
        """
        pass

    @abstractmethod
    async def chat_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Gère un appel LLM avec function calling / tools.
        Retourne le message complet de l'assistant, incluant potentiellement des 'tool_calls'.
        """
        pass
