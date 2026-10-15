import time
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4


@dataclass
class Session:
    ui_lang: str
    country: str
    local_lang: str
    expires_at: float
    answers: list[dict[str, str]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    asked_targets: list[str] = field(default_factory=list)
    question_count: int = 0
    current_question: dict[str, Any] | None = None
    red_flag: bool = False
    documents: dict[str, dict[str, Any]] = field(default_factory=dict)


class MemoryStore:
    """Ephemeral session storage. Data is lost on restart and expires by TTL."""
    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self.sessions: dict[str, Session] = {}

    def create(self, ui_lang: str, country: str, local_lang: str) -> tuple[str, Session]:
        self.purge()
        sid = str(uuid4())
        session = Session(ui_lang, country, local_lang, time.time() + self.ttl_seconds)
        self.sessions[sid] = session
        return sid, session

    def get(self, sid: str) -> Session | None:
        item = self.sessions.get(sid)
        if item and item.expires_at > time.time():
            return item
        self.sessions.pop(sid, None)
        return None

    def purge(self) -> None:
        now = time.time()
        for sid in [key for key, value in self.sessions.items() if value.expires_at <= now]:
            self.sessions.pop(sid, None)
