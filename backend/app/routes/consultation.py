import json
import re
from fastapi import APIRouter, HTTPException, Request
from app.routes.sessions import get_session
from app.schemas import AnswerResult, ConsultationAnswer, ConsultationSummary, Question
from app.services.safety import DISCLAIMER, URGENT_MESSAGE, has_emergency_sign

router = APIRouter(prefix="/consult", tags=["consultation"])
MANDATORY = [
    ("medications", "Are you currently taking any medications?"),
    ("allergies", "Do you have any allergies?"),
    ("known_conditions", "Do you have any known medical conditions?"),
]
OPENING = Question(target="chief_complaint", question="What is bothering you most right now?", quick_options=[])


def _safe_question(state, max_questions: int, ai: dict | None = None) -> Question:
    remaining_mandatory = [(target, prompt) for target, prompt in MANDATORY if target not in state.asked_targets and target not in state.skipped]
    if remaining_mandatory and state.question_count >= max(0, max_questions - len(remaining_mandatory)):
        target, prompt = remaining_mandatory[0]
        return Question(target=target, question=prompt, quick_options=["Yes", "No", "Not sure"])
    if ai:
        target = str(ai.get("target", "")).strip()
        question = str(ai.get("question", "")).strip()
        options = ai.get("quick_options", [])
        if target and question and target not in state.asked_targets and target not in state.skipped and target not in {item[0] for item in MANDATORY}:
            return Question(target=target[:80], question=question[:400], quick_options=[str(x)[:80] for x in options[:4]] if isinstance(options, list) else [])
    if state.question_count == 1 and "duration" not in state.asked_targets:
        return Question(target="duration", question="When did this start, and how long has it been going on?")
    if "severity" not in state.asked_targets:
        return Question(target="severity", question="How severe is it, and how is it affecting you?")
    return Question(target="associated_symptoms", question="What other symptoms have you noticed?")


def _parse_ai(raw: str) -> dict | None:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.I)
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        return None


@router.post("/{sid}/start", response_model=AnswerResult)
async def start(sid: str, request: Request):
    state = get_session(request, sid)
    if state.current_question:
        return AnswerResult(done=False, question=state.current_question, red_flag=state.red_flag, urgent_message=URGENT_MESSAGE if state.red_flag else None)
    state.current_question = OPENING.model_dump()
    state.question_count = 1
    state.asked_targets.append("chief_complaint")
    return AnswerResult(done=False, question=state.current_question)


@router.post("/{sid}/answer", response_model=AnswerResult)
async def answer(sid: str, body: ConsultationAnswer, request: Request):
    state = get_session(request, sid)
    if not state.current_question:
        raise HTTPException(status_code=409, detail="Start the consultation before answering.")
    if body.skip == bool(body.answer):
        raise HTTPException(status_code=422, detail="Provide one answer or set skip=true.")
    target = state.current_question["target"]
    answer_text = body.answer or ""
    if body.skip:
        state.skipped.append(target)
    else:
        state.answers.append({"target": target, "question": state.current_question["question"], "answer": answer_text})
        state.red_flag = state.red_flag or has_emergency_sign(answer_text)
    if target in {item[0] for item in MANDATORY}:
        state.asked_targets.append(target)
    state.current_question = None

    remaining = [item for item in MANDATORY if item[0] not in state.asked_targets and item[0] not in state.skipped]
    max_questions = request.app.state.settings.max_questions
    if not remaining and state.question_count >= max_questions:
        return AnswerResult(done=True, red_flag=state.red_flag, urgent_message=URGENT_MESSAGE if state.red_flag else None)

    ai_result = None
    # Give the adaptive interviewer up to one retry for malformed or unusable JSON.
    model = request.app.state.settings.evolus_interviewer_model
    if model and request.app.state.settings.evolus_api_key:
        prompt = ("Return only JSON with keys done, red_flag, target, question, quick_options. Ask one short symptom question, "
                  "never diagnose, and never ask a skipped or repeated target. Use the user's language. If not enough relevant questions remain, set done true.\n"
                  + json.dumps({"user_language": state.ui_lang, "transcript": state.answers, "skipped": state.skipped,
                                "questions_asked": state.question_count, "max_questions": request.app.state.settings.max_questions}, ensure_ascii=False))
        for attempt in range(2):
            try:
                raw, _ = await request.app.state.evolus.chat(model, prompt + ("\nReturn valid JSON only." if attempt else ""), json_only=True)
                ai_result = _parse_ai(raw)
                if ai_result and (ai_result.get("done") is True or (ai_result.get("target") and ai_result.get("question"))):
                    break
                ai_result = None
            except HTTPException:
                break
    if ai_result and ai_result.get("red_flag") is True:
        state.red_flag = True
    if ai_result and ai_result.get("done") is True and not remaining:
        return AnswerResult(done=True, red_flag=state.red_flag, urgent_message=URGENT_MESSAGE if state.red_flag else None)
    if state.question_count >= max_questions and remaining:
        # Reserve enough slots for required medical-history questions.
        target, prompt = remaining[0]
        next_question = Question(target=target, question=prompt, quick_options=["Yes", "No", "Not sure"])
    else:
        next_question = _safe_question(state, max_questions, ai_result)
    state.current_question = next_question.model_dump()
    state.asked_targets.append(next_question.target)
    state.question_count += 1
    return AnswerResult(done=False, question=next_question, red_flag=state.red_flag, urgent_message=URGENT_MESSAGE if state.red_flag else None)


@router.get("/{sid}/summary", response_model=ConsultationSummary)
async def summary(sid: str, request: Request):
    state = get_session(request, sid)
    if not state.answers and not state.skipped:
        raise HTTPException(status_code=409, detail="Complete or skip consultation questions before requesting a summary.")
    model = request.app.state.settings.evolus_summarizer_model
    english = "Consultation notes\n" + "\n".join(f"{x['target'].replace('_', ' ').title()}: {x['answer']}" for x in state.answers)
    if state.skipped:
        english += "\nNot provided: " + ", ".join(state.skipped)
    if model and request.app.state.settings.evolus_api_key:
        prompt = "Create a concise factual English doctor summary from these notes. Include complaint, timing, severity, symptoms, medications, allergies, conditions, and explicitly mark missing information. Do not diagnose or give treatment advice.\n" + json.dumps({"answers": state.answers, "skipped": state.skipped}, ensure_ascii=False)
        try:
            generated, _ = await request.app.state.evolus.chat(model, prompt)
            if generated.strip():
                english = generated.strip()
        except HTTPException:
            pass
    local = await request.app.state.evolus.translate(english, state.local_lang) if state.local_lang.casefold() not in {"english", "en"} and request.app.state.settings.evolus_api_key else english
    user = await request.app.state.evolus.translate(english, state.ui_lang) if state.ui_lang.casefold() not in {"english", "en"} and request.app.state.settings.evolus_api_key else english
    return ConsultationSummary(english=english, local_language=local, user_language=user, skipped=state.skipped, red_flag=state.red_flag, disclaimer=DISCLAIMER)
