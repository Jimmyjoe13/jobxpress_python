from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "JobXpress API"
    VERSION: str = "1.0.0"
    
    # Base de données
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # IA & Search
    DEEPSEEK_API_KEY: str = ""
    RAPIDAPI_KEY: str = ""

    # Email (SMTP Gmail)
    BREVO_API_KEY: str = ""  # <-- Nouvelle variable
    SENDER_EMAIL: str = ""   # <-- L'email validé sur Brevo

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

settings = Settings()