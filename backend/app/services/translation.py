from fastapi import HTTPException
from app.config import Settings
from app.services.evolus import EvolusClient

async def translate_summary(client: EvolusClient, settings: Settings, text: str, target: str) -> str:
    if target.casefold() in {"english", "en"}: return text
    if not settings.evolus_translate_tool_enabled: raise HTTPException(status_code=503, detail="Evolus Translator AI Tool is not enabled.")
    if not settings.evolus_api_key or not settings.evolus_app_id: raise HTTPException(status_code=503, detail="Evolus Translator configuration is incomplete.")
    result=await client.translate(text,target)
    if not result.strip(): raise HTTPException(status_code=502, detail="Evolus Translator returned an empty translation.")
    return result
