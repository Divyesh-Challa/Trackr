"""Turn raw postings from every source into deduplicated `jobs` rows."""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from .classify import disciplines, extract_terms, is_student_role, job_type, term_sort_key, upcoming_terms
from .locations import Location, parse_locations, work_model
from .models import SOURCE_PRIORITY, RawPosting
from .normalize import canonical_key, clean_url, html_to_markdown, parse_stated_pay

# Postings without a stated term are dropped once they're this old.
MAX_AGE_DAYS = 120


@dataclass
class Normalized:
    records: list[dict]
    closed_keys: set[str]
    kept_by_source: dict[str, int] = field(default_factory=dict)


def _format_location(loc: Location) -> str:
    place = ", ".join(filter(None, [loc.city, loc.province])) or "Canada"
    if loc.remote and not loc.city:
        return "Remote (Canada)"
    return f"{place} (Remote)" if loc.remote else place


def to_record(p: RawPosting, today: date) -> dict | None:
    """The `jobs` row for a posting, or None if it isn't an open Canadian student role."""
    p.title = html.unescape(p.title).strip()
    p.company_name = html.unescape(p.company_name).strip()
    if not p.title or not p.job_url or not is_student_role(p.title):
        return None
    locs = parse_locations(p.locations, p.country_hint)
    if not locs:
        return None

    description = html_to_markdown(p.description_html)
    # Terms named in the title or by the list are authoritative; if they've all started,
    # the posting is stale. Description mentions are only used to fill gaps, since they
    # can be unrelated ("founded in summer 2019").
    stated = extract_terms(p.title, *p.term_hints)
    if stated:
        terms = upcoming_terms(stated, today)
        if not terms:
            return None
    else:
        terms = upcoming_terms(extract_terms((description or "")[:4000]), today)
        if not terms and p.posted_at and p.posted_at.date() < today - timedelta(days=MAX_AGE_DAYS):
            return None

    salary = p.salary or parse_stated_pay(description)
    named = [l for l in locs if l.city or l.province]
    primary = named[0] if named else locs[0]
    return {
        "source": p.source,
        "source_id": p.source_id,
        "company_name": p.company_name.strip(),
        "company_domain": p.company_domain,
        "company_size": p.company_size,
        "title": p.title.strip(),
        "locations": list(dict.fromkeys(_format_location(l) for l in locs)),
        "city": primary.city,
        "province": primary.province,
        "work_model": work_model(locs, p.workplace_hint),
        "job_type": job_type(p.title, description or ""),
        "term": terms[0] if terms else None,
        "terms": terms,
        "disciplines": disciplines(p.title, p.category_hint),
        "job_url": clean_url(p.job_url),
        "job_url_canonical": canonical_key(p.job_url),
        "description_md": description,
        "salary_min": salary.min if salary else None,
        "salary_max": salary.max if salary else None,
        "salary_currency": salary.currency if salary else "CAD",
        "salary_period": salary.period if salary else None,
        "salary_source": "posted" if salary else None,
        "posted_at": p.posted_at.isoformat() if p.posted_at else None,
        "deadline_at": None,
    }


def _rank(r: dict) -> tuple:
    return (SOURCE_PRIORITY.get(r["source"], 0), r["description_md"] is not None, r["posted_at"] or "")


def merge(records: list[dict]) -> dict:
    """Combine one posting's records from several sources; the best source wins ties."""
    records = sorted(records, key=_rank, reverse=True)
    best = dict(records[0])
    terms = sorted({t for r in records for t in r["terms"]}, key=term_sort_key)
    best["terms"] = terms
    best["term"] = terms[0] if terms else None
    for key in ("description_md", "company_size", "company_domain", "work_model"):
        best[key] = best[key] or next((r[key] for r in records if r[key]), None)
    if not best["salary_source"]:
        paid = next((r for r in records if r["salary_source"] == "posted"), None)
        if paid:
            for key in ("salary_min", "salary_max", "salary_currency", "salary_period", "salary_source"):
                best[key] = paid[key]
    dates = [r["posted_at"] for r in records if r["posted_at"]]
    best["posted_at"] = min(dates) if dates else None
    best["disciplines"] = list(dict.fromkeys(d for r in records for d in r["disciplines"] if d != "other")) or ["other"]
    return best


def _listing_key(r: dict) -> tuple:
    title = re.sub(r"[^a-z0-9]+", " ", r["title"].lower()).strip()
    return (r["company_name"].lower(), title, r["city"], r["province"], tuple(r["terms"]))


def collapse_reposts(records: list[dict]) -> list[dict]:
    """Companies often post one role under several requisition ids (same title, city and
    term). Show it once, keeping the best-sourced record."""
    best: dict[tuple, dict] = {}
    for r in records:
        key = _listing_key(r)
        if key not in best or _rank(r) > _rank(best[key]):
            best[key] = r
    return list(best.values())


def normalize(postings: list[RawPosting], today: date | None = None) -> Normalized:
    today = today or datetime.now(timezone.utc).date()
    groups: dict[str, list[dict]] = {}
    closed: set[str] = set()
    for p in postings:
        if not p.active:
            if p.job_url:
                closed.add(canonical_key(p.job_url))
            continue
        record = to_record(p, today)
        if record:
            groups.setdefault(record["job_url_canonical"], []).append(record)

    merged = collapse_reposts([merge(g) for g in groups.values()])
    kept: dict[str, int] = {}
    for r in merged:
        kept[r["source"]] = kept.get(r["source"], 0) + 1
    # A list may still mark a posting closed after its ATS reopened it; the live feed wins.
    return Normalized(merged, closed - groups.keys(), kept)
