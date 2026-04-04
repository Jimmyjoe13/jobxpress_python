import logging
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    PROJECT_NAME: str = "JobXpress API"
    VERSION: str = "2.0.0"

    # Environnement
    ENVIRONMENT: str = "development"  # development, staging, production

    # Base de données
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""  # Clé 'anon' pour le frontend
    SUPABASE_SERVICE_KEY: str = ""  # Clé 'service_role' pour le backend (bypass RLS)
    SUPABASE_JWT_SECRET: str = ""  # JWT signing secret (Settings > API > JWT Settings)

    # CORS - Liste d'origines séparées par des virgules
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # SerpAPI (Google Jobs)
    SERPAPI_KEY: str = ""

    # IA & LLM Provider Settings
    LLM_PROVIDER: str = "gemini"  # "openai", "deepseek" ou "gemini"
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL_MAIN: str = "gpt-5-mini"  # scoring, standard letter, chat
    OPENAI_MODEL_PREMIUM: str = "gpt-5"    # premium, retry qualité
    OPENAI_MODEL_FAST: str = "gpt-5-nano"  # pre-filtre, normalisation

    # Search & Extraction
    MISTRAL_API_KEY: str = ""
    RAPIDAPI_KEY: str = ""

    # Email (SMTP Gmail)
    BREVO_API_KEY: str = ""
    SENDER_EMAIL: str = ""

    # --- Robustness Settings ---
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = ""  # Vide = pas de fichier log

    # Stripe (Webhooks)
    STRIPE_WEBHOOK_SECRET: str = ""  # Signing secret pour vérifier les webhooks

    # Monitoring (Sentry)
    SENTRY_DSN: str = ""

    # Logging Cloud (Axiom)
    # Get token from: https://axiom.co > Settings > API Tokens
    AXIOM_TOKEN: str = ""
    AXIOM_DATASET: str = "jobxpress-logs"

    # Redis Cache (pour les résultats de recherche)
    # Format: redis://default:password@host:port ou rediss://... pour TLS
    REDIS_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    @model_validator(mode="after")
    def validate_production_requirements(self) -> "Settings":
        """Avertit si des variables recommandées sont absentes en production."""
        if self.ENVIRONMENT == "production":
            if not self.REDIS_URL:
                logger.warning(
                    "REDIS_URL non configurée en production — fallback sur cache SQLite. "
                    "Pour de meilleures performances, configurez Upstash, Redis Cloud ou Railway."
                )
        return self


@lru_cache()
def get_settings() -> Settings:
    """Retourne une instance cachée des settings."""
    return Settings()


settings = Settings()
