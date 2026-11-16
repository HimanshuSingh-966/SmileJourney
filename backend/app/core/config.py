from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    allowed_origins: str = "http://localhost:3000"
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=50 * 1024 * 1024)

    firebase_project_id: str | None = None

    b2_endpoint_url: str | None = None
    b2_region: str = "us-west-004"
    b2_bucket_name: str | None = None
    b2_key_id: str | None = None
    b2_application_key: str | None = None

    hf_model_repo: str | None = None
    hf_token: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
