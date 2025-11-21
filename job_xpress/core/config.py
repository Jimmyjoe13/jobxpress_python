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
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""      # Ton adresse Gmail
    SMTP_PASSWORD: str = ""  # Ton mot de passe d'application (pas le mot de passe normal)

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

settings = Settings()