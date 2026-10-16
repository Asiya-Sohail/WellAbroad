import json
from typing import Any
from app.config import Settings
from app.services.evolus import EvolusClient
from app.services.safety import safe_medical_prompt

def document_prompt(extracted: dict[str, Any], language: str, question: str | None = None, history: list[dict[str, str]] | None = None, conversation_id: str | None = None) -> str:
    return (f"You are the WellAbroad Document Explainer. Answer in {language}. {safe_medical_prompt()} Cite the extracted field or section supporting each statement. Preserve names, values, units, dates, and uncertainty exactly. If absent, say it is not in the document.\n" + json.dumps({"document": extracted, "question": question or "Explain the document clearly.", "conversation": [] if conversation_id else (history or [])}, ensure_ascii=False))

async def explain_document(client: EvolusClient, settings: Settings, extracted: dict[str, Any], language: str, *, question: str | None = None, history: list[dict[str, str]] | None = None, conversation_id: str | None = None) -> tuple[str, str | None]:
    if not settings.evolus_explainer_model:
        if settings.offline_fallback_enabled: return "Document text was extracted, but the Document Explainer agent is not configured.", conversation_id
        raise RuntimeError("Document Explainer agent is not configured.")
    return await client.chat(settings.evolus_explainer_model, document_prompt(extracted, language, question, history, conversation_id), conversation_id=conversation_id, stream=True)

def interviewer_prompt(state: dict[str, Any], language: str, max_questions: int) -> str:
    return (f"Return only JSON with keys done, red_flag, target, question, quick_options. Ask one short relevant symptom question in {language}. Do not diagnose or recommend treatment. Never repeat or ask a skipped target. If enough information exists, set done true. " + json.dumps({**state, "max_questions": max_questions}, ensure_ascii=False))

def summarizer_prompt(answers: list[dict[str, str]], skipped: list[str]) -> str:
    return ("Create a concise factual English doctor summary. Include complaint, timing, severity, symptoms, medications, allergies, conditions, and explicitly mark missing information. " + safe_medical_prompt() + "\n" + json.dumps({"answers": answers, "skipped": skipped}, ensure_ascii=False))

async def summarize_consultation(client: EvolusClient, settings: Settings, answers: list[dict[str, str]], skipped: list[str]) -> str:
    text=summarizer_prompt(answers, skipped)
    if not settings.evolus_api_key or not settings.evolus_app_id:
        if not settings.offline_fallback_enabled: raise RuntimeError("Evolus Summary Tool is not configured.")
        fallback = "Consultation notes\n" + "\n".join(str(item.get("target")) + ": " + str(item.get("answer")) for item in answers)
        return fallback + (("\nNot provided: "+", ".join(skipped)) if skipped else "")
    result=await client.summarize(text)
    if not result.strip(): raise RuntimeError("Evolus Summary Tool returned an empty summary.")
    return result.strip()