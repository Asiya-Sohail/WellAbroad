import json
from typing import Any
import httpx
from fastapi import HTTPException
from app.config import Settings


class EvolusClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _require_credentials(self) -> None:
        if not self.settings.evolus_api_key:
            raise HTTPException(status_code=503, detail="Evolus is not configured. Set EVOLUS_API_KEY on the backend.")

    async def chat(self, model: str, prompt: str, *, json_only: bool = False) -> tuple[str, str | None]:
        self._require_credentials()
        if not model:
            raise HTTPException(status_code=503, detail="The required Evolus agent is not configured.")
        body: dict[str, Any] = {"model": model, "messages": [{"role": "user", "content": prompt}]}
        if json_only:
            body["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=45) as client:
            try:
                response = await client.post(self.settings.evolus_agent_chat_url, headers={"Authorization": f"Bearer {self.settings.evolus_api_key}"}, json=body)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail="Evolus agent request failed.") from exc
        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(status_code=502, detail="Evolus returned an unexpected response.") from exc
        conversation_id = response.headers.get("X-Conversation-Id")
        if isinstance(content, list):
            content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
        return str(content), conversation_id

    async def extract_file(self, filename: str, content_type: str, data: bytes) -> dict[str, Any]:
        self._require_credentials()
        if not (self.settings.evolus_app_id and self.settings.evolus_extractor_agent_id and self.settings.evolus_extractor_id):
            raise HTTPException(status_code=503, detail="Evolus document extraction is not configured.")
        url = f"{self.settings.evolus_rest_url}/agents/{self.settings.evolus_extractor_agent_id}/json/{self.settings.evolus_extractor_id}/ask-file?useWebhook=false"
        headers = {"X-ApiKey": self.settings.evolus_api_key, "X-Application-Id": self.settings.evolus_app_id}
        async with httpx.AsyncClient(timeout=90) as client:
            try:
                response = await client.post(url, headers=headers, files={"file": (filename, data, content_type)})
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail="Evolus document extraction failed.") from exc
        try:
            payload = response.json()
            if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
                payload = payload["data"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                raise ValueError("not an object")
            return payload
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=502, detail="Evolus returned invalid extracted document data.") from exc

    async def translate(self, text: str, target: str) -> str:
        self._require_credentials()
        if not self.settings.evolus_app_id or not self.settings.evolus_translate_tool_enabled:
            return text
        url = f"{self.settings.evolus_rest_url}/ai-tools/translate/run"
        headers = {"X-ApiKey": self.settings.evolus_api_key, "X-Application-Id": self.settings.evolus_app_id}
        async with httpx.AsyncClient(timeout=45) as client:
            try:
                response = await client.post(url, headers=headers, json={"text": text, "options": {"target": target, "style": "formal"}})
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail="Evolus translation failed.") from exc
        data = response.json()
        if isinstance(data, str):
            return data
        for key in ("text", "translation", "result", "output"):
            if isinstance(data, dict) and isinstance(data.get(key), str):
                return data[key]
        raise HTTPException(status_code=502, detail="Evolus returned an unexpected translation response.")
