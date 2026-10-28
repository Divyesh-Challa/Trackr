from datetime import date, datetime, timezone

import pytest

from ingest.boards import board_from_url
from ingest.classify import disciplines, extract_terms, is_student_role, job_type, upcoming_terms
from ingest.locations import parse_locations, work_model
from ingest.models import RawPosting
from ingest.normalize import canonical_key, clean_url, html_to_markdown, parse_stated_pay
from ingest.pipeline import normalize
from ingest.sources.lists import parse_markdown_table, parse_simplify

TODAY = date(2026, 10, 27)


# --- locations -------------------------------------------------------------

@pytest.mark.parametrize("raw, city, province", [
    ("Toronto, ON, Canada", "Toronto", "ON"),
    ("Kanata, Ottawa, ON, Canada", "Kanata", "ON"),
    ("Vancouver, British Columbia", "Vancouver", "BC"),
    ("Montréal, QC", "Montréal", "QC"),
    ("Waterloo, ON", "Waterloo", "ON"),
    ("Calgary", "Calgary", "AB"),
    ("Toronto, ON, CAN", "Toronto", "ON"),
])
def test_canadian_locations(raw, city, province):
    [loc] = parse_locations([raw])
    assert (loc.city, loc.province) == (city, province)


@pytest.mark.parametrize("raw", [
    "Vancouver, WA", "London, UK", "Cambridge, MA", "Waterloo, IA", "Remote in USA",
    "San Francisco, CA", "Remote", "Hamilton", "Ottawa, IL",
])
def test_non_canadian_locations(raw):
    assert parse_locations([raw]) == []


def test_remote_canada_and_hints():
    [loc] = parse_locations(["Remote in Canada"])
    assert loc.remote and loc.province is None
    assert parse_locations(["Remote"], country_hint="CA")[0].remote
    assert work_model(parse_locations(["Remote in Canada"])) == "remote"


def test_multi_location_keeps_only_canada():
    locs = parse_locations(["Toronto, ON; San Francisco, CA; Vancouver, BC"])
    assert [l.city for l in locs] == ["Toronto", "Vancouver"]


# --- classification --------------------------------------------------------

@pytest.mark.parametrize("title", [
    "Software Engineer Intern (Summer 2027)", "Co-op Winter 2027 - Software Engineering",
    "Product Manager Intern", "Internal Audit Intern", "Stagiaire en développement logiciel",
    "Data Science Co-op Student", "Firmware Engineer Intern/Co-op",
])
def test_student_roles(title):
    assert is_student_role(title)


@pytest.mark.parametrize("title", [
    "Senior Software Engineer", "Internal Tools Engineer", "University Recruiter",
    "Student Success Manager", "Early Stage Investor", "Staff Engineer, Intern Program",
    "International Sales Lead",
])
def test_not_student_roles(title):
    assert not is_student_role(title)


def test_terms_from_title_and_months():
    assert extract_terms("SWE Intern (Summer 2027)") == ["S2027"]
    assert extract_terms("Co-op - Winter/Summer 2027") == ["S2027"]  # only "Summer 2027" is explicit
    assert extract_terms("IT Intern (January 2027) (4 months)") == ["W2027"]
    assert extract_terms("Starting September 2027") == ["F2027"]
    assert extract_terms("Stage - Été 2027") == ["S2027"]
    assert extract_terms("Spring 2027 Intern") == ["S2027"]


def test_upcoming_terms_drop_started_ones():
    assert upcoming_terms(["F2026", "W2027", "S2027"], TODAY) == ["W2027", "S2027"]


def test_job_type_and_disciplines():
    assert job_type("Software Developer Co-op") == "coop"
    assert job_type("SWE Intern") == "internship"
    assert disciplines("Firmware Engineer Intern") == ["hardware"]
    assert "data_ml" in disciplines("Machine Learning Intern")
    assert disciplines("Something Intern", "Software") == ["software"]
    assert disciplines("Intern") == ["other"]


# --- URLs, descriptions, pay -----------------------------------------------

@pytest.mark.parametrize("url, key", [
    ("https://boards.greenhouse.io/acme/jobs/4012345?gh_src=x", "greenhouse:4012345"),
    ("https://job-boards.greenhouse.io/acme/jobs/4012345", "greenhouse:4012345"),
    ("https://acme.com/careers?gh_jid=4012345", "greenhouse:4012345"),
    ("https://jobs.lever.co/acme/3B66F322-55eb-4c4b-9b36-028dfcdd85e9/apply", "lever:3b66f322-55eb-4c4b-9b36-028dfcdd85e9"),
    ("https://jobs.ashbyhq.com/cohere/7133d205-5421-4336-a8e2-6037b5f55073/application", "ashby:7133d205-5421-4336-a8e2-6037b5f55073"),
    ("https://rbc.wd3.myworkdayjobs.com/rbcglobal1/job/TORONTO/Developer_R-0000187114?utm_source=Simplify",
     "workday:rbc:r-0000187114"),
    ("https://jobs.smartrecruiters.com/Ubisoft2/744000158126459-modeler", "smartrecruiters:744000158126459"),
    ("https://careers.amd.com/jobs/90301?utm_source=Simplify&ref=Simplify", "careers.amd.com/jobs/90301"),
])
def test_canonical_keys(url, key):
    assert canonical_key(url) == key


def test_clean_url_strips_tracking_only():
    assert clean_url("https://x.com/jobs/1?utm_source=Simplify&ref=Simplify&id=7") == "https://x.com/jobs/1?id=7"


def test_html_to_markdown_handles_escaped_greenhouse_html():
    md = html_to_markdown("&lt;h2&gt;About&lt;/h2&gt;&lt;p&gt;We build things for Canadian students every day.&lt;/p&gt;")
    assert md.startswith("## About") and "Canadian students" in md
    assert html_to_markdown("<p>short</p>") is None


@pytest.mark.parametrize("text, expected", [
    ("The pay range is $28 - $35 CAD per hour.", (28, 35, "CAD", "hour")),
    ("Salary: CA$52,000 – CA$68,000 per year", (52000, 68000, "CAD", "year")),
    ("$90k-$110k/yr USD", (90000, 110000, "USD", "year")),
    ("$3,600 - $4,500 per month", (3600, 4500, "CAD", "month")),
])
def test_stated_pay(text, expected):
    s = parse_stated_pay(text)
    assert (s.min, s.max, s.currency, s.period) == expected


@pytest.mark.parametrize("text", [
    "We raised $20 - $30 million in 2025.", "401k matching", "Founded 2019 - 2020 per year", None,
])
def test_no_pay_when_not_stated(text):
    assert parse_stated_pay(text) is None


# --- sources ---------------------------------------------------------------

README = """
| Company | Role | Location | Apply | Date Posted |
|--------|------|----------|:-----:|--------------|
| SOTI | Software Developer Intern, Server (Summer 2027) | Mississauga, ON | [![Apply](https://img.shields.io/badge/-Apply-blue)](https://soti.wd3.myworkdayjobs.com/SOTI/job/Miss/Dev_R10647) | Oct 26, 2026 |
| ↳ | Systems Intern (Summer 2027) | Vancouver, BC | Closed🔒 | Oct 23, 2026 |
| Boson Ai | MScAC Intern &amp; Research | Toronto, ON<br>Remote in Canada | [Apply](https://jobs.lever.co/bosonai/3b66f322-55eb-4c4b-9b36-028dfcdd85e9/apply) | Oct 23, 2026 |
"""


def test_markdown_table():
    rows = parse_markdown_table(README, "canadian-tech-internships")
    assert [r.company_name for r in rows] == ["SOTI", "Boson Ai"]  # closed row without a link is skipped
    assert rows[0].job_url.startswith("https://soti.wd3")
    assert rows[0].posted_at == datetime(2026, 10, 26, tzinfo=timezone.utc)
    assert rows[1].locations == ["Toronto, ON; Remote in Canada"]


def test_simplify_mapping():
    [p] = parse_simplify([{
        "id": "abc", "company_name": "Acme", "title": "SWE Intern", "active": False,
        "terms": ["Fall 2027", "N/A"], "date_posted": 1793150868, "url": "https://x.com/1",
        "locations": ["Toronto, ON, Canada"], "category": "Software", "is_visible": True,
    }])
    assert p.term_hints == ["Fall 2027"] and not p.active and p.category_hint == "Software"


def test_board_from_url():
    assert board_from_url("https://job-boards.greenhouse.io/Hootsuite/jobs/1", "Hootsuite").slug == "hootsuite"
    assert board_from_url("https://boards.greenhouse.io/embed/job_app?for=acme&token=1", "Acme").slug == "acme"
    assert board_from_url("https://jobs.ashbyhq.com/cohere/abc", "Cohere").ats == "ashby"
    assert board_from_url("https://example.com/jobs/1", "X") is None


# --- pipeline --------------------------------------------------------------

def _p(**kw):
    base = dict(source="simplify", source_id="1", company_name="Acme", title="Software Engineer Intern",
                job_url="https://boards.greenhouse.io/acme/jobs/111", locations=["Toronto, ON"])
    base.update(kw)
    return RawPosting(**base)


def test_same_posting_from_list_and_ats_merges_into_one_row():
    ats = _p(source="greenhouse", source_id="111", job_url="https://job-boards.greenhouse.io/acme/jobs/111",
             description_html="<p>" + "Real description from the employer's board. " * 3 + "</p>")
    listed = _p(term_hints=["Summer 2027"], job_url="https://boards.greenhouse.io/acme/jobs/111?utm_source=Simplify")
    [row] = normalize([listed, ats], TODAY).records
    assert row["source"] == "greenhouse"
    assert row["terms"] == ["S2027"]  # term known only to the list survives the merge
    assert "Real description" in row["description_md"]
    assert row["job_url_canonical"] == "greenhouse:111"


def test_filters_and_closed_postings():
    rows = normalize([
        _p(title="Senior Engineer", job_url="https://x.com/a"),
        _p(locations=["Seattle, WA"], job_url="https://x.com/b"),
        _p(title="SWE Intern (Fall 2026)", job_url="https://x.com/c"),  # term already started
        _p(job_url="https://x.com/d", posted_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),  # stale
        _p(job_url="https://x.com/e", active=False),
        _p(title="SWE Intern (Summer 2027)", job_url="https://x.com/f"),
    ], TODAY)
    assert [r["job_url"] for r in rows.records] == ["https://x.com/f"]
    assert rows.closed_keys == {"x.com/e"}


def test_reposted_requisitions_collapse():
    rows = normalize([
        _p(job_url="https://careers.amd.com/jobs/1"),
        _p(job_url="https://careers.amd.com/jobs/2"),
        _p(job_url="https://careers.amd.com/jobs/3", locations=["Markham, ON"]),
    ], TODAY).records
    assert sorted(r["city"] for r in rows) == ["Markham", "Toronto"]


def test_pay_is_never_invented():
    [row] = normalize([_p()], TODAY).records
    assert row["salary_min"] is None and row["salary_source"] is None


def test_size_from_openings():
    from ingest.boards import size_from_openings
    from ingest.models import Board
    full = Board("Acme", "greenhouse", "acme")
    assert [size_from_openings(full, n) for n in (3, 30, 31, 300, 301)] == ["startup", "startup", "mid", "mid", "large"]
    assert size_from_openings(Board("T", "greenhouse", "tenstorrentuniversity"), 4) is None
    assert size_from_openings(Board("D", "greenhouse", "doordashcanada"), 4) is None
    assert size_from_openings(Board("B", "smartrecruiters", "BoschGroup"), 4) is None


def test_known_sizes_override_by_company_name():
    from ingest.boards import company_key, known_sizes
    sizes = known_sizes()
    assert sizes[company_key("Tenstorrent")] == "mid"
    assert sizes[company_key("Bosch Group")] == "large"
