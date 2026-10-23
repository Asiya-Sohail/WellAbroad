from typing import Any
from pydantic import BaseModel, Field, field_validator


SUPPORTED_PREFERRED_LANGUAGES = {
    "en": "English",
    "english": "English",
    "fr": "French",
    "french": "French",
    "de": "German",
    "german": "German",
    "es": "Spanish",
    "spanish": "Spanish",
    "ur": "Urdu",
    "urdu": "Urdu",
}


class SessionCreate(BaseModel):
    ui_lang: str = Field(min_length=2, max_length=40)
    country: str = Field(min_length=2, max_length=80)
    local_lang: str = Field(min_length=2, max_length=40)
    preferred_lang: str | None = Field(default=None, min_length=2, max_length=40)

    @field_validator("preferred_lang")
    @classmethod
    def normalize_preferred_lang(cls, value: str | None) -> str | None:
        if value is None:
            return None
        language = SUPPORTED_PREFERRED_LANGUAGES.get(value.strip().lower())
        if language is None:
            raise ValueError("Unsupported preferred language.")
        return language


class SessionCreated(BaseModel):
    session_id: str
    expires_in_seconds: int


class ConsultationAnswer(BaseModel):
    answer: str | None = Field(default=None, max_length=2000)
    skip: bool = False

    @field_validator("answer")
    @classmethod
    def trim_answer(cls, value: str | None) -> str | None:
        return value.strip() if value else value


class Question(BaseModel):
    target: str
    question: str
    quick_options: list[str] = Field(default_factory=list)
    done: bool = False
    red_flag: bool = False


class AnswerResult(BaseModel):
    done: bool
    question: Question | None = None
    red_flag: bool = False
    urgent_message: str | None = None


class ConsultationSummary(BaseModel):
    english: str
    local_language: str
    user_language: str
    skipped: list[str]
    red_flag: bool
    disclaimer: str


class DocumentResult(BaseModel):
    doc_id: str
    explanation: str
    extracted: dict[str, Any]
    unreadable_parts: list[str] = Field(default_factory=list)
    disclaimer: str


class DocumentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(min_length=1)


class DocumentChatResult(BaseModel):
    answer: str
    urgent: bool = False
    disclaimer: str
