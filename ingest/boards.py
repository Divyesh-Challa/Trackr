"""Which company job boards to scan.

Two inputs, merged every run:
  * boards.yaml: curated and YC-discovered boards (refresh with `python -m ingest.discover`)
  * boards mined from the apply links in this run's GitHub lists, so any company that
    posts one internship to a list gets its whole board scanned for more.
"""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import yaml

from .models import Board, RawPosting

BOARDS_FILE = Path(__file__).with_name("boards.yaml")
SEEDS_FILE = Path(__file__).with_name("seeds.yaml")

# Separate boards for interns or one country list few roles even at big companies.
SUB_BOARD = re.compile(r"(universit|intern|campus|student|early|grad|canada|careers?$|jobs$)", re.I)

# Path segments that are part of the ATS's own routes, never a company slug.
RESERVED = {"embed", "job_app", "api", "jobs", "v1", "o", "j", "careers", "en", "en-us"}


def board_from_url(url: str, company: str) -> Board | None:
    parts = urlsplit(url)
    host = parts.netloc.lower().removeprefix("www.")
    segs = [s for s in parts.path.split("/") if s]
    slug = None
    ats = None

    if host in ("boards.greenhouse.io", "job-boards.greenhouse.io", "boards.eu.greenhouse.io"):
        ats = "greenhouse"
        qs = parse_qs(parts.query)
        slug = qs.get("for", [None])[0] or (segs[0] if segs else None)
    elif host == "jobs.lever.co":
        ats, slug = "lever", segs[0] if segs else None
    elif host == "jobs.ashbyhq.com":
        ats, slug = "ashby", segs[0] if segs else None
    elif host == "apply.workable.com":
        ats, slug = "workable", segs[0] if segs else None
    elif host in ("jobs.smartrecruiters.com", "careers.smartrecruiters.com"):
        ats, slug = "smartrecruiters", segs[0] if segs else None
    elif host.endswith(".recruitee.com") and host.count(".") == 2:
        ats, slug = "recruitee", host.split(".")[0]

    if not ats or not slug or slug.lower() in RESERVED or not re.fullmatch(r"[A-Za-z0-9._-]+", slug):
        return None
    if ats in ("greenhouse", "lever", "ashby", "workable"):
        slug = slug.lower()
    return Board(company=company, ats=ats, slug=slug)


def load_boards(path: Path = BOARDS_FILE) -> list[Board]:
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text()) or {}
    return [Board(**b) for b in data.get("boards", [])]


def merge_boards(*groups: list[Board]) -> list[Board]:
    """First occurrence wins, so curated entries keep their company name and size."""
    seen: dict[tuple[str, str], Board] = {}
    for group in groups:
        for b in group:
            seen.setdefault((b.ats, b.slug.lower()), b)
    return list(seen.values())


def company_key(name: str) -> str:
    return re.sub(r"\b(inc|ltd|llc|corp|corporation|co|group|sa)\b|[^a-z0-9]", "", name.lower())


def known_sizes() -> dict[str, str]:
    """Company size by normalized name, from seeds.yaml and boards.yaml."""
    seeds = yaml.safe_load(SEEDS_FILE.read_text()) if SEEDS_FILE.exists() else {}
    sizes = {company_key(c["name"]): c["size"] for c in seeds.get("companies", []) if c.get("size")}
    sizes.update({company_key(b.company): b.size for b in load_boards() if b.size})
    sizes.update({company_key(n): "large" for n in seeds.get("large_companies", [])})
    return sizes


def size_from_openings(board: Board, count: int) -> str | None:
    """Rough size from how many roles a company's full ATS board lists, used only for the
    feed's combined "startups & mid-size" filter. None when the board isn't the whole
    company (intern-only boards, or SmartRecruiters, which we query for Canada only)."""
    if board.ats == "smartrecruiters" or SUB_BOARD.search(board.slug):
        return None
    return "startup" if count <= 30 else "mid" if count <= 300 else "large"


def boards_from_postings(postings: list[RawPosting]) -> list[Board]:
    found = []
    for p in postings:
        board = board_from_url(p.job_url, p.company_name)
        if board:
            found.append(board)
    return merge_boards(found)
