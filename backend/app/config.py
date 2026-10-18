from functools import lru_cache
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    evolus_api_key: str = ""
    evolus_app_id: str = ""
    evolus_extractor_agent_id: str = ""
    evolus_extractor_id: str = ""
    evolus_explainer_model: str = ""
    evolus_interviewer_model: str = ""
    evolus_translate_tool_enabled: bool = True
    allowed_origins: str = "http://localhost:3000"
    session_ttl_seconds: int = 3600
    max_upload_mb: int = 20
    max_questions: int = Field(default=10, ge=4, le=50)
    evolus_agent_chat_url: str = "https://api.evolus.ai/v1/chat/completions"
    evolus_rest_url: str = "https://api.evolus.ai/api/v1"
    # Keep upstream calls below Vercel's 300-second function ceiling.
    evolus_timeout_seconds: float = 240.0
    offline_fallback_enabled: bool = True
    document_retention_seconds: int = 3600
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore")

    @field_validator("evolus_explainer_model", "evolus_interviewer_model")
    @classmethod
    def validate_model_id(cls, value: str) -> str:
        if value and ":" not in value:
            raise ValueError("Evolus model IDs must use applicationId:agentId format.")
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
