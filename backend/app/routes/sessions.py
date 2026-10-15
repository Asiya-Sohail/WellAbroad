from fastapi import APIRouter, HTTPException, Request
from app.schemas import SessionCreate, SessionCreated

router = APIRouter(tags=["sessions"])


@router.post("/session", response_model=SessionCreated)
def create_session(body: SessionCreate, request: Request):
    store = request.app.state.store
    sid, _ = store.create(body.ui_lang, body.country, body.local_lang)
    return SessionCreated(session_id=sid, expires_in_seconds=store.ttl_seconds)


def get_session(request: Request, sid: str):
    session = request.app.state.store.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return session
