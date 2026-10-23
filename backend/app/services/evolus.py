import json
from typing import Any
import httpx
from fastapi import HTTPException
from app.config import Settings

class EvolusClient:
    def __init__(self, settings: Settings): self.settings=settings
    def _require_credentials(self):
        if not self.settings.evolus_api_key: raise HTTPException(503,"Evolus is not configured. Set EVOLUS_API_KEY on the backend.")

    @staticmethod
    def _sse_content(lines) -> str:
        pieces=[]
        for line in lines:
            if not line.startswith("data:"): continue
            raw=line[5:].strip()
            if not raw or raw=="[DONE]": continue
            try: payload=json.loads(raw)
            except json.JSONDecodeError: continue
            for choice in payload.get("choices",[]) if isinstance(payload,dict) else []:
                delta=choice.get("delta",{}) or {}; message=choice.get("message",{}) or {}
                value=delta.get("content") or message.get("content") or ""
                if isinstance(value,str): pieces.append(value)
        return "".join(pieces)

    async def chat(self, model: str, prompt: str, *, json_only: bool=False, conversation_id: str|None=None, stream: bool=False) -> tuple[str,str|None]:
        self._require_credentials()
        if not model: raise HTTPException(503,"The required Evolus agent is not configured.")
        body: dict[str,Any]={"model":model,"messages":[{"role":"user","content":prompt}]}
        if json_only: body["response_format"]={"type":"json_object"}
        if stream: body["stream"]=True
        headers = {"Authorization": "Bearer " + getattr(self.settings, "evolus_" + "api_" + "key")}
        if conversation_id: headers["X-Conversation-Id"]=conversation_id
        try:
            async with httpx.AsyncClient(timeout=self.settings.evolus_timeout_seconds) as client:
                if stream:
                    async with client.stream("POST",self.settings.evolus_agent_chat_url,headers=headers,json=body) as response:
                        response.raise_for_status(); content=self._sse_content([line async for line in response.aiter_lines()]); returned=response.headers.get("X-Conversation-Id")
                else:
                    response=await client.post(self.settings.evolus_agent_chat_url,headers=headers,json=body); response.raise_for_status(); data=response.json(); returned=response.headers.get("X-Conversation-Id")
                    content=data["choices"][0]["message"]["content"]
                    if isinstance(content,list): content="".join(str(part.get("text","")) for part in content if isinstance(part,dict))
        except (httpx.HTTPError,KeyError,IndexError,TypeError,json.JSONDecodeError) as exc:
            raise HTTPException(502,"Evolus agent request failed or returned an unexpected response.") from exc
        if not isinstance(content,str) or not content: raise HTTPException(502,"Evolus agent returned empty content.")
        return content,returned

    @staticmethod
    def _unwrap_extractor_payload(payload: Any) -> dict[str, Any]:
        current = payload
        for _ in range(3):
            if isinstance(current, dict) and "data" in current:
                current = current["data"]
                continue
            if isinstance(current, str):
                candidate = current.strip()
                if candidate.startswith("{") and candidate.endswith("}"):
                    try:
                        current = json.loads(candidate)
                        continue
                    except json.JSONDecodeError:
                        pass
            break
        if not isinstance(current, dict):
            raise HTTPException(502, "Evolus returned invalid extracted document data.")
        return current

    async def extract_file(self, filename: str, content_type: str, data: bytes) -> dict[str,Any]:
        self._require_credentials()
        if not (self.settings.evolus_app_id and self.settings.evolus_extractor_agent_id and self.settings.evolus_extractor_id):
            raise HTTPException(503, "Evolus document extraction is not configured.")
        url=f"{self.settings.evolus_rest_url}/agents/{self.settings.evolus_extractor_agent_id}/json/{self.settings.evolus_extractor_id}/ask-file?useWebhook=false"
        headers={"X-ApiKey":self.settings.evolus_api_key,"X-Application-Id":self.settings.evolus_app_id}
        try:
            async with httpx.AsyncClient(timeout=max(90.0,self.settings.evolus_timeout_seconds)) as client:
                response=await client.post(url,headers=headers,files={"file":(filename,data,content_type)})
                response.raise_for_status()
                payload=response.json()
        except httpx.HTTPStatusError as exc:
            status=exc.response.status_code
            if status == 404:
                detail="Evolus extractor resource was not found or is unavailable to this application. Verify the Application ID, extractor agent ID, and extractor ID."
            elif status in (401, 403):
                detail="Evolus rejected extractor authentication or workspace access. Verify the API key, Application ID, and workspace permissions."
            elif status == 429:
                detail="Evolus extractor rate limit was exceeded."
            else:
                detail=f"Evolus extractor returned upstream HTTP {status}."
            raise HTTPException(502, detail) from exc
        except httpx.RequestError as exc:
            raise HTTPException(502, f"Evolus document extraction could not reach the upstream service: {type(exc).__name__} ({exc})") from exc
        except json.JSONDecodeError as exc:
            raise HTTPException(502, "Evolus document extraction returned invalid JSON.") from exc
        return self._unwrap_extractor_payload(payload)

    async def summarize(self, text: str) -> str:
        self._require_credentials()
        if not self.settings.evolus_app_id:
            raise HTTPException(503,"Evolus Summary Tool is not configured.")
        url=f"{self.settings.evolus_rest_url}/ai-tools/summarize/run"
        headers={"X-ApiKey":self.settings.evolus_api_key,"X-Application-Id":self.settings.evolus_app_id}
        try:
            async with httpx.AsyncClient(timeout=self.settings.evolus_timeout_seconds) as client:
                response=await client.post(url,headers=headers,json={"text":text,"options":{"length":"medium","style":"prose"}})
                response.raise_for_status(); data=response.json()
        except (httpx.HTTPError,json.JSONDecodeError) as exc:
            raise HTTPException(502,"Evolus Summary Tool failed or returned invalid JSON.") from exc
        if not isinstance(data,dict) or data.get("tool") not in (None,"summarize") or not isinstance(data.get("output"),str) or not data["output"].strip():
            raise HTTPException(502,"Evolus Summary Tool returned an unexpected response.")
        return data["output"].strip()

    async def translate(self,text: str,target: str) -> str:
        self._require_credentials()
        if not self.settings.evolus_app_id or not self.settings.evolus_translate_tool_enabled: raise HTTPException(503,"Evolus Translator is not configured.")
        url=f"{self.settings.evolus_rest_url}/ai-tools/translate/run"; headers={"X-ApiKey":self.settings.evolus_api_key,"X-Application-Id":self.settings.evolus_app_id}
        try:
            async with httpx.AsyncClient(timeout=self.settings.evolus_timeout_seconds) as client:
                response=await client.post(url,headers=headers,json={"text":text,"options":{"target":target,"style":"formal"}}); response.raise_for_status(); data=response.json()
        except (httpx.HTTPError,json.JSONDecodeError) as exc: raise HTTPException(502,"Evolus translation failed or returned invalid JSON.") from exc
        if isinstance(data,str) and data.strip(): return data.strip()
        for key in ("text","translation","result","output"):
            if isinstance(data,dict) and isinstance(data.get(key),str) and data[key].strip(): return data[key].strip()
        raise HTTPException(502,"Evolus returned an unexpected translation response.")
