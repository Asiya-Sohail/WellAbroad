import re

EMERGENCY_PATTERNS = [
    r"chest pain", r"difficulty breathing", r"can\'t breathe", r"cannot breathe",
    r"shortness of breath", r"dolor en el pecho", r"dificultad para respirar",
    r"douleur thoracique", r"difficulte a respirer", r"brustschmerzen", r"atemnot",
    r"\u0623\u0644\u0645 \u0641\u064a \u0627\u0644\u0635\u062f\u0631", r"\u0636\u064a\u0642 \u0627\u0644\u062a\u0646\u0641\u0633",
    r"severe bleeding", r"unconscious", r"loss of consciousness", r"stroke",
    r"seizure", r"suicid", r"no pulse", r"overdose",
]
DISCLAIMER = "WellAbroad explains information and helps prepare for a clinician. It does not diagnose or recommend medication changes."
URGENT_MESSAGE = "These symptoms may need urgent attention. Contact local emergency services or go to the nearest emergency department now."


def has_emergency_sign(text: str) -> bool:
    lowered = text.casefold()
    return any(re.search(pattern, lowered) for pattern in EMERGENCY_PATTERNS)


def clean_explanation(text: str) -> str:
    # Remove common unsafe directives if an agent response violates its instructions.
    unsafe = re.compile(r"(?im)^.*\b(start|stop|change|increase|decrease)\b.{0,70}\b(medication|medicine|dose|dosage|drug)\b.*(?:\n|$)")
    return unsafe.sub("", text).strip()


def safe_medical_prompt() -> str:
    return (
        "Use only the supplied facts. Do not diagnose, infer a condition, invent missing values, "
        "calculate a dose, recommend starting/stopping/changing medication, or provide unsupported reassurance. "
        "State clearly when information is missing or unclear."
    )
