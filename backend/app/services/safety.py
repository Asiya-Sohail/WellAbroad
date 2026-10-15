import re

EMERGENCY_PATTERNS = [
    r"chest pain", r"difficulty breathing", r"can't breathe", r"cannot breathe",
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
