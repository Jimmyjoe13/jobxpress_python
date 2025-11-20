from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "JobXpress API"
    VERSION: str = "1.0.0"
    
    # Base de données
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # APIs Externes
    DEEPSEEK_API_KEY: str = ""
    RAPIDAPI_KEY: str = "" # Pour JSearch

    # Chargement depuis le fichier .env
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

settings = Settings()