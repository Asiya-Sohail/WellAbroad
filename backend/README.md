# WellAbroad backend

FastAPI backend for consultation preparation and medical document explanation.

## Run locally

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

API docs are available at `http://localhost:8000/docs`. Configure the Evolus IDs and key in `.env` to enable AI extraction, agent replies and translations. The backend uses a temporary safe question flow when no interviewer is configured.

Uploaded originals are processed in memory and discarded after the request. Extracted document data and session answers are kept only in process memory until the session TTL expires or the server restarts. Do not deploy this in-process store for multi-worker or production use without replacing it with a shared TTL store and adding authentication.

The default OFFLINE_FALLBACK_ENABLED=true permits local workflow smoke tests without Evolus credentials. Set it to false in deployed environments. Non-English summaries require the Evolus Translator AI Tool and application credentials. Tests use mocked upstream responses and never make live Evolus calls.

## Evolus contract limitations

Document extraction uses the verified endpoint POST /api/v1/agents/{agentId}/json/{extractorId}/ask-file?useWebhook=false with EVOLUS_EXTRACTOR_AGENT_ID and EVOLUS_EXTRACTOR_ID. The uploaded original is processed in memory; extracted JSON is retained only in the session-scoped TTL store/cache.

Consultation summaries use the Evolus Summary Tool at POST /api/v1/ai-tools/summarize/run with medium-length prose options, followed by the Translator AI Tool. The Summary Tool requires the workspace X-ApiKey and X-Application-Id headers.
