import json
import re
from fastapi import APIRouter, HTTPException, Request
from app.routes.sessions import get_session
from app.schemas import AnswerResult, ConsultationAnswer, ConsultationSummary, Question
from app.services.safety import DISCLAIMER, URGENT_MESSAGE, has_emergency_sign
from app.services.orchestration import interviewer_prompt, summarize_consultation
from app.services.translation import translate_summary

router = APIRouter(prefix="/consult", tags=["consultation"])
MANDATORY = [
    ("medications", "Are you currently taking any medications?"),
    ("allergies", "Do you have any allergies?"),
    ("known_conditions", "Do you have any known medical conditions?"),
]
OPENING = Question(target="chief_complaint", question="What is bothering you most right now?", quick_options=[])

LOCALIZED_PROMPTS = {
    "French": {
        "chief_complaint": "Qu'est-ce qui vous préoccupe le plus en ce moment ?",
        "duration": "Quand cela a-t-il commencé et depuis combien de temps cela dure-t-il ?",
        "severity": "Quelle est l'intensité de vos symptômes et quel effet ont-ils sur vous ?",
        "associated_symptoms": "Quels autres symptômes avez-vous remarqués ?",
        "medications": "Prenez-vous actuellement des médicaments ?",
        "allergies": "Avez-vous des allergies ?",
        "known_conditions": "Avez-vous des problèmes de santé connus ?",
    },
    "German": {
        "chief_complaint": "Was belastet Sie im Moment am meisten?",
        "duration": "Wann hat das begonnen und wie lange besteht es schon?",
        "severity": "Wie stark sind Ihre Beschwerden und wie beeinträchtigen sie Sie?",
        "associated_symptoms": "Welche anderen Symptome haben Sie bemerkt?",
        "medications": "Nehmen Sie derzeit Medikamente ein?",
        "allergies": "Haben Sie Allergien?",
        "known_conditions": "Sind bei Ihnen bekannte Erkrankungen vorhanden?",
    },
    "Spanish": {
        "chief_complaint": "¿Qué es lo que más le preocupa en este momento?",
        "duration": "¿Cuándo comenzó y cuánto tiempo lleva así?",
        "severity": "¿Qué intensidad tienen sus síntomas y cómo le afectan?",
        "associated_symptoms": "¿Qué otros síntomas ha notado?",
        "medications": "¿Está tomando algún medicamento actualmente?",
        "allergies": "¿Tiene alguna alergia?",
        "known_conditions": "¿Tiene alguna enfermedad conocida?",
    },
    "Urdu": {
        "chief_complaint": "اس وقت آپ کو سب سے زیادہ کیا پریشان کر رہا ہے؟",
        "duration": "یہ کب شروع ہوا اور کتنے عرصے سے جاری ہے؟",
        "severity": "آپ کی علامات کتنی شدید ہیں اور آپ کو کتنا متاثر کر رہی ہیں؟",
        "associated_symptoms": "آپ نے اور کون سی علامات محسوس کی ہیں؟",
        "medications": "کیا آپ اس وقت کوئی دوا لے رہے ہیں؟",
        "allergies": "کیا آپ کو کوئی الرجی ہے؟",
        "known_conditions": "کیا آپ کو کوئی معلوم طبی بیماری ہے؟",
    },
}


def _localized_prompt(target: str, language: str, fallback: str) -> str:
    return LOCALIZED_PROMPTS.get(language, {}).get(target, fallback)


def _quick_options(language: str) -> list[str]:
    return {
        "French": ["Oui", "Non", "Pas sûr"],
        "German": ["Ja", "Nein", "Nicht sicher"],
        "Spanish": ["Sí", "No", "No estoy seguro"],
        "Urdu": ["ہاں", "نہیں", "یقین نہیں"],
    }.get(language, ["Yes", "No", "Not sure"])


def _safe_question(state, max_questions: int, ai: dict | None = None) -> Question:
    remaining_mandatory = [
        (target, _localized_prompt(target, state.preferred_lang, prompt))
        for target, prompt in MANDATORY
        if target not in state.asked_targets and target not in state.skipped
    ]
    if remaining_mandatory and state.question_count >= max(0, max_questions - len(remaining_mandatory)):
        target, prompt = remaining_mandatory[0]
        return Question(target=target, question=prompt, quick_options=_quick_options(state.preferred_lang))
    if ai:
        target = str(ai.get("target", "")).strip()
        question = str(ai.get("question", "")).strip()
        options = ai.get("quick_options", [])
        if target and question and target not in state.asked_targets and target not in state.skipped and target not in {item[0] for item in MANDATORY}:
            return Question(target=target[:80], question=question[:400], quick_options=[str(x)[:80] for x in options[:4]] if isinstance(options, list) else [])
    if state.question_count == 1 and "duration" not in state.asked_targets:
        return Question(target="duration", question=_localized_prompt("duration", state.preferred_lang, "When did this start, and how long has it been going on?"))
    if "severity" not in state.asked_targets:
        return Question(target="severity", question=_localized_prompt("severity", state.preferred_lang, "How severe is it, and how is it affecting you?"))
    return Question(target="associated_symptoms", question=_localized_prompt("associated_symptoms", state.preferred_lang, "What other symptoms have you noticed?"))


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
    opening = _localized_prompt("chief_complaint", state.preferred_lang, OPENING.question)
    state.current_question = Question(target=OPENING.target, question=opening, quick_options=[]).model_dump()
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
        prompt = interviewer_prompt({"user_language": state.preferred_lang, "transcript": state.answers, "skipped": state.skipped, "questions_asked": state.question_count}, state.preferred_lang, request.app.state.settings.max_questions)
        for attempt in range(2):
            try:
                raw, _ = await request.app.state.evolus.chat(model, prompt + ("\nReturn valid JSON only." if attempt else ""), json_only=True, stream=True)
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
        next_question = Question(target=target, question=_localized_prompt(target, state.preferred_lang, prompt), quick_options=_quick_options(state.preferred_lang))
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
    try:
        english = await summarize_consultation(request.app.state.evolus, request.app.state.settings, state.answers, state.skipped)
        local = await translate_summary(request.app.state.evolus, request.app.state.settings, english, state.local_lang)
        user = await translate_summary(request.app.state.evolus, request.app.state.settings, english, state.ui_lang)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ConsultationSummary(english=english, local_language=local, user_language=user, skipped=state.skipped, red_flag=state.red_flag, disclaimer=DISCLAIMER)
