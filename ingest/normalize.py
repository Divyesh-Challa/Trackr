"""URL identity, description cleanup, and stated-pay parsing."""

from __future__ import annotations

import html
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from markdownify import markdownify

from .models import Salary

TRACKING_PARAMS = re.compile(
    r"^(utm_.*|ref|referrer|source|src|gh_src|lever-origin|lever-source.*|"
    r"trk|trackingid|refid|mode|iis|iisn|ccuid|jobpipeline)$",
    re.I,
)
UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"


def clean_url(url: str) -> str:
    """The posting URL without tracking parameters (what we link users to)."""
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
             if not TRACKING_PARAMS.match(k)]
    return urlunsplit((parts.scheme or "https", parts.netloc, parts.path, urlencode(query), ""))


def canonical_key(url: str) -> str:
    """A stable identity for a posting, shared by every source that links to it.

    ATS job ids are globally unique, so "greenhouse:123" matches whether the link is to
    boards.greenhouse.io, job-boards.greenhouse.io, or a company page with ?gh_jid=123.
    """
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.")
    path = parts.path.rstrip("/")
    query = dict(parse_qsl(parts.query))

    if "gh_jid" in query:
        return f"greenhouse:{query['gh_jid']}"
    if host.endswith("greenhouse.io") and (m := re.search(r"/jobs/(\d+)", path)):
        return f"greenhouse:{m.group(1)}"
    if host.endswith("lever.co") and (m := re.search(rf"/({UUID})", path, re.I)):
        return f"lever:{m.group(1).lower()}"
    if host.endswith("ashbyhq.com") and (m := re.search(rf"/({UUID})", path, re.I)):
        return f"ashby:{m.group(1).lower()}"
    if host.endswith("workable.com") and (m := re.search(r"/j/([0-9A-Z]+)", path, re.I)):
        return f"workable:{m.group(1).upper()}"
    if host.endswith("smartrecruiters.com") and (m := re.search(r"/(\d{6,})", path)):
        return f"smartrecruiters:{m.group(1)}"
    if host.endswith("myworkdayjobs.com") and (m := re.search(r"_([A-Za-z0-9-]+)$", path)):
        tenant = host.split(".")[0]
        return f"workday:{tenant}:{m.group(1).lower()}"
    if host.endswith("recruitee.com") and (m := re.search(r"/o/([^/]+)", path)):
        return f"recruitee:{host.split('.')[0]}:{m.group(1).lower()}"

    kept = sorted((k, v) for k, v in query.items() if not TRACKING_PARAMS.match(k))
    path = re.sub(r"/(apply|application)$", "", path, flags=re.I)
    return f"{host}{path}" + (f"?{urlencode(kept)}" if kept else "")


def html_to_markdown(raw: str | None, max_len: int = 30_000) -> str | None:
    if not raw or not raw.strip():
        return None
    # Greenhouse returns entity-escaped HTML ("&lt;p&gt;").
    if "&lt;" in raw and "<" not in raw:
        raw = html.unescape(raw)
    md = markdownify(raw, heading_style="ATX", bullets="-", strip=["img", "script", "style", "iframe"])
    md = re.sub(r"\n\s*\n\s*\n+", "\n\n", md).replace(" ", " ").strip()
    if len(md) < 40:
        return None
    return md[:max_len]


AMOUNT = r"(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)\s*(k|K)?"
PAY_RANGE = re.compile(
    rf"(?P<cur1>CA\$|C\$|US\$|\$)\s?{AMOUNT}\s*(?P<code1>CAD|USD)?\s*(?:-|–|—|to)\s*"
    rf"(?:CA\$|C\$|US\$|\$)?\s?(?P<max>\d{{1,3}}(?:,\d{{3}})+|\d+(?:\.\d{{1,2}})?)\s*(?P<k2>k|K)?\s*"
    r"(?P<code2>CAD|USD)?\s*(?:/|per|an|a)?\s*(?P<period>hour|hr|year|yr|annum|annually|month|mo)\b",
    re.I,
)
PERIODS = {"hour": "hour", "hr": "hour", "year": "year", "yr": "year", "annum": "year",
           "annually": "year", "month": "month", "mo": "month"}
SANE = {"hour": (14, 200), "month": (2_000, 25_000), "year": (25_000, 400_000)}


def _num(value: str, k: str | None) -> float:
    n = float(value.replace(",", ""))
    return n * 1000 if k else n


def parse_stated_pay(text: str | None) -> Salary | None:
    """Pay range written in the posting, e.g. "$28 - $35 CAD per hour". Never guesses."""
    if not text:
        return None
    for m in PAY_RANGE.finditer(text):
        period = PERIODS[m.group("period").lower()]
        lo = _num(m.group(2), m.group(3))
        hi = _num(m.group("max"), m.group("k2") or m.group(3))
        bounds = SANE[period]
        if not (bounds[0] <= lo <= hi <= bounds[1]):
            continue
        trailing = text[m.end():m.end() + 8].upper()
        is_usd = "US" in m.group("cur1").upper() or "USD" in (
            (m.group("code1") or "") + (m.group("code2") or "") + trailing
        ).upper()
        return Salary(round(lo), round(hi), "USD" if is_usd else "CAD", period)
    return None
