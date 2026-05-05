from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dash AI"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # AI Providers
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    # Auth
    SECRET_KEY: str = "your-secret-key-for-dash-ai-auth-change-this-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # DuckDB
    DUCKDB_DATABASE_PATH: str = "dashai.duckdb"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
