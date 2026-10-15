import hashlib
import json
import time
from uuid import uuid4
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from app.routes.sessions import get_session
from app.schemas import DocumentResult
from app.services.safety import DISCLAIMER, URGENT_MESSAGE, clean_explanation, has_emergency_sign

router = APIRouter(tags=["documents"])
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_BYTES = 20 * 1024 * 1024


@router.post("/docs", response_model=DocumentResult)
async def upload_document(request: Request, file: UploadFile = File(...), session_id: str | None = Form(default=None), ui_lang: str = Form(default="English")):
    data = await file.read(MAX_BYTES + 1)
    if not data:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(data) > min(MAX_BYTES, request.app.state.settings.max_upload_mb * 1024 * 1024):
        raise HTTPException(status_code=413, detail="The file exceeds the upload size limit.")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Upload a PDF or supported image (JPEG, PNG, WebP, or HEIC).")
    if session_id:
        session = get_session(request, session_id)
        ui_lang = session.ui_lang
    digest = hashlib.sha256(data).hexdigest()
    cache = request.app.state.document_cache
    now = time.time()
    for key in [key for key, item in cache.items() if item["expires_at"] <= now]:
        cache.pop(key, None)
    cached = cache.get(digest)
    extracted = cached["data"] if cached else await request.app.state.evolus.extract_file(file.filename or "upload", file.content_type, data)
    cache[digest] = {"data": extracted, "expires_at": now + request.app.state.settings.session_ttl_seconds}
    prompt = ("Explain this medical document in simple " + ui_lang + ". Use only the extracted content, cite the field/section supporting each explanation, preserve names/values/units, and state when something is unclear. "
              "Do not diagnose or advise starting/stopping/changing medication. If asked something absent, say it is not in the document.\n" + json.dumps(extracted, ensure_ascii=False))
    explanation = "Document text was extracted, but no Document Explainer agent is configured."
    conversation_id = None
    if request.app.state.settings.evolus_explainer_model and request.app.state.settings.evolus_api_key:
        explanation, conversation_id = await request.app.state.evolus.chat(request.app.state.settings.evolus_explainer_model, prompt)
    explanation = clean_explanation(explanation)
    if has_emergency_sign(explanation):
        explanation = URGENT_MESSAGE + "\n\n" + explanation
    doc_id = str(uuid4())
    record = {"extracted": extracted, "explanation": explanation, "conversation_id": conversation_id, "ui_lang": ui_lang}
    if session_id:
        session.documents[doc_id] = record
    else:
        request.app.state.orphan_documents[doc_id] = record
    unreadable = extracted.get("unreadable_parts", [])
    return DocumentResult(doc_id=doc_id, explanation=explanation, extracted=extracted, unreadable_parts=unreadable if isinstance(unreadable, list) else [], disclaimer=DISCLAIMER)


def _find_document(request: Request, doc_id: str):
    record = request.app.state.orphan_documents.get(doc_id)
    if record:
        return record
    for session in list(request.app.state.store.sessions.values()):
        record = session.documents.get(doc_id)
        if record:
            return record
    raise HTTPException(status_code=404, detail="Document explanation not found or session expired.")


@router.get("/docs/{doc_id}/explanation")
async def get_explanation(doc_id: str, request: Request):
    record = _find_document(request, doc_id)
    return {"doc_id": doc_id, "explanation": record["explanation"], "disclaimer": DISCLAIMER}


@router.post("/docs/{doc_id}/chat")
async def chat_document(doc_id: str, body: dict, request: Request):
    record = _find_document(request, doc_id)
    message = body.get("message") if isinstance(body, dict) else None
    if not isinstance(message, str) or not message.strip() or len(message) > 2000:
        raise HTTPException(status_code=422, detail="Provide a message up to 2000 characters.")
    if has_emergency_sign(message):
        return {"answer": URGENT_MESSAGE, "urgent": True, "disclaimer": DISCLAIMER}
    model = request.app.state.settings.evolus_explainer_model
    if not model or not request.app.state.settings.evolus_api_key:
        raise HTTPException(status_code=503, detail="Evolus Document Explainer is not configured.")
    # Keep each turn grounded in the extracted content. Evolus conversation IDs are retained where returned.
    prompt = ("Answer in " + record["ui_lang"] + " using only this extracted medical document. Cite the supporting section. Do not diagnose or advise medication changes. If unsupported, say it is absent.\n"
              + json.dumps({"document": record["extracted"], "question": message}, ensure_ascii=False))
    answer, conversation_id = await request.app.state.evolus.chat(model, prompt)
    record["conversation_id"] = conversation_id or record.get("conversation_id")
    return {"answer": clean_explanation(answer), "urgent": False, "disclaimer": DISCLAIMER}
