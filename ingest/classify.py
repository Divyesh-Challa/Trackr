"""Rule-based tagging: is it a student role, which co-op terms, which disciplines."""

from __future__ import annotations

import re
from datetime import date

STUDENT_ROLE = re.compile(
    r"\b(intern|interns|internship|internships|co-?op|coop|stagiaire|stage|work[- ]term|"
    r"student|summer analyst|summer associate|apprenti)\b",
    re.I,
)
# "Stage" in English titles usually means a company stage, so require a French context.
ENGLISH_STAGE = re.compile(r"\b(early|late|growth|seed)[- ]stage\b", re.I)
STRONG_STUDENT = re.compile(
    r"\b(intern|interns|internship|internships|co-?op|coop|stagiaire|work[- ]term)\b", re.I
)
NOT_STUDENT = re.compile(
    r"\b(senior|sr\.?|staff|principal|director|head of|vp|vice president|architect|"
    r"recruiter|recruiting|talent acquisition|university relations)\b",
    re.I,
)
# Only disqualifying without an explicit intern/co-op word ("Student Success Manager"),
# since "Product Manager Intern" is a real internship.
NOT_STUDENT_WEAK = re.compile(r"\b(manager|lead|coordinator|advisor|counsellor)\b", re.I)
COOP = re.compile(r"\b(co-?op|coop|work[- ]term|stagiaire)\b", re.I)

SEASONS = {
    "winter": "W", "hiver": "W",
    "summer": "S", "spring": "S", "été": "S", "ete": "S", "printemps": "S",
    "fall": "F", "autumn": "F", "automne": "F",
}
SEASON_TERM = re.compile(
    r"\b(winter|hiver|summer|spring|été|ete|printemps|fall|autumn|automne)\s*[-'’,]?\s*(20\d\d)\b",
    re.I,
)
MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3, "april": 4,
    "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7, "august": 8, "aug": 8,
    "september": 9, "sept": 9, "sep": 9, "october": 10, "oct": 10, "november": 11,
    "nov": 11, "december": 12, "dec": 12, "janvier": 1, "mai": 5, "septembre": 9,
}
# "starting May 2027", "(January 2027 - April 2027)". Only start-ish months count.
MONTH_TERM = re.compile(
    r"\b(?:start(?:ing|s)?\s+(?:in\s+)?|beginning\s+|from\s+|\()?"
    r"(january|janvier|jan|may|mai|september|septembre|sept|sep)\.?\s+(20\d\d)\b",
    re.I,
)


def is_student_role(title: str) -> bool:
    if not STUDENT_ROLE.search(title) or NOT_STUDENT.search(title):
        return False
    strong = STRONG_STUDENT.search(title) is not None
    if not strong and (NOT_STUDENT_WEAK.search(title) or ENGLISH_STAGE.search(title)):
        return False
    return True


def job_type(title: str, description: str = "") -> str:
    return "coop" if COOP.search(title) or COOP.search(description[:1500]) else "internship"


def _month_to_term(month: int, year: int) -> str:
    if month <= 3:
        return f"W{year}"
    if month <= 8:
        return f"S{year}"
    return f"F{year}"


def extract_terms(*texts: str) -> list[str]:
    """Co-op terms mentioned in the texts, as sorted codes like ["W2027", "S2027"]."""
    found: set[str] = set()
    for text in texts:
        if not text:
            continue
        for season, year in SEASON_TERM.findall(text):
            found.add(f"{SEASONS[season.lower()]}{year}")
        for month, year in MONTH_TERM.findall(text):
            found.add(_month_to_term(MONTHS[month.lower().rstrip('.')], int(year)))
    return sorted(found, key=term_sort_key)


def term_sort_key(term: str) -> tuple[int, int]:
    return int(term[1:]), {"W": 0, "S": 1, "F": 2}[term[0]]


def term_start(term: str) -> date:
    return date(int(term[1:]), {"W": 1, "S": 5, "F": 9}[term[0]], 1)


def upcoming_terms(terms: list[str], today: date) -> list[str]:
    """Terms that haven't started yet (a term already underway is closed to applicants)."""
    return [t for t in terms if term_start(t) > today]


DISCIPLINES: list[tuple[str, re.Pattern[str]]] = [
    ("hardware", re.compile(
        r"\b(hardware|electrical|electronics?|asic|fpga|rtl|vlsi|silicon|analog|circuit|pcb|"
        r"firmware|embedded|robotics|mechatronics|verification|validation engineer|"
        r"semiconductor|photonics|rf\b|power systems)", re.I)),
    ("data_ml", re.compile(
        r"\b(data|machine learning|ml\b|ai\b|a\.i\.|artificial intelligence|analytics|"
        r"scientist|research|nlp|computer vision|deep learning|llm|statistic)", re.I)),
    ("software", re.compile(
        r"\b(software|developer|development|programmer|backend|back-end|front[- ]?end|"
        r"full[- ]?stack|mobile|ios|android|web|devops|sre|site reliability|platform|cloud|"
        r"qa\b|quality assurance|test automation|sdet|engineering intern|game|computer science|"
        r"cs\b|app(lication)? dev)", re.I)),
    ("security_it", re.compile(
        r"\b(security|cyber|it\b|information technology|infrastructure|network|"
        r"systems administrator|helpdesk|help desk|technical support)", re.I)),
    ("product_design", re.compile(
        r"\b(product manag|product owner|ux|ui\b|user experience|designer|design intern)", re.I)),
    ("quant", re.compile(r"\b(quant|quantitative|trading|trader|actuar)", re.I)),
    ("mechanical", re.compile(
        r"\b(mechanical|civil|chemical|manufacturing|process engineer|aerospace|structural)", re.I)),
    ("business", re.compile(
        r"\b(business|marketing|sales|finance|financial|accounting|accountant|operations|"
        r"human resources|hr\b|people|legal|communications|audit|tax\b|strategy|consult)", re.I)),
]

CATEGORY_HINTS = {
    "software": "software",
    "hardware": "hardware",
    "ai/ml/data": "data_ml",
    "data science, ai & machine learning": "data_ml",
    "product": "product_design",
    "quant": "quant",
}


def disciplines(title: str, category_hint: str | None = None) -> list[str]:
    tags = [name for name, pattern in DISCIPLINES if pattern.search(title)]
    hinted = CATEGORY_HINTS.get((category_hint or "").lower())
    if hinted and hinted not in tags:
        tags.insert(0, hinted)
    return tags or ["other"]
