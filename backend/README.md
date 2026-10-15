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
