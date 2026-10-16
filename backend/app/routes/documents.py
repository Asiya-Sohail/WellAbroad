import json
import logging
import hashlib, time
from uuid import uuid4
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from app.routes.sessions import get_session
from app.schemas import DocumentChatRequest, DocumentChatResult, DocumentResult
from app.services.orchestration import explain_document
from app.services.safety import DISCLAIMER, URGENT_MESSAGE, clean_explanation, has_emergency_sign
router=APIRouter(tags=["documents"])
logger=logging.getLogger(__name__)

class DiagnosticFormatter(logging.Formatter):
    def __init__(self):
        super().__init__("%(levelname)s %(name)s %(message)s")

    def format(self, record):
        if record.getMessage() == "document_pipeline_stage":
            fields={"event":record.getMessage(),"request_correlation_id":getattr(record,"request_correlation_id",None),"stage":getattr(record,"stage",None),"success":getattr(record,"success",None),"elapsed_ms":getattr(record,"elapsed_ms",None)}
            error_category=getattr(record,"error_category",None)
            if error_category is not None: fields["error_category"]=error_category
            return json.dumps(fields, separators=(",",":"))
        return super().format(record)

def _configure_diagnostic_logging():
    if any(getattr(handler,"_wellabroad_diagnostic",False) for handler in logger.handlers): return
    handler=logging.StreamHandler()
    handler._wellabroad_diagnostic=True
    handler.setFormatter(DiagnosticFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

_configure_diagnostic_logging()
ALLOWED_TYPES={"application/pdf","image/jpeg","image/png","image/webp","image/heic"}
MAX_BYTES=20*1024*1024

def _stage_error_category(exc):
    if isinstance(exc, HTTPException):
        detail=str(exc.detail).lower()
        if exc.status_code == 503: return "configuration"
        if "resource was not found" in detail: return "resource_not_found"
        if "authentication" in detail or "workspace" in detail: return "auth_or_workspace"
        if "rate limit" in detail: return "rate_limited"
        if "could not reach" in detail: return "network"
        if "invalid json" in detail or "invalid extracted" in detail: return "invalid_response"
        return f"http_{exc.status_code}"
    return "unexpected"

def _log_stage(level, correlation_id, stage, started, *, success, error_category=None):
    fields={"request_correlation_id":correlation_id,"stage":stage,"success":success,"elapsed_ms":round((time.perf_counter()-started)*1000,2)}
    if error_category: fields["error_category"]=error_category
    getattr(logger, level)("document_pipeline_stage", extra=fields)


def _validate(payload):
    if not isinstance(payload,dict): raise HTTPException(502,"Evolus returned invalid extracted document data.")
    result=dict(payload); parts=result.get("unreadable_parts",[]); result["unreadable_parts"]=[str(x) for x in parts] if isinstance(parts,list) else []; return result

def _purge(request):
    now=time.time(); request.app.state.store.purge(); request.app.state.store.purge_documents(now)
    for cache in (request.app.state.document_cache,):
        for key,item in list(cache.items()):
            if item.get("expires_at",0)<=now: cache.pop(key,None)

def _find(request,doc_id,sid):
    _purge(request)
    if sid:
        session=get_session(request,sid); record=session.documents.get(doc_id)
        if not record: raise HTTPException(404,"Document not found in this session.")
        return record
    raise HTTPException(404,"Document explanation not found or session expired.")

@router.post("/docs",response_model=DocumentResult)
async def upload_document(request:Request,file:UploadFile=File(...),session_id:str=Form(...),ui_lang:str=Form(default="English")):
    data=await file.read(MAX_BYTES+1)
    if not data: raise HTTPException(422,"The uploaded file is empty.")
    if len(data)>min(MAX_BYTES,request.app.state.settings.max_upload_mb*1024*1024): raise HTTPException(413,"The file exceeds the upload size limit.")
    if file.content_type not in ALLOWED_TYPES: raise HTTPException(415,"Upload a PDF or supported image (JPEG, PNG, WebP, or HEIC).")
    session=get_session(request,session_id)
    ui_lang=session.ui_lang
    _purge(request); key=f"{session_id}:{hashlib.sha256(data).hexdigest()}"; cached=request.app.state.document_cache.get(key)
    correlation_id=str(uuid4())
    extraction_started=time.perf_counter()
    try:
        extracted=cached["data"] if cached else _validate(await request.app.state.evolus.extract_file(file.filename or "upload",file.content_type,data))
    except Exception as exc:
        _log_stage("warning",correlation_id,"extractor",extraction_started,success=False,error_category=_stage_error_category(exc))
        raise
    else:
        _log_stage("info",correlation_id,"extractor",extraction_started,success=True)
    if not cached: request.app.state.document_cache[key]={"data":extracted,"expires_at":time.time()+min(request.app.state.settings.document_retention_seconds,request.app.state.settings.session_ttl_seconds)}
    explainer_started=time.perf_counter()
    try:
        explanation,conversation_id=await explain_document(request.app.state.evolus,request.app.state.settings,extracted,ui_lang)
    except Exception as exc:
        _log_stage("warning",correlation_id,"initial_explainer",explainer_started,success=False,error_category=_stage_error_category(exc))
        if isinstance(exc, RuntimeError): raise HTTPException(503,str(exc)) from exc
        raise
    else:
        _log_stage("info",correlation_id,"initial_explainer",explainer_started,success=True)
    explanation=clean_explanation(explanation)
    if has_emergency_sign(explanation): explanation=URGENT_MESSAGE+"\n\n"+explanation
    doc_id=str(uuid4()); record={"extracted":extracted,"explanation":explanation,"conversation_id":conversation_id,"ui_lang":ui_lang,"session_id":session_id,"expires_at":time.time()+min(request.app.state.settings.document_retention_seconds,request.app.state.settings.session_ttl_seconds),"history":[]}
    session.documents[doc_id]=record
    return DocumentResult(doc_id=doc_id,explanation=explanation,extracted=extracted,unreadable_parts=extracted["unreadable_parts"],disclaimer=DISCLAIMER)

@router.get("/docs/{doc_id}/explanation")
async def get_explanation(doc_id:str,request:Request,session_id:str|None=None):
    record=_find(request,doc_id,session_id); return {"doc_id":doc_id,"explanation":record["explanation"],"disclaimer":DISCLAIMER}

@router.post("/docs/{doc_id}/chat",response_model=DocumentChatResult)
async def chat_document(doc_id:str,body:DocumentChatRequest,request:Request):
    record=_find(request,doc_id,body.session_id); message=body.message.strip()
    if has_emergency_sign(message): return DocumentChatResult(answer=URGENT_MESSAGE,urgent=True,disclaimer=DISCLAIMER)
    try: answer,cid=await explain_document(request.app.state.evolus,request.app.state.settings,record["extracted"],record["ui_lang"],question=message,history=record["history"],conversation_id=record.get("conversation_id"))
    except RuntimeError as exc: raise HTTPException(503,str(exc)) from exc
    answer=clean_explanation(answer); record["conversation_id"]=cid or record.get("conversation_id"); record["history"] += [{"role":"user","content":message},{"role":"assistant","content":answer}]; record["history"]=record["history"][-12:]
    return DocumentChatResult(answer=answer,urgent=has_emergency_sign(answer),disclaimer=DISCLAIMER)
