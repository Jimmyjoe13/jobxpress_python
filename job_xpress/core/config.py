from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "JobXpress API"
    VERSION: str = "1.1.0"
    
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
    
    # IA & Search
    DEEPSEEK_API_KEY: str = ""
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

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)


@lru_cache()
def get_settings() -> Settings:
    """Retourne une instance cachée des settings."""
    return Settings()

settings = Settings()
