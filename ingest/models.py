from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

# Higher wins when the same posting comes from several sources: a company's own ATS
# feed has the real description and is the ground truth for whether it's still open.
SOURCE_PRIORITY = {
    "greenhouse": 3,
    "lever": 3,
    "ashby": 3,
    "workable": 3,
    "smartrecruiters": 3,
    "recruitee": 3,
    "simplify": 2,
    "canadian-tech-internships": 1,
    "canadian-internship-list": 1,
}

ATS_SOURCES = {k for k, v in SOURCE_PRIORITY.items() if v == 3}


@dataclass
class Salary:
    min: int | None
    max: int | None
    currency: str = "CAD"
    period: str = "hour"  # hour | month | year


@dataclass
class RawPosting:
    """A posting as a source reports it, before filtering and normalization."""

    source: str
    source_id: str | None
    company_name: str
    title: str
    job_url: str
    locations: list[str]
    description_html: str | None = None
    posted_at: datetime | None = None
    company_domain: str | None = None
    company_size: str | None = None
    # Country the source states (ISO-2), used to resolve bare "Remote" locations.
    country_hint: str | None = None
    workplace_hint: str | None = None  # remote | hybrid | onsite
    term_hints: list[str] = field(default_factory=list)  # e.g. ["Summer 2027"]
    category_hint: str | None = None
    salary: Salary | None = None
    active: bool = True
    # Set when the board that produced this posting should be fetched for details later.
    detail_ref: str | None = None


@dataclass
class Board:
    company: str
    ats: str  # greenhouse | lever | ashby | workable | smartrecruiters | recruitee
    slug: str
    size: str | None = None  # startup | mid | large
    domain: str | None = None
