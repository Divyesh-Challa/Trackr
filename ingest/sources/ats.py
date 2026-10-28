"""Public job-board APIs that companies publish through their applicant tracking system.

Each fetcher returns every posting on the board; filtering to Canadian student roles
happens later in one place (pipeline.py).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from ..http import PoliteClient
from ..models import Board, RawPosting, Salary


def _iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _epoch_ms(value: int | None) -> datetime | None:
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc) if value else None


def _base(board: Board, **kw) -> RawPosting:
    return RawPosting(source=board.ats, company_name=board.company, company_size=board.size,
                      company_domain=board.domain, **kw)


async def greenhouse(client: PoliteClient, board: Board) -> list[RawPosting]:
    data = await client.get_json(
        f"https://boards-api.greenhouse.io/v1/boards/{board.slug}/jobs", params={"content": "true"}
    )
    out = []
    for j in data.get("jobs", []):
        locations = [(j.get("location") or {}).get("name") or ""]
        locations += [o.get("location") or o.get("name") or "" for o in j.get("offices") or []]
        salary = None
        for meta in j.get("metadata") or []:
            value = meta.get("value")
            if meta.get("value_type") == "currency_range" and isinstance(value, dict):
                try:
                    lo, hi = float(value["min_value"]), float(value["max_value"])
                except (KeyError, TypeError, ValueError):
                    continue
                period = "hour" if hi < 300 else "year"
                salary = Salary(round(lo), round(hi), value.get("unit") or "CAD", period)
                break
        out.append(_base(
            board,
            source_id=str(j["id"]),
            title=j.get("title", ""),
            job_url=j.get("absolute_url", ""),
            locations=locations,
            description_html=j.get("content"),
            posted_at=_iso(j.get("first_published") or j.get("updated_at")),
            salary=salary,
        ))
    return out


LEVER_PERIODS = {"per-hour-wage": "hour", "per-month-salary": "month", "per-year-salary": "year"}


async def lever(client: PoliteClient, board: Board) -> list[RawPosting]:
    data = await client.get_json(f"https://api.lever.co/v0/postings/{board.slug}", params={"mode": "json"})
    out = []
    for j in data:
        cats = j.get("categories") or {}
        parts = [j.get("description") or ""]
        for section in j.get("lists") or []:
            parts.append(f"<h3>{section.get('text', '')}</h3><ul>{section.get('content', '')}</ul>")
        parts.append(j.get("additional") or "")
        salary = None
        sr = j.get("salaryRange") or {}
        if sr.get("min") or sr.get("max"):
            salary = Salary(sr.get("min"), sr.get("max"), sr.get("currency") or "CAD",
                            LEVER_PERIODS.get(sr.get("interval", ""), "year"))
        out.append(_base(
            board,
            source_id=j["id"],
            title=j.get("text", ""),
            job_url=j.get("hostedUrl", ""),
            locations=cats.get("allLocations") or [cats.get("location") or ""],
            description_html="".join(parts),
            posted_at=_epoch_ms(j.get("createdAt")),
            country_hint=j.get("country"),
            workplace_hint=(j.get("workplaceType") or "").lower() or None,
            category_hint=cats.get("team"),
            salary=salary,
        ))
    return out


ASHBY_PERIODS = {"HOUR": "hour", "MONTH": "month", "YEAR": "year"}


def _ashby_country(address: dict | None) -> str | None:
    country = ((address or {}).get("postalAddress") or {}).get("addressCountry") or ""
    return "CA" if country.lower() in ("canada", "ca") else (country[:2].upper() or None)


async def ashby(client: PoliteClient, board: Board) -> list[RawPosting]:
    data = await client.get_json(
        f"https://api.ashbyhq.com/posting-api/job-board/{board.slug}",
        params={"includeCompensation": "true"},
    )
    out = []
    for j in data.get("jobs", []):
        if j.get("isListed") is False:
            continue
        locations = [j.get("location") or ""]
        countries = {_ashby_country(j.get("address"))}
        for sec in j.get("secondaryLocations") or []:
            locations.append(sec.get("location") or "")
            countries.add(_ashby_country(sec.get("address")))
        salary = None
        for comp in (j.get("compensation") or {}).get("summaryComponents") or []:
            if comp.get("compensationType") == "Salary" and (comp.get("minValue") or comp.get("maxValue")):
                salary = Salary(
                    comp.get("minValue") and round(comp["minValue"]),
                    comp.get("maxValue") and round(comp["maxValue"]),
                    comp.get("currencyCode") or "CAD",
                    ASHBY_PERIODS.get(re.split(r"[\s_]+", comp.get("interval") or "")[-1].upper(), "year"),
                )
                break
        workplace = (j.get("workplaceType") or "").lower()
        out.append(_base(
            board,
            source_id=j["id"],
            title=j.get("title", ""),
            job_url=j.get("jobUrl", ""),
            locations=locations,
            description_html=j.get("descriptionHtml"),
            posted_at=_iso(j.get("publishedAt")),
            country_hint="CA" if "CA" in countries else None,
            workplace_hint={"remote": "remote", "hybrid": "hybrid", "onsite": "onsite"}.get(workplace),
            category_hint=j.get("department"),
            salary=salary,
        ))
    return out


async def workable(client: PoliteClient, board: Board) -> list[RawPosting]:
    data = await client.get_json(
        f"https://apply.workable.com/api/v1/widget/accounts/{board.slug}", params={"details": "true"}
    )
    out = []
    for j in data.get("jobs", []):
        locs = j.get("locations") or [{"city": j.get("city"), "region": j.get("state"),
                                       "countryCode": j.get("country")}]
        locations = [", ".join(filter(None, [l.get("city"), l.get("region"), l.get("country") or l.get("countryCode")]))
                     for l in locs]
        is_ca = any((l.get("countryCode") or "").upper() == "CA" or l.get("country") == "Canada" for l in locs)
        out.append(_base(
            board,
            source_id=j.get("shortcode"),
            title=j.get("title", ""),
            job_url=j.get("url") or j.get("shortlink") or "",
            locations=locations,
            description_html=j.get("description"),
            posted_at=_iso(j.get("published_on") or j.get("created_at")),
            country_hint="CA" if is_ca else None,
            workplace_hint="remote" if j.get("telecommuting") else None,
        ))
    return out


async def smartrecruiters(client: PoliteClient, board: Board) -> list[RawPosting]:
    """Lists Canadian postings only; descriptions are fetched later for the ones we keep."""
    out, offset = [], 0
    while True:
        data = await client.get_json(
            f"https://api.smartrecruiters.com/v1/companies/{board.slug}/postings",
            params={"limit": 100, "offset": offset, "country": "ca"},
        )
        for j in data.get("content", []):
            loc = j.get("location") or {}
            out.append(RawPosting(
                source=board.ats,
                company_name=(j.get("company") or {}).get("name") or board.company,
                company_size=board.size,
                company_domain=board.domain,
                source_id=str(j["id"]),
                title=j.get("name", ""),
                job_url=f"https://jobs.smartrecruiters.com/{board.slug}/{j['id']}",
                locations=[", ".join(filter(None, [loc.get("city"), loc.get("region"), "Canada"]))],
                posted_at=_iso(j.get("releasedDate")),
                country_hint="CA",
                workplace_hint="remote" if loc.get("remote") else ("hybrid" if loc.get("hybrid") else None),
                detail_ref=j.get("ref"),
            ))
        offset += 100
        if offset >= data.get("totalFound", 0) or offset >= 1000:
            return out


async def smartrecruiters_detail(client: PoliteClient, posting: RawPosting) -> None:
    if not posting.detail_ref:
        return
    data = await client.get_json(posting.detail_ref)
    sections = ((data.get("jobAd") or {}).get("sections") or {}).values()
    posting.description_html = "".join(
        f"<h3>{s.get('title', '')}</h3>{s.get('text', '')}" for s in sections if s.get("text")
    )
    posting.job_url = data.get("postingUrl") or posting.job_url


async def recruitee(client: PoliteClient, board: Board) -> list[RawPosting]:
    data = await client.get_json(f"https://{board.slug}.recruitee.com/api/offers/")
    out = []
    for j in data.get("offers", []):
        out.append(_base(
            board,
            source_id=str(j.get("id")),
            title=j.get("title", ""),
            job_url=j.get("careers_url", ""),
            locations=[j.get("location") or ", ".join(filter(None, [j.get("city"), j.get("country")]))],
            description_html=(j.get("description") or "") + (j.get("requirements") or ""),
            posted_at=_iso(j.get("published_at") or j.get("created_at")),
            country_hint=(j.get("country_code") or "").upper() or None,
            workplace_hint="remote" if j.get("remote") else ("hybrid" if j.get("hybrid") else None),
        ))
    return out


FETCHERS = {
    "greenhouse": greenhouse,
    "lever": lever,
    "ashby": ashby,
    "workable": workable,
    "smartrecruiters": smartrecruiters,
    "recruitee": recruitee,
}
