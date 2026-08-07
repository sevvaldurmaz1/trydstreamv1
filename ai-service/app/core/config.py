from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Traydstream AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://traydstream:traydstream_secret@localhost:5432/traydstream"

    # Redis
    REDIS_URL: str = "redis://:redis_secret@localhost:6379/0"

    # Storage
    UPLOAD_DIR: str = "./uploads"

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    OCR_LANGUAGE: str = "eng"

    # Confidence thresholds
    HIGH_CONFIDENCE: float = 0.85
    MEDIUM_CONFIDENCE: float = 0.60


@lru_cache
def get_settings() -> Settings:
    return Settings()
