from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite:///./cortex.db"
    app_name: str = "Olyxee Cortex"
    app_version: str = "0.1.0"
    debug: bool = False
    azure_openai_api_key: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_deployment: str = "gpt-5"
    azure_openai_api_version: str = "2024-12-01-preview"

    class Config:
        env_file = ".env"


settings = Settings()