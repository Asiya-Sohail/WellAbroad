from typing import Any
from pydantic import BaseModel, Field, field_validator


class SessionCreate(BaseModel):
    ui_lang: str = Field(min_length=2, max_length=40)
    country: str = Field(min_length=2, max_length=80)
    local_lang: str = Field(min_length=2, max_length=40)


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
