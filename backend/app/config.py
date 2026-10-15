from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    evolus_api_key: str = ""
    evolus_app_id: str = ""
    evolus_extractor_agent_id: str = ""
    evolus_extractor_id: str = ""
    evolus_explainer_model: str = ""
    evolus_interviewer_model: str = ""
    evolus_summarizer_model: str = ""
    evolus_translate_tool_enabled: bool = True
    allowed_origins: str = "http://localhost:3000"
    session_ttl_seconds: int = 3600
    max_upload_mb: int = 20
    max_questions: int = 10
    evolus_agent_chat_url: str = "https://api.evolus.ai/v1/chat/completions"
    evolus_rest_url: str = "https://api.evolus.ai/api/v1"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
