from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Olyxee Cortex"
    app_version: str = "0.1.0"
    debug: bool = False
    database_url: str = "sqlite:///./cortex.db"
    openai_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()