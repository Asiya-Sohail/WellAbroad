from collections import defaultdict, deque
from time import monotonic
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.routes import consultation, documents, sessions
from app.services.evolus import EvolusClient
from app.services.store import MemoryStore


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="WellAbroad API", version="0.1.0", description="Safe consultation preparation and medical document explanation.")
    app.state.settings = settings
    app.state.store = MemoryStore(settings.session_ttl_seconds)
    app.state.evolus = EvolusClient(settings)
    app.state.document_cache = {}
    app.state.orphan_documents = {}
    app.state.rate_windows = defaultdict(deque)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        # FastAPI's Swagger UI is GET /docs; POST /docs is the medical upload API
        # and must remain rate limited like the other application endpoints.
        if request.url.path in {"/health", "/openapi.json", "/redoc"} or (request.url.path == "/docs" and request.method == "GET"):
            return await call_next(request)
        key = request.client.host if request.client else "unknown"
        window = app.state.rate_windows[key]
        now = monotonic()
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= 60:
            return JSONResponse(status_code=429, content={"detail": "Too many requests. Try again shortly."})
        window.append(now)
        return await call_next(request)

    app.include_router(sessions.router)
    app.include_router(consultation.router)
    app.include_router(documents.router)

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok", "evolus_configured": bool(settings.evolus_api_key)}

    return app


app = create_app()
