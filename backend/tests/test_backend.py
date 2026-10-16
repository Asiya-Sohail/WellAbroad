from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.services.evolus import EvolusClient
from app.services.store import MemoryStore
from app.services.safety import has_emergency_sign
from app.services.translation import translate_summary

class FakeEvolus:
    def __init__(self): self.prompts=[]; self.extract_calls=0
    async def extract_file(self, filename, content_type, data):
        self.extract_calls += 1
        return {"patient": "A", "test": {"value": "5", "unit": "mg"}, "unreadable_parts": []}
    async def chat(self, model, prompt, **kwargs):
        self.prompts.append((prompt, kwargs))
        return ("The document reports test value 5 mg.", "conv-1")
    async def translate(self, text, target): return f"[{target}] {text}"

def make_app(**overrides):
    settings=Settings(_env_file=None, offline_fallback_enabled=True, **overrides)
    import app.main as main
    main.get_settings=lambda: settings
    application=create_app()
    application.state.evolus=FakeEvolus()
    return application

def test_initializes_without_credentials():
    client=TestClient(make_app())
    response=client.get("/health")
    assert response.status_code == 200
    assert response.json()["evolus_configured"] is False

def test_evolus_chat_headers(monkeypatch):
    seen={}
    class Response:
        headers={"X-Conversation-Id":"next"}
        def raise_for_status(self): pass
        def json(self): return {"choices":[{"message":{"content":"ok"}}]}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self, url, **kwargs): seen.update(url=url, **kwargs); return Response()
    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: Client())
    result=pytest.run if False else None
    import asyncio
    text,cid=asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="secret")).chat("app:agent","hello",conversation_id="old"))
    assert text == "ok" and cid == "next"
    assert seen["headers"] == {"Authorization":"Bearer secret","X-Conversation-Id":"old"}

def test_document_context_and_session_isolation():
    app=make_app(evolus_explainer_model="app:explainer")
    client=TestClient(app)
    a=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"Japanese"}).json()["session_id"]
    b=client.post("/session",json={"ui_lang":"English","country":"Spain","local_lang":"Spanish"}).json()["session_id"]
    result=client.post("/docs",data={"session_id":a},files={"file":("lab.pdf",b"%PDF fake","application/pdf")})
    assert result.status_code == 200
    doc=result.json()["doc_id"]
    assert client.get(f"/docs/{doc}/explanation",params={"session_id":b}).status_code == 404
    follow=client.post(f"/docs/{doc}/chat",json={"session_id":a,"message":"What value is shown?"})
    assert follow.status_code == 200
    assert '"document"' in app.state.evolus.prompts[-1][0]
    assert app.state.evolus.prompts[-1][1]["conversation_id"] == "conv-1"

def test_consultation_skip_and_english_summary():
    client=TestClient(make_app())
    sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"English"}).json()["session_id"]
    assert client.post(f"/consult/{sid}/start").status_code == 200
    answer=client.post(f"/consult/{sid}/answer",json={"skip":True})
    assert answer.status_code == 200
    summary=client.get(f"/consult/{sid}/summary")
    assert summary.status_code == 200
    assert "Not provided" in summary.json()["english"]

def test_expired_store_is_removed():
    store=MemoryStore(1); sid,state=store.create("English","X","Y"); state.expires_at=0
    assert store.get(sid) is None

def test_unsafe_medication_request_is_not_answered():
    from app.services.safety import clean_explanation
    assert "stop medication" not in clean_explanation("You should stop medication immediately.").lower()


def test_sse_parser_and_done_marker():
    assert EvolusClient._sse_content(["data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}","data: {\"choices\":[{\"delta\":{\"content\":\"world\"}}]}","data: [DONE]"]) == "Hello world"

def test_extractor_contract_and_nested_json(monkeypatch):
    seen={}
    class Response:
        headers={}
        def raise_for_status(self): pass
        def json(self): return {"data": "{\"documentType\": \"lab\", \"sections\": \"chemistry\", \"unreadableParts\": \"blurred\"}"}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs): seen.update(url=url,kwargs=kwargs); return Response()
    monkeypatch.setattr("httpx.AsyncClient",lambda **kwargs: Client())
    import asyncio
    result=asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k",evolus_app_id="app",evolus_extractor_agent_id="d2c2f7b2-0b92-4c74-9839-b7684850aa72",evolus_extractor_id="3decf3ba-a264-4b4f-99a8-2383f4c5e0ca")).extract_file("x.pdf","application/pdf",b"data"))
    assert result == {"documentType":"lab","sections":"chemistry","unreadableParts":"blurred"}
    assert seen["url"] == "https://api.evolus.ai/api/v1/agents/d2c2f7b2-0b92-4c74-9839-b7684850aa72/json/3decf3ba-a264-4b4f-99a8-2383f4c5e0ca/ask-file?useWebhook=false"
    assert seen["kwargs"]["headers"] == {"X-ApiKey":"k","X-Application-Id":"app"}
    assert "file" in seen["kwargs"]["files"]

def test_direct_extractor_without_agent_id_is_not_assumed():
    import asyncio
    with pytest.raises(Exception) as exc:
        asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app", evolus_extractor_id="extractor")).extract_file("x.pdf", "application/pdf", b"data"))
    assert getattr(exc.value, "status_code", None) == 503

def test_summary_tool_contract_and_response(monkeypatch):
    seen={}
    class Response:
        def raise_for_status(self): pass
        def json(self): return {"tool":"summarize","output":"A concise summary.","totalTokenCount":None,"creditsConsumed":1.2,"sourceText":None,"truncated":False}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs): seen.update(url=url,kwargs=kwargs); return Response()
    monkeypatch.setattr("httpx.AsyncClient",lambda **kwargs: Client())
    import asyncio
    result=asyncio.run(EvolusClient(Settings(_env_file=None,evolus_api_key="k",evolus_app_id="app")).summarize("long consultation text"))
    assert result == "A concise summary."
    assert seen["url"] == "https://api.evolus.ai/api/v1/ai-tools/summarize/run"
    assert seen["kwargs"]["headers"] == {"X-ApiKey":"k","X-Application-Id":"app"}
    assert seen["kwargs"]["json"] == {"text":"long consultation text","options":{"length":"medium","style":"prose"}}

def test_summary_tool_rejects_malformed_response(monkeypatch):
    class Response:
        def raise_for_status(self): pass
        def json(self): return {"tool":"summarize","output":None}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,*args,**kwargs): return Response()
    monkeypatch.setattr("httpx.AsyncClient",lambda **kwargs: Client())
    import asyncio
    with pytest.raises(Exception) as exc: asyncio.run(EvolusClient(Settings(_env_file=None,evolus_api_key="k",evolus_app_id="app")).summarize("text"))
    assert getattr(exc.value,"status_code",None)==502

def test_translator_contract_and_formal_style(monkeypatch):
    seen={}
    class Response:
        headers={}
        def raise_for_status(self): pass
        def json(self): return {"translation":"translated"}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs): seen.update(url=url,kwargs=kwargs); return Response()
    monkeypatch.setattr("httpx.AsyncClient",lambda **kwargs: Client())
    import asyncio
    result=asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app")).translate("summary","Japanese"))
    assert result == "translated"
    assert seen["url"] == "https://api.evolus.ai/api/v1/ai-tools/translate/run"
    assert seen["kwargs"]["headers"] == {"X-ApiKey":"k","X-Application-Id":"app"}
    assert seen["kwargs"]["json"]["options"] == {"target":"Japanese","style":"formal"}

def test_translator_rejects_malformed_response(monkeypatch):
    class Response:
        def raise_for_status(self): pass
        def json(self): return {"output": ""}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): return Response()
    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: Client())
    import asyncio
    with pytest.raises(Exception) as exc:
        asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app")).translate("summary", "Japanese"))
    assert getattr(exc.value, "status_code", None) == 502

def test_translator_upstream_failure_is_sanitized(monkeypatch):
    import httpx
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): raise httpx.ReadTimeout("mock timeout")
    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: Client())
    import asyncio
    with pytest.raises(Exception) as exc:
        asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app")).translate("summary", "Japanese"))
    assert getattr(exc.value, "status_code", None) == 502

def test_model_format_and_emergency_patterns():
    with pytest.raises(Exception): Settings(_env_file=None, evolus_explainer_model="wrong-format")
    assert has_emergency_sign("Tengo dolor en el pecho")
    assert has_emergency_sign("Brustschmerzen")

def test_translator_missing_configuration_fails():
    import asyncio
    with pytest.raises(Exception) as exc: asyncio.run(translate_summary(FakeEvolus(), Settings(_env_file=None, ), "summary", "Japanese"))
    assert getattr(exc.value, "status_code", None) == 503

def test_cap_reserves_mandatory_questions():
    app=make_app(max_questions=4)
    client=TestClient(app); sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"English"}).json()["session_id"]
    assert client.post(f"/consult/{sid}/start").json()["question"]["target"] == "chief_complaint"
    targets=[]
    for _ in range(4):
        result=client.post(f"/consult/{sid}/answer",json={"answer":"none"}).json()
        if result["done"]: break
        targets.append(result["question"]["target"])
    assert targets == ["medications","allergies","known_conditions"]

def test_invalid_interviewer_output_uses_nonrepeating_fallback():
    app=make_app(evolus_api_key="k",evolus_interviewer_model="app:interviewer")
    client=TestClient(app); sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"English"}).json()["session_id"]
    client.post(f"/consult/{sid}/start")
    first=client.post(f"/consult/{sid}/answer",json={"answer":"none"}).json()["question"]["target"]
    client.post(f"/consult/{sid}/answer",json={"skip":True})
    second=client.post(f"/consult/{sid}/answer",json={"answer":"none"}).json()["question"]["target"]
    assert first != second


def test_chat_stream_request_and_sse_response(monkeypatch):
    seen={}
    class Response:
        headers={"X-Conversation-Id":"next"}
        def raise_for_status(self): pass
        async def aiter_lines(self):
            yield 'data: {\"choices\":[{\"delta\":{\"content\":\"safe\"}}]}'
            yield 'data: [DONE]'
    class Stream:
        async def __aenter__(self): return Response()
        async def __aexit__(self,*args): pass
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        def stream(self,method,url,**kwargs): seen.update(method=method,url=url,kwargs=kwargs); return Stream()
    monkeypatch.setattr("httpx.AsyncClient",lambda **kwargs: Client())
    import asyncio
    text,cid=asyncio.run(EvolusClient(Settings(_env_file=None, evolus_api_key="k")).chat("app:agent","prompt",stream=True))
    assert text == "safe" and cid == "next" and seen["kwargs"]["json"]["stream"] is True

def test_interviewer_red_flag_returns_urgent_guidance():
    class FlagEvolus(FakeEvolus):
        async def chat(self, model, prompt, **kwargs):
            return ('{"done":false,"red_flag":true,"target":"duration","question":"When did this start?","quick_options":[]}', None)
    app=make_app(evolus_api_key="k",evolus_interviewer_model="app:interviewer"); app.state.evolus=FlagEvolus(); client=TestClient(app)
    sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"English"}).json()["session_id"]
    client.post(f"/consult/{sid}/start"); result=client.post(f"/consult/{sid}/answer",json={"answer":"none"})
    assert result.json()["red_flag"] is True and result.json()["urgent_message"]

def test_extractor_upstream_failure_is_sanitized(monkeypatch):
    import httpx
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): raise httpx.ReadTimeout("mock timeout")
    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: Client())
    import asyncio
    settings=Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app", evolus_extractor_agent_id="d2c2f7b2-0b92-4c74-9839-b7684850aa72", evolus_extractor_id="3decf3ba-a264-4b4f-99a8-2383f4c5e0ca")
    with pytest.raises(Exception) as exc:
        asyncio.run(EvolusClient(settings).extract_file("x.pdf", "application/pdf", b"data"))
    assert getattr(exc.value, "status_code", None) == 502

def test_extractor_404_is_classified_without_upstream_details(monkeypatch):
    import httpx
    request=httpx.Request("POST", "https://api.evolus.ai/api/v1/agents/a/json/e/ask-file?useWebhook=false")
    upstream=httpx.Response(404, request=request)
    class Response:
        def raise_for_status(self): raise httpx.HTTPStatusError("not found", request=request, response=upstream)
        def json(self): return {}
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): return Response()
    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: Client())
    import asyncio
    settings=Settings(_env_file=None, evolus_api_key="k", evolus_app_id="app", evolus_extractor_agent_id="agent", evolus_extractor_id="extractor")
    with pytest.raises(Exception) as exc:
        asyncio.run(EvolusClient(settings).extract_file("x.pdf", "application/pdf", b"data"))
    assert getattr(exc.value, "status_code", None) == 502
    assert "resource was not found" in str(exc.value.detail)
    assert "traceId" not in str(exc.value.detail)

def test_document_pipeline_logs_extractor_failure(caplog):
    import logging
    from fastapi import HTTPException
    class BrokenExtractor:
        async def extract_file(self, *args, **kwargs):
            raise HTTPException(502, "resource was not found; do-not-log-document")
    app=make_app()
    app.state.evolus=BrokenExtractor()
    client=TestClient(app)
    sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"Japanese"}).json()["session_id"]
    with caplog.at_level(logging.WARNING, logger="app.routes.documents"):
        response=client.post("/docs",data={"session_id":sid},files={"file":("report.pdf",b"%PDF fake","application/pdf")})
    assert response.status_code == 502
    records=[r for r in caplog.records if getattr(r,"stage",None)=="extractor"]
    assert len(records) == 1
    record=records[0]
    assert record.success is False
    assert record.error_category == "resource_not_found"
    assert isinstance(record.request_correlation_id,str) and record.request_correlation_id
    assert record.elapsed_ms >= 0
    assert record.getMessage() == "document_pipeline_stage"
    assert "do-not-log-document" not in repr(record.__dict__)

def test_document_pipeline_logs_initial_explainer_failure(caplog):
    import logging
    from fastapi import HTTPException
    class BrokenExplainer:
        async def extract_file(self, *args, **kwargs):
            return {"documentType":"lab","unreadable_parts":[]}
        async def chat(self, *args, **kwargs):
            raise HTTPException(502, "explainer upstream failure; do-not-log-prompt")
    app=make_app(evolus_explainer_model="app:explainer")
    app.state.evolus=BrokenExplainer()
    client=TestClient(app)
    sid=client.post("/session",json={"ui_lang":"English","country":"Japan","local_lang":"Japanese"}).json()["session_id"]
    with caplog.at_level(logging.WARNING, logger="app.routes.documents"):
        response=client.post("/docs",data={"session_id":sid},files={"file":("report.pdf",b"%PDF fake","application/pdf")})
    assert response.status_code == 502
    records=[r for r in caplog.records if getattr(r,"stage",None)=="initial_explainer"]
    assert len(records) == 1
    record=records[0]
    assert record.success is False
    assert record.error_category == "http_502"
    assert isinstance(record.request_correlation_id,str) and record.request_correlation_id
    assert record.elapsed_ms >= 0
    assert record.getMessage() == "document_pipeline_stage"
    assert "do-not-log-prompt" not in repr(record.__dict__)
    assert not any(getattr(r,"stage",None)=="extractor" and r.success is False for r in caplog.records)

def test_diagnostic_formatter_renders_safe_structured_fields():
    import json
    import logging
    from app.routes.documents import DiagnosticFormatter
    record=logging.LogRecord("app.routes.documents", logging.WARNING, __file__, 1, "document_pipeline_stage", (), None)
    record.request_correlation_id="corr-123"
    record.stage="extractor"
    record.success=False
    record.elapsed_ms=12.34
    record.error_category="resource_not_found"
    rendered=DiagnosticFormatter().format(record)
    payload=json.loads(rendered)
    assert payload == {"event":"document_pipeline_stage","request_correlation_id":"corr-123","stage":"extractor","success":False,"elapsed_ms":12.34,"error_category":"resource_not_found"}
    assert "api_key" not in rendered.lower()
    assert "authorization" not in rendered.lower()
    assert "patient" not in rendered.lower()
    assert "prompt" not in rendered.lower()

def test_diagnostic_formatter_preserves_unrelated_messages_without_sensitive_fields():
    import logging
    from app.routes.documents import DiagnosticFormatter
    record=logging.LogRecord("app.routes.documents", logging.INFO, __file__, 1, "ordinary_event", (), None)
    rendered=DiagnosticFormatter().format(record)
    assert rendered.endswith("ordinary_event")
    assert "request_correlation_id" not in rendered
    assert "error_category" not in rendered
