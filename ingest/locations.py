"""Decide whether a free-text location is in Canada, and where."""

from __future__ import annotations

import re
from dataclasses import dataclass

PROVINCES = {
    "ON": ["ontario"],
    "BC": ["british columbia", "colombie-britannique"],
    "AB": ["alberta"],
    "QC": ["quebec", "québec"],
    "MB": ["manitoba"],
    "SK": ["saskatchewan"],
    "NS": ["nova scotia", "nouvelle-écosse"],
    "NB": ["new brunswick", "nouveau-brunswick"],
    "NL": ["newfoundland", "newfoundland and labrador"],
    "PE": ["prince edward island"],
    "YT": ["yukon"],
    "NT": ["northwest territories"],
    "NU": ["nunavut"],
}
PROVINCE_BY_NAME = {name: code for code, names in PROVINCES.items() for name in names}

# Cities that only exist (as tech hubs) in Canada, so a bare mention is enough.
UNAMBIGUOUS_CITIES = {
    "toronto": "ON", "mississauga": "ON", "markham": "ON", "brampton": "ON",
    "kitchener": "ON", "kanata": "ON", "oakville": "ON", "richmond hill": "ON",
    "vaughan": "ON", "north york": "ON", "scarborough": "ON", "etobicoke": "ON",
    "guelph": "ON", "thornhill": "ON",
    "montreal": "QC", "montréal": "QC", "laval": "QC", "gatineau": "QC",
    "quebec city": "QC", "québec city": "QC", "sherbrooke": "QC",
    "calgary": "AB", "edmonton": "AB",
    "burnaby": "BC", "surrey": "BC", "kelowna": "BC", "coquitlam": "BC",
    "winnipeg": "MB", "saskatoon": "SK", "regina": "SK", "fredericton": "NB",
    "moncton": "NB", "st. john's": "NL", "charlottetown": "PE",
}
# Real Canadian hubs that share a name with US/UK places; need a province or "Canada".
AMBIGUOUS_CITIES = {
    "vancouver": "BC", "victoria": "BC", "richmond": "BC", "waterloo": "ON",
    "ottawa": "ON", "london": "ON", "hamilton": "ON", "cambridge": "ON",
    "windsor": "ON", "kingston": "ON", "burlington": "ON", "halifax": "NS",
}

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
    "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
    "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
}
FOREIGN_MARKERS = re.compile(
    r"\b(usa|u\.s\.|united states|uk|united kingdom|india|germany|france|ireland|"
    r"netherlands|poland|mexico|brazil|australia|singapore|japan|china|israel|spain)\b"
)
REMOTE = re.compile(r"\b(remote|anywhere|distributed|work from home|télétravail)\b")
HYBRID = re.compile(r"\bhybrid\b")
SPLIT = re.compile(r"\s*(?:;|\||/|\bor\b|\n)\s*")


@dataclass(frozen=True)
class Location:
    city: str | None
    province: str | None
    remote: bool
    hybrid: bool = False


def _parse_one(raw: str, country_hint: str | None) -> Location | None:
    text = raw.strip()
    if not text:
        return None
    low = text.lower()
    remote = bool(REMOTE.search(low))
    hybrid = bool(HYBRID.search(low))
    says_canada = "canada" in low or re.search(r"\bCAN\b", text) is not None

    if FOREIGN_MARKERS.search(low) and not says_canada:
        return None

    # "City, XX" codes: a US state code means not Canada (Vancouver, WA), a province code means Canada.
    codes = re.findall(r",\s*([A-Z]{2})\b", text)
    province = next((c for c in codes if c in PROVINCES), None)
    if not province and any(c in US_STATES for c in codes) and not says_canada:
        return None
    if not province:
        province = next((code for name, code in PROVINCE_BY_NAME.items() if name in low), None)

    city = None
    for name, prov in {**UNAMBIGUOUS_CITIES, **AMBIGUOUS_CITIES}.items():
        if re.search(rf"\b{re.escape(name)}\b", low):
            if name in AMBIGUOUS_CITIES and not (province or says_canada or country_hint == "CA"):
                continue
            city = name.title() if name != "st. john's" else "St. John's"
            province = province or prov
            break

    if city or province:
        return Location(city, province, remote, hybrid)
    if says_canada or (remote and country_hint == "CA"):
        return Location(None, None, remote=remote or low.strip() == "canada", hybrid=hybrid)
    return None


def parse_locations(raw_locations: list[str], country_hint: str | None = None) -> list[Location]:
    """Canadian locations found in the given strings (empty if none are in Canada)."""
    found: list[Location] = []
    for raw in raw_locations:
        if not raw:
            continue
        whole = _parse_one(raw, country_hint)
        parts = [p for p in SPLIT.split(raw) if p.strip()]
        candidates = [whole] if len(parts) <= 1 else [_parse_one(p, country_hint) for p in parts]
        for loc in candidates:
            if loc and loc not in found:
                found.append(loc)
    return found


def work_model(locs: list[Location], hint: str | None = None) -> str | None:
    if hint in ("remote", "hybrid", "onsite"):
        return hint
    if not locs:
        return None
    if all(l.remote for l in locs):
        return "remote"
    if any(l.hybrid for l in locs):
        return "hybrid"
    if any(l.city for l in locs) and not any(l.remote for l in locs):
        return "onsite"
    return None
