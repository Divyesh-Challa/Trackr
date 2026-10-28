"""Community-maintained internship lists on GitHub.

Postings are facts (company, title, link); we store them with the list credited as the
source and always link out to the employer's original posting.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

from ..http import PoliteClient
from ..models import RawPosting


@dataclass(frozen=True)
class ListSource:
    name: str        # value stored in jobs.source
    repo: str        # owner/name, for attribution
    url: str
    format: str      # simplify-json | markdown-table


LISTS = [
    # Covers Summer plus off-season (Fall / Winter / Spring) terms in its `terms` field.
    ListSource("simplify", "SimplifyJobs/Summer2027-Internships",
               "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json",
               "simplify-json"),
    ListSource("canadian-tech-internships", "negarprh/Canadian-Tech-Internships-2027",
               "https://raw.githubusercontent.com/negarprh/Canadian-Tech-Internships-2027/main/README.md",
               "markdown-table"),
    ListSource("canadian-internship-list", "Bobwillrule/Canadian-Internship-List",
               "https://raw.githubusercontent.com/Bobwillrule/Canadian-Internship-List/main/README.md",
               "markdown-table"),
]


def parse_simplify(items: list[dict]) -> list[RawPosting]:
    out = []
    for x in items:
        if not x.get("is_visible", True):
            continue
        posted = x.get("date_posted")
        out.append(RawPosting(
            source="simplify",
            source_id=x.get("id"),
            company_name=(x.get("company_name") or "").strip(),
            title=(x.get("title") or "").strip(),
            job_url=x.get("url") or "",
            locations=x.get("locations") or [],
            posted_at=datetime.fromtimestamp(posted, tz=timezone.utc) if posted else None,
            term_hints=[t for t in x.get("terms") or [] if t != "N/A"],
            category_hint=x.get("category"),
            active=bool(x.get("active")),
        ))
    return out


LINK = re.compile(r"\]\((https?://[^)\s]+)\)")
CLOSED = re.compile(r"closed|🔒", re.I)
MD_STRIP = re.compile(r"\*\*|__|`|<[^>]+>")
INNER_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def _cell_text(cell: str) -> str:
    return MD_STRIP.sub("", INNER_LINK.sub(r"\1", cell)).strip()


def _parse_date(text: str) -> datetime | None:
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%b %d %Y"):
        try:
            return datetime.strptime(text.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def parse_markdown_table(md: str, source: str) -> list[RawPosting]:
    """Rows of `| Company | Role | Location | Apply | Date |` tables. "↳" repeats the company."""
    out: list[RawPosting] = []
    company = ""
    header: list[str] | None = None
    for line in md.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            header = None
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        lowered = [c.lower() for c in cells]
        if "company" in lowered and any("role" in c or "position" in c for c in lowered):
            header = lowered
            continue
        if header is None or set(line) <= set("|-: "):
            continue
        row = dict(zip(header, cells))
        name = _cell_text(row.get("company", ""))
        if name and name not in ("↳", "↳"):
            company = name
        apply_cell = next((v for k, v in row.items() if "apply" in k or "link" in k), "")
        links = LINK.findall(apply_cell)
        closed = bool(CLOSED.search(apply_cell))
        # Badge links look like [![Apply](badge.svg)](https://employer/job); the last URL is the job.
        url = links[-1] if links else ""
        if not company or not url:
            continue
        role = _cell_text(next((v for k, v in row.items() if "role" in k or "position" in k), ""))
        date_cell = next((v for k, v in row.items() if "date" in k or "posted" in k), "")
        out.append(RawPosting(
            source=source,
            source_id=None,
            company_name=company,
            title=role,
            job_url=url,
            locations=[_cell_text(re.sub(r"</?br\s*/?>", "; ", row.get("location", ""), flags=re.I))],
            posted_at=_parse_date(_cell_text(date_cell)),
            active=not closed,
        ))
    return out


async def fetch_list(client: PoliteClient, src: ListSource) -> list[RawPosting]:
    if src.format == "simplify-json":
        return parse_simplify(await client.get_json(src.url))
    return parse_markdown_table(await client.get_text(src.url), src.name)
