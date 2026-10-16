# WellAbroad backend audit

**Review date:** 2026-10-16  
**Scope:** Static review of `backend/app`, `backend/requirements.txt`, `backend/.env.example`, and `backend/README.md` against the supplied WellAbroad architecture guide.  
**Verification boundary:** No Evolus credentials or live workspace were available to this review. The test suite was not run; findings below are from source inspection, not a runtime or security certification.

## Executive assessment

The project has a usable FastAPI foundation and implements the main session, consultation, upload, explanation, and follow-up routes. Evolus calls are server-side, the upload is size-limited and not written to disk, and session/document data is held in memory with expiry.

It is **not yet ready to call production-ready**. The consultation's fixed questions are not localized and fallback questions can repeat. The document-explanation GET route requires a session ID in practice but advertises it as optional. Medical safety checks and upload validation are limited, and the in-memory session IDs are the only access control for sensitive data. Evolus setup and end-to-end behavior remain unverified.

## Findings

### High priority

1. **Fixed consultation prompts ignore the selected language.** The opening question and required medications/allergies/conditions questions are hard-coded in English. AI-generated questions receive the user's language, but the deterministic questions and fallback path do not. This conflicts with the selected-language user flow. See `app/routes/consultation.py`.

2. **Fallback consultation can repeat the same target/question.** Once duration and severity have been asked or skipped, the fallback returns `associated_symptoms` every time. The fallback does not check whether that target was already asked. With the interviewer unconfigured or returning invalid JSON, the system can repeat a question until it reaches its cap. See `_safe_question` in `app/routes/consultation.py`.

3. **Document explanation endpoint has a misleading contract.** `GET /docs/{doc_id}/explanation` declares `session_id` optional, but lookup always returns 404 without it. Frontend callers must pass `?session_id=<session_id>`, and the OpenAPI schema should make this required or the lookup design should change. See `app/routes/documents.py`.

4. **Medical safety detection is not a complete multilingual emergency screen.** `has_emergency_sign` uses a finite keyword list. It will miss synonyms, misspellings, and languages not covered, including Urdu. The consultation's first question is a general complaint question rather than a localized urgent-symptom gate. The warning should not be considered a reliable emergency triage system. See `app/services/safety.py` and `app/routes/consultation.py`.

5. **No user authentication or authorization exists.** A UUID session ID is a bearer secret for answers and uploaded-document data. Anyone who obtains it can access the related data during its lifetime. The API also has no account-level or per-session authorization. This may be acceptable for a prototype, but the privacy model should be explicit before public deployment. See `app/routes/sessions.py` and `app/routes/documents.py`.

### Medium priority

6. **Upload type checks trust the client-provided MIME type.** The backend checks the declared `Content-Type` and size, but does not inspect the file signature or parse the PDF/image before sending it to the extractor. A renamed or malformed file may pass validation. See `app/routes/documents.py`.

7. **Extracted JSON validation is shallow.** The response is required to be an object and `unreadable_parts` is normalized, but the other expected extractor fields and their types are not validated against a schema. Unexpected structures can reach the explainer and frontend. See `_validate` in `app/routes/documents.py`.

8. **Medication-safety cleanup is only a narrow text filter.** `clean_explanation` removes some English lines matching a regex, but it cannot reliably detect unsafe advice in other languages, different wording, or advice embedded in a paragraph. The agent prompt is useful but is not a technical guarantee. See `app/services/safety.py` and `app/services/orchestration.py`.

9. **Summary can be requested before the interview is finished.** The endpoint only checks that there is at least one answer or skipped question; it does not require `done=true` or otherwise verify all questions are complete. The client can receive a partial summary while a question is still pending. See `app/routes/consultation.py`.

10. **Rate limiting is per-process and IP-based.** It is an in-memory limit of 60 requests per minute. It resets on restart and is not shared between workers. Behind a reverse proxy, all users may share the same apparent client IP unless proxy handling is configured. It should be replaced or backed by a shared limiter for multi-worker/public deployments. The current code now keeps `POST /docs` under the limiter while exempting Swagger's `GET /docs`.

11. **No rate limit on health/OpenAPI routes.** `/health`, `/openapi.json`, and `/redoc` are exempt. This is ordinarily low risk, but production exposure and monitoring policy should be intentional.

12. **Offline document behavior is a placeholder, not an explanation.** With `OFFLINE_FALLBACK_ENABLED=true` and no explainer model configured, upload may return the message that text was extracted but no explainer is configured. That is useful for setup checks but does not satisfy the product's document-explanation flow. See `app/services/orchestration.py`.

### Configuration and deployment notes

- `SESSION_TTL_SECONDS` and `DOCUMENT_RETENTION_SECONDS` govern ephemeral data expiry. Data is process-local and disappears on restart; multiple workers will not share state.
- `ALLOWED_ORIGINS` defaults to `http://localhost:3000`. Production must set the exact frontend origin(s), comma-separated. `allow_credentials` is false. Wildcard origins should not be used casually.
- The server does not store the uploaded original on disk. It is read into memory (up to the configured cap) and sent to Evolus; extracted data remains in the in-memory session/cache until expiry.
- The environment example has blank secrets and identifiers. The reviewed folder showed `.env.example`; no populated `.env` was reviewed.
- `pytest` is included and `backend/tests/test_backend.py` exists, but these tests were not run for this audit.

## Endpoint inventory and frontend data contract

FastAPI also exposes `GET /docs` (Swagger UI), `GET /openapi.json`, and `GET /redoc`. The application upload API is `POST /docs`; it shares the path with Swagger UI but uses a different HTTP method.

| Method and path | Input | Successful response | Notes |
|---|---|---|---|
| `GET /health` | None | `{"status":"ok","evolus_configured":true/false}` | Reports whether an API key is set, not whether Evolus is reachable. |
| `POST /session` | JSON: `ui_lang`, `country`, `local_lang` | `session_id`, `expires_in_seconds` | Creates an in-memory session. |
| `POST /consult/{sid}/start` | None | `done`, `question`, `red_flag`, optional `urgent_message` | Starts with the English fixed question. Repeated start returns the current question. |
| `POST /consult/{sid}/answer` | JSON: either `{"answer":"…"}` or `{"skip":true}` | `done`, next `question` or `null`, red-flag fields | Answers are limited to 2,000 characters. Skips are recorded separately from answers. |
| `GET /consult/{sid}/summary` | None | `english`, `local_language`, `user_language`, `skipped`, `red_flag`, `disclaimer` | Can currently return a partial summary before consultation completion. |
| `POST /docs` | `multipart/form-data`: required `file`, required `session_id`, optional `ui_lang` | `doc_id`, `explanation`, `extracted`, `unreadable_parts`, `disclaimer` | Supports PDF/JPEG/PNG/WebP/HEIC; maximum is the lower of 20 MB and `MAX_UPLOAD_MB`. `ui_lang` is taken from the session. |
| `GET /docs/{doc_id}/explanation` | Query: `session_id` (required in practice) | `doc_id`, `explanation`, `disclaimer` | Missing session ID currently returns 404 even though OpenAPI presents it as optional. |
| `POST /docs/{doc_id}/chat` | JSON: `session_id`, `message` | `answer`, `urgent`, `disclaimer` | Message length 1–2,000 characters; document is scoped to that session. |

For errors, FastAPI generally returns JSON shaped like `{"detail":"…"}` with status codes such as 404 for unknown/expired session or document, 413 for oversized uploads, 415 for unsupported media types, 422 for invalid input, 429 for rate limit, 502 for upstream Evolus errors, and 503 for missing Evolus configuration.

### Example consultation sequence

```http
POST /session
Content-Type: application/json

{"ui_lang":"Urdu","country":"Germany","local_lang":"German"}
```

```json
{"session_id":"<uuid>","expires_in_seconds":3600}
```

```http
POST /consult/<uuid>/answer
Content-Type: application/json

{"answer":"I have had a headache for three days."}
```

The response is an `AnswerResult`, for example:

```json
{
  "done": false,
  "question": {
    "target": "duration",
    "question": "When did this start, and how long has it been going on?",
    "quick_options": [],
    "done": false,
    "red_flag": false
  },
  "red_flag": false,
  "urgent_message": null
}
```

The example illustrates the current contract; fixed fallback text is English even when `ui_lang` is Urdu.

### Example document upload

Send `multipart/form-data` with fields `file` and `session_id`. The successful response shape is:

```json
{
  "doc_id": "<uuid>",
  "explanation": "…",
  "extracted": {"sections": [], "unreadable_parts": []},
  "unreadable_parts": [],
  "disclaimer": "…"
}
```

Then use `GET /docs/{doc_id}/explanation?session_id=<uuid>` or send `POST /docs/{doc_id}/chat` with `{"session_id":"<uuid>","message":"What does this result mean?"}`.

## Environment variables and key handling

| Variable | Needed for | Where the value comes from |
|---|---|---|
| `EVOLUS_API_KEY` | Evolus agent chat, extractor, Summary Tool, Translator Tool | API key from the team's Evolus workspace. Keep only on the backend. |
| `EVOLUS_APP_ID` | Extractor and AI Tool REST calls | Evolus workspace Space/Application ID. |
| `EVOLUS_EXTRACTOR_AGENT_ID` | `POST /docs` | Agent ID for the Medical Document Reader extractor in Evolus. |
| `EVOLUS_EXTRACTOR_ID` | `POST /docs` | Extractor ID configured on that agent. |
| `EVOLUS_EXPLAINER_MODEL` | Initial document explanation and follow-up chat | Evolus model ID in `applicationId:agentId` format. |
| `EVOLUS_INTERVIEWER_MODEL` | Adaptive consultation questions | Evolus model ID in `applicationId:agentId` format. |
| `EVOLUS_TRANSLATE_TOOL_ENABLED` | Non-English summary translation | Boolean switch; translation also requires API key and App ID. |
| `ALLOWED_ORIGINS` | Browser CORS | Exact frontend origins, comma-separated. |
| `SESSION_TTL_SECONDS` | Session and cache lifetime | Integer seconds; default 3600. |
| `MAX_UPLOAD_MB` | Upload cap | Integer MB; hard cap remains 20 MB. |
| `MAX_QUESTIONS` | Consultation budget | Integer 4–50; default 10. |
| `EVOLUS_TIMEOUT_SECONDS` | Evolus calls | Seconds; default 45 (extractor enforces at least 90). |
| `OFFLINE_FALLBACK_ENABLED` | No-Evolus setup behavior | Boolean; default true. |
| `DOCUMENT_RETENTION_SECONDS` | Extracted text and document record retention | Integer seconds; bounded by session TTL. |

There is no `EVOLUS_SUMMARIZER_MODEL` variable in the current implementation. Summaries use the Evolus Summary AI Tool, then the Translator AI Tool. Fireworks/vLLM model credentials are configured in Evolus model settings and are not backend `.env` values in this architecture. Never put any Evolus or model key in frontend code or commit a populated `.env` file.

## Evolus integration inventory

- Agent chat: `POST https://api.evolus.ai/v1/chat/completions` with `Authorization: Bearer <EVOLUS_API_KEY>`; optional `X-Conversation-Id`; supports streaming for agent responses.
- Document extraction: `POST /api/v1/agents/{agentId}/json/{extractorId}/ask-file?useWebhook=false` with `X-ApiKey`, `X-Application-Id`, and multipart `file`.
- Consultation summary: `POST /api/v1/ai-tools/summarize/run` with `X-ApiKey`, `X-Application-Id`, and text/options.
- Translation: `POST /api/v1/ai-tools/translate/run` with `X-ApiKey`, `X-Application-Id`, target language, and formal style.
- Agent/model service roles in code: Document Explainer and Interviewer model IDs. The summary path is an Evolus AI Tool, not a third configured agent. The document extractor is configured by its agent and extractor IDs.
- The backend does not create Evolus workspace agents, extractors, or models. Those must exist in the workspace and their identifiers must be configured.

## Recommended order to close gaps

1. Localize the opening, mandatory, and fallback questions; add an explicit non-repeating fallback target list.
2. Make `session_id` a required query parameter for the explanation endpoint (or revise document lookup to match the intended frontend flow).
3. Validate extracted data against a defined schema and inspect file signatures in addition to MIME type.
4. Define the privacy/authentication model before public deployment; replace process-local storage and rate limiting if running multiple workers.
5. Treat emergency and medication-safety checks as limitations that require clinical/product review; do not present keyword matching or a regex as reliable safeguards.
6. Configure Evolus IDs and credentials in a local, uncommitted `.env`, then run the existing mocked tests and complete frontend-to-Evolus integration checks in a safe test environment.
