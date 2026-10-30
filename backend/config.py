import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    NEBIUS_API_KEY: str | None = os.getenv("NEBIUS_API_KEY", None)
    NEBIUS_BASE_URL: str = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
    NEMOTRON_MODEL_ID: str = os.getenv("NEMOTRON_MODEL_ID", "nvidia/Llama-3.1-Nemotron-70B-Instruct")
    SENTINEL_DB_PATH: str = os.getenv("SENTINEL_DB_PATH", "sentinel.db")
    VERIFICATION_PROBE_INTERVAL_SECONDS: float = float(os.getenv("VERIFICATION_PROBE_INTERVAL_SECONDS", "10.0"))
    APPROVAL_EXPIRY_SECONDS: int = int(os.getenv("APPROVAL_EXPIRY_SECONDS", "300"))
    DEMO_SERVICE_PORT: int = int(os.getenv("DEMO_SERVICE_PORT", "8001"))
    SENTINEL_PORT: int = int(os.getenv("SENTINEL_PORT", "8000"))

settings = Settings()
