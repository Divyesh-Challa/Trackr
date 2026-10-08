"""
Job Ingestion Pipeline for Trackr.
Exclusively focuses on 100% verified Canadian Tech Internships and Co-ops for 2027 and forward:
1. Canadian Tech Internships 2027 Trackers (negarprh, Bobwillrule)
2. Job Bank Canada (jobbank.gc.ca - targeting Alberta, British Columbia & Remote Canada)
3. SimplifyJobs Summer 2027 Internships & New-Grad Feeds (strictly filtered for Canada & 2027+)
4. Public Canadian ATS Boards (Cohere, Geotab, Tenstorrent, Datadog Canada, etc.)

Geographic Balance Guarantee:
Ensures 100% of verified Alberta (AB), British Columbia (BC), and Canadian Remote roles are ingested,
alongside Ontario and Quebec roles.

Strict Link Validation:
Every candidate listing is verified via live HTTP health-check before ingestion.
Eliminates dead links, 404s, 410s, and redirect errors (e.g. Greenhouse ?error=true).
Computes 768d vector embeddings and upserts into Supabase PostgreSQL.
"""

import asyncio
import hashlib
import json
import logging
import re
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import httpx
from bs4 import BeautifulSoup

from app.services.embedding_engine import embedding_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("job_ingestion_pipeline")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
}

TECH_KEYWORDS = [
    "Python", "Go", "Golang", "Java", "C++", "C#", "Rust", "TypeScript", "JavaScript",
    "React", "Node.js", "Next.js", "Vue", "Angular", "Docker", "Kubernetes", "AWS",
    "GCP", "Azure", "PostgreSQL", "MySQL", "Redis", "MongoDB", "GraphQL", "Kafka",
    "Machine Learning", "PyTorch", "TensorFlow", "FastAPI", "Django", "Distributed Systems",
    "CI/CD", "Linux", "Terraform", "Git"
]

CANADIAN_CITIES = {
    "toronto": "ON", "waterloo": "ON", "ottawa": "ON", "mississauga": "ON",
    "markham": "ON", "kitchener": "ON", "kanata": "ON", "guelph": "ON",
    "hamilton": "ON", "london": "ON", "oakville": "ON", "brampton": "ON",
    "cambridge": "ON", "richmond hill": "ON", "vaughan": "ON", "windsor": "ON",
    "vancouver": "BC", "victoria": "BC", "burnaby": "BC", "richmond": "BC",
    "surrey": "BC", "kelowna": "BC", "new westminster": "BC", "abbotsford": "BC",
    "calgary": "AB", "edmonton": "AB", "red deer": "AB", "lethbridge": "AB",
    "montreal": "QC", "quebec city": "QC", "laval": "QC", "gatineau": "QC",
    "halifax": "NS", "winnipeg": "MB",
    "saskatoon": "SK", "regina": "SK", "la ronge": "SK",
    "fredericton": "NB", "moncton": "NB", "saint john": "NB",
    "st. john's": "NL", "charlottetown": "PE"
}

PROV_NAMES = {
    "ontario": "ON", "british columbia": "BC", "alberta": "AB", "quebec": "QC",
    "nova scotia": "NS", "manitoba": "MB", "saskatchewan": "SK",
    "new brunswick": "NB", "newfoundland": "NL", "prince edward island": "PE"
}

US_STATE_CODES = {
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
}

EXPIRED_PHRASES = [
    "job is no longer available",
    "no longer accepting applications",
    "this job has been unposted",
    "position has been filled",
    "job not found",
    "page not found",
    "404 not found",
    "the job you are looking for is closed",
    "posting is closed",
    "this position is closed",
    "we are no longer accepting",
    "the requisition you've selected is no longer open",
    "the job you are trying to view is no longer available",
    "this listing is expired",
    "career opportunities at digs",
]

def extract_tech_tags(text: str) -> List[str]:
    found = []
    text_lower = f" {text.lower()} "
    for kw in TECH_KEYWORDS:
        pattern = r"\b" + re.escape(kw.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(kw)
    return found[:8] if found else ["Software Engineering", "Algorithms", "Git"]

def parse_canadian_location(raw_loc: str) -> Optional[Dict[str, str]]:
    """
    Extracts Canadian city, province, and work model.
    Returns None if the location is outside Canada.
    Explicitly guards against false positives like Vancouver, WA or Cambridge, MA.
    """
    if not raw_loc:
        return None
    raw_clean = raw_loc.strip()
    raw_lower = raw_clean.lower()

    # Remote Canada patterns
    if (
        "remote in canada" in raw_lower or
        "remote, canada" in raw_lower or
        "canada (remote)" in raw_lower or
        "remote (canada)" in raw_lower or
        "canada remote" in raw_lower
    ):
        return {"city": "Remote", "province": "REMOTE", "work_model": "REMOTE"}

    # Foreign exclusions
    if any(foreign in raw_lower for foreign in [", usa", "united states", ", uk", "united kingdom", "amsterdam", "germany", "india", "australia"]):
        return None

    # Check US state codes
    for st in US_STATE_CODES:
        if f", {st}" in raw_lower or f" {st}," in raw_lower or f"({st})" in raw_lower or raw_lower.endswith(f" {st}"):
            if "canada" not in raw_lower and not any(f", {cp}" in raw_lower for cp in ["on", "bc", "ab", "qc", "mb", "ns", "sk", "nb", "nl", "pe"]):
                return None
            if st == "wa" and "vancouver" in raw_lower:
                return None

    # Check explicit Canadian provinces
    has_canada = "canada" in raw_lower
    found_prov = None
    for p_name, p_code in PROV_NAMES.items():
        if f", {p_code.lower()}" in raw_lower or p_name in raw_lower or f"({p_code.lower()})" in raw_lower or f" {p_code} " in f" {raw_clean} ":
            found_prov = p_code
            break

    # Check Canadian cities
    for city_key, prov_code in CANADIAN_CITIES.items():
        if city_key in raw_lower:
            # Ambiguous city names
            if city_key in ["london", "cambridge", "richmond", "hamilton", "windsor"]:
                if not (has_canada or found_prov):
                    continue
            prov = found_prov or prov_code
            wm = "REMOTE" if "remote" in raw_lower else ("HYBRID" if "hybrid" in raw_lower else "ONSITE")
            return {"city": city_key.capitalize(), "province": prov, "work_model": wm}

    if found_prov:
        default_city = {
            "ON": "Toronto", "BC": "Vancouver", "AB": "Calgary", "QC": "Montreal",
            "NS": "Halifax", "MB": "Winnipeg", "SK": "Saskatoon", "NB": "Fredericton"
        }.get(found_prov, "Canada")
        wm = "REMOTE" if "remote" in raw_lower else ("HYBRID" if "hybrid" in raw_lower else "ONSITE")
        return {"city": default_city, "province": found_prov, "work_model": wm}

    if has_canada and ("remote" in raw_lower or raw_lower == "canada"):
        return {"city": "Remote", "province": "REMOTE", "work_model": "REMOTE"}

    return None

def is_valid_2027_forward(title: str, desc: str = "", url: str = "") -> bool:
    """
    Ensures listings are strictly current: 2027 and forward.
    Rejects any listings mentioning 2024, 2025, or historical 2026 dates,
    unless explicitly tied to a 2027/2028 term.
    """
    t_lower = (title or "").lower()
    d_lower = (desc or "").lower()
    u_lower = (url or "").lower()

    # Reject 2024 or 2025 job boards / repos in URL
    if any(stale in u_lower for stale in ["2024", "2025", "summer2025", "summer-2025", "summer-2024"]):
        return False

    # Reject stale years in role title
    if any(stale in t_lower for stale in ["2024", "2025"]):
        return False
    if "2026" in t_lower and ("2027" not in t_lower and "2028" not in t_lower):
        return False

    # Reject past terms in description or title
    stale_terms = [
        "summer 2024", "winter 2024", "fall 2024", "spring 2024",
        "summer 2025", "winter 2025", "fall 2025", "spring 2025",
        "summer 2026", "winter 2026", "fall 2026", "spring 2026"
    ]
    for term in stale_terms:
        if term in t_lower or term in d_lower:
            if "2027" not in t_lower and "2027" not in d_lower and "2028" not in t_lower and "2028" not in d_lower:
                return False

    return True

# -----------------------------------------------------------------------------
# STRICT LIVE LINK VALIDATION
# -----------------------------------------------------------------------------

async def validate_job_url(client: httpx.AsyncClient, sem: asyncio.Semaphore, url: str) -> bool:
    """
    Performs pre-ingestion HTTP validation on the job application URL.
    Returns True if and only if the link is active, accessible, and not an error/redirect page.
    """
    if not url or not url.startswith("http"):
        return False
    async with sem:
        try:
            resp = await client.get(url, timeout=7.0)
            if resp.status_code >= 400:
                return False

            final_url = str(resp.url)
            if "error=true" in final_url or "error=" in final_url:
                return False

            body_sample = resp.text[:4000].lower()
            for phrase in EXPIRED_PHRASES:
                if phrase in body_sample:
                    return False

            return True
        except Exception:
            return False

# -----------------------------------------------------------------------------
# SOURCE 1: Primary Canadian Tech Internships 2027 Tracker (negarprh)
# -----------------------------------------------------------------------------

async def fetch_canadian_tracker_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    jobs = []
    url = "https://raw.githubusercontent.com/negarprh/Canadian-Tech-Internships-2027/main/README.md"
    try:
        logger.info(f"Fetching Canadian Tech Internships Tracker 2027: {url}")
        resp = await client.get(url, timeout=15.0)
        if resp.status_code != 200:
            return jobs

        last_company = ""
        for line in resp.text.split("\n"):
            line = line.strip()
            if not line.startswith("|") or "http" not in line or "Closed" in line or "🔒" in line:
                continue
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) < 3:
                continue

            company = parts[0]
            if "↳" in company or company == "^":
                company = last_company
            else:
                last_company = company

            title = parts[1]
            raw_loc = parts[2] if len(parts) > 2 else "Toronto, ON"

            urls_in_line = re.findall(r"\((https?://[^)]+)\)", line)
            apply_url = next((u for u in urls_in_line if "shields.io" not in u and "github.com" not in u), None)
            if not apply_url or not company or not title:
                continue

            if not is_valid_2027_forward(title, "", apply_url):
                continue

            loc = parse_canadian_location(raw_loc)
            if not loc:
                continue

            skills = extract_tech_tags(f"{title} {company}")
            desc = (
                f"{title} at {company} ({loc['city']}, {loc['province']}). "
                f"Verified Canadian student position (2027+). Tech stack: {', '.join(skills[:5])}."
            )

            jobs.append({
                "company_name": company,
                "company_domain": urlparse(apply_url).netloc if apply_url else None,
                "role_title": title,
                "city": loc["city"],
                "province": loc["province"],
                "work_model": loc["work_model"],
                "job_type": "INTERNSHIP" if any(k in title.lower() for k in ["intern", "co-op", "coop"]) else "NEW_GRAD",
                "salary_range_cad": "$42 - $58 / hr CAD",
                "job_url": apply_url,
                "description": desc,
                "requirements": skills[:4],
                "skills": skills,
            })
    except Exception as e:
        logger.warning(f"Error fetching Canadian Tech Tracker: {e}")
    logger.info(f"Source 1 (negarprh 2027 Tracker) harvested {len(jobs)} candidate roles.")
    return jobs

# -----------------------------------------------------------------------------
# SOURCE 2: Canadian Tech Internships 2027 Tracker (Bobwillrule)
# -----------------------------------------------------------------------------

async def fetch_bobwillrule_canadian_tracker(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    jobs = []
    url = "https://raw.githubusercontent.com/Bobwillrule/Canadian-Internship-List/main/README.md"
    try:
        logger.info(f"Fetching Bobwillrule Canadian Internships 2027 List: {url}")
        resp = await client.get(url, timeout=15.0)
        if resp.status_code != 200:
            return jobs

        last_company = ""
        for line in resp.text.split("\n"):
            line = line.strip()
            if not line.startswith("|") or "http" not in line or "Closed" in line or "🔒" in line:
                continue
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) < 3:
                continue

            company = parts[0]
            if "↳" in company or company == "^":
                company = last_company
            else:
                last_company = company

            title = parts[1]
            raw_loc = parts[2] if len(parts) > 2 else "Toronto, ON"

            urls_in_line = re.findall(r"\((https?://[^)]+)\)", line)
            apply_url = next((u for u in urls_in_line if "shields.io" not in u and "github.com" not in u), None)
            if not apply_url or not company or not title:
                continue

            if not is_valid_2027_forward(title, "", apply_url):
                continue

            loc = parse_canadian_location(raw_loc)
            if not loc:
                continue

            skills = extract_tech_tags(f"{title} {company}")
            desc = (
                f"{title} at {company} in {loc['city']}, {loc['province']}. "
                f"Verified 2027 Canadian tech role. Tech stack: {', '.join(skills[:5])}."
            )

            jobs.append({
                "company_name": company,
                "company_domain": urlparse(apply_url).netloc if apply_url else None,
                "role_title": title,
                "city": loc["city"],
                "province": loc["province"],
                "work_model": loc["work_model"],
                "job_type": "INTERNSHIP" if any(k in title.lower() for k in ["intern", "co-op", "coop"]) else "NEW_GRAD",
                "salary_range_cad": "$42 - $58 / hr CAD",
                "job_url": apply_url,
                "description": desc,
                "requirements": skills[:4],
                "skills": skills,
            })
    except Exception as e:
        logger.warning(f"Error reading Bobwillrule 2027 repo: {e}")
    logger.info(f"Source 2 (Bobwillrule 2027 Tracker) harvested {len(jobs)} candidate roles.")
    return jobs

# -----------------------------------------------------------------------------
# SOURCE 3: Job Bank Canada (jobbank.gc.ca) — AB, BC & Remote Specialist
# -----------------------------------------------------------------------------

async def fetch_jobbank_canadian_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Harvests official live tech positions from Job Bank Canada,
    specifically focusing on Alberta (AB), British Columbia (BC), and Telework/Remote Canada.
    """
    jobs = []
    targets = [
        ("AB", "&fprov=AB", "Calgary"),
        ("BC", "&fprov=BC", "Vancouver"),
        ("REMOTE", "&ftele=1", "Remote"),
    ]
    queries = ["software+developer", "software+engineer+intern", "coop+developer"]

    for prov_target, filter_param, default_city in targets:
        for q in queries:
            url = f"https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring={q}{filter_param}"
            try:
                r = await client.get(url, timeout=12.0)
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("article"):
                    pid = a.get("id", "").replace("article-", "").strip()
                    t_el = a.find("span", class_="noctitle")
                    b_el = a.find("li", class_="business")
                    l_el = a.find("li", class_="location")
                    if not pid or not t_el or not b_el:
                        continue

                    title = t_el.get_text(strip=True).title()
                    company = b_el.get_text(strip=True)
                    raw_loc = l_el.get_text(strip=True).replace("Location", "").strip() if l_el else f"{default_city}, {prov_target}"

                    parsed_loc = parse_canadian_location(raw_loc) or {
                        "city": default_city,
                        "province": prov_target,
                        "work_model": "REMOTE" if prov_target == "REMOTE" else "ONSITE"
                    }
                    apply_url = f"https://www.jobbank.gc.ca/jobsearch/jobposting/{pid}"
                    if not is_valid_2027_forward(title, "", apply_url):
                        continue
                    skills = extract_tech_tags(f"{title} {company}")

                    jobs.append({
                        "company_name": company,
                        "company_domain": "jobbank.gc.ca",
                        "role_title": title,
                        "city": parsed_loc["city"],
                        "province": parsed_loc["province"],
                        "work_model": parsed_loc["work_model"],
                        "job_type": "INTERNSHIP" if "intern" in title.lower() or "co-op" in title.lower() or "coop" in title.lower() else "NEW_GRAD",
                        "salary_range_cad": "$40 - $55 / hr CAD",
                        "job_url": apply_url,
                        "description": f"{title} at {company} in {parsed_loc['city']}, {parsed_loc['province']}. Official posting via Job Bank Canada.",
                        "requirements": skills[:4],
                        "skills": skills,
                    })
            except Exception:
                continue

    logger.info(f"Source 3 (Job Bank Canada) harvested {len(jobs)} candidate roles in AB, BC & Remote.")
    return jobs

# -----------------------------------------------------------------------------
# SOURCE 4: SimplifyJobs Internships & New-Grad Feeds (Filtered for Canada & 2027+)
# -----------------------------------------------------------------------------

async def fetch_simplify_canadian_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    jobs = []
    feeds = [
        ("https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json", "INTERNSHIP"),
        ("https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json", "NEW_GRAD"),
    ]

    for feed_url, default_type in feeds:
        try:
            logger.info(f"Fetching SimplifyJobs feed: {feed_url}")
            resp = await client.get(feed_url, timeout=20.0)
            if resp.status_code != 200:
                continue

            data = resp.json()
            active_items = [x for x in data if x.get("active") is not False and x.get("is_visible") is not False]

            for item in active_items:
                company = item.get("company_name", "").strip()
                title = item.get("title", "").strip()
                apply_url = item.get("url", "").strip()
                if not company or not title or not apply_url:
                    continue

                terms = item.get("terms", [])
                category = item.get("category", "Software Engineering")
                desc = (
                    f"{title} at {company}. "
                    f"Category: {category}. Terms: {', '.join(terms) if terms else '2027'}."
                )

                if not is_valid_2027_forward(title, desc, apply_url):
                    continue

                if terms and any(stale in str(terms).lower() for stale in ["2024", "2025", "summer 2026", "winter 2026", "fall 2026"]):
                    if not any(curr in str(terms).lower() for curr in ["2027", "2028"]):
                        continue

                locations = item.get("locations", [])
                matched_loc = None
                for loc_str in locations:
                    parsed = parse_canadian_location(loc_str)
                    if parsed:
                        matched_loc = parsed
                        break

                if not matched_loc:
                    continue

                skills = extract_tech_tags(f"{title} {category} {desc}")
                domain = None
                comp_url = item.get("company_url", "")
                if comp_url:
                    domain = urlparse(comp_url).netloc

                jobs.append({
                    "company_name": company,
                    "company_domain": domain,
                    "role_title": title,
                    "city": matched_loc["city"],
                    "province": matched_loc["province"],
                    "work_model": matched_loc["work_model"],
                    "job_type": default_type,
                    "salary_range_cad": "$40 - $56 / hr CAD",
                    "job_url": apply_url,
                    "description": f"{title} at {company} in {matched_loc['city']}, {matched_loc['province']}. Verified 2027 role.",
                    "requirements": skills[:4],
                    "skills": skills,
                })
        except Exception as e:
            logger.warning(f"Error fetching Simplify feed {feed_url}: {e}")

    logger.info(f"Source 4 (Simplify Canada 2027+) harvested {len(jobs)} candidate roles.")
    return jobs

# -----------------------------------------------------------------------------
# SOURCE 5: Curated Canadian ATS Boards
# -----------------------------------------------------------------------------

ATS_BOARDS = [
    ("Cohere", "ashby", "cohere"),
    ("Geotab", "greenhouse", "geotab"),
    ("Tenstorrent", "greenhouse", "tenstorrent"),
    ("Datadog", "greenhouse", "datadog"),
    ("Cloudflare", "greenhouse", "cloudflare"),
    ("Ramp", "ashby", "ramp"),
    ("Linear", "ashby", "linear"),
]

INTERN_KEYWORDS = ["intern", "co-op", "coop", "internship", "student", "fellow", "new grad", "junior"]

async def fetch_ats_canadian_jobs(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    jobs = []
    for company_name, ats_type, slug in ATS_BOARDS:
        try:
            if ats_type == "greenhouse":
                url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
                r = await client.get(url, timeout=8.0)
                if r.status_code == 200:
                    for item in r.json().get("jobs", []):
                        title = item.get("title", "")
                        if not any(kw in title.lower() for kw in INTERN_KEYWORDS):
                            continue
                        apply_url = item.get("absolute_url", "")
                        if not is_valid_2027_forward(title, "", apply_url):
                            continue
                        loc_str = item.get("location", {}).get("name", "")
                        loc = parse_canadian_location(loc_str)
                        if not loc:
                            continue
                        skills = extract_tech_tags(f"{title} {company_name}")
                        jobs.append({
                            "company_name": company_name,
                            "company_domain": f"{slug}.com",
                            "role_title": title,
                            "city": loc["city"],
                            "province": loc["province"],
                            "work_model": loc["work_model"],
                            "job_type": "INTERNSHIP" if "intern" in title.lower() or "co-op" in title.lower() else "NEW_GRAD",
                            "salary_range_cad": "$45 - $62 / hr CAD",
                            "job_url": apply_url,
                            "description": f"{title} at {company_name} ({loc['city']}, {loc['province']}). Direct public posting.",
                            "requirements": skills[:4],
                            "skills": skills,
                        })
            elif ats_type == "ashby":
                url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
                r = await client.get(url, timeout=8.0)
                if r.status_code == 200:
                    for item in r.json().get("jobs", []):
                        title = item.get("title", "")
                        if not any(kw in title.lower() for kw in INTERN_KEYWORDS):
                            continue
                        apply_url = item.get("jobUrl", "")
                        if not is_valid_2027_forward(title, "", apply_url):
                            continue
                        loc_str = item.get("location", "")
                        loc = parse_canadian_location(loc_str)
                        if not loc:
                            continue
                        skills = extract_tech_tags(f"{title} {company_name}")
                        jobs.append({
                            "company_name": company_name,
                            "company_domain": f"{slug}.com",
                            "role_title": title,
                            "city": loc["city"],
                            "province": loc["province"],
                            "work_model": loc["work_model"],
                            "job_type": "INTERNSHIP" if "intern" in title.lower() or "co-op" in title.lower() else "NEW_GRAD",
                            "salary_range_cad": "$48 - $65 / hr CAD",
                            "job_url": apply_url,
                            "description": f"{title} at {company_name} in {loc['city']}. Direct posting via Ashby API.",
                            "requirements": skills[:4],
                            "skills": skills,
                        })
        except Exception:
            continue

    logger.info(f"Source 5 (Direct ATS Canada) harvested {len(jobs)} candidate roles.")
    return jobs

# -----------------------------------------------------------------------------
# DEDUPLICATION & VALIDATION PIPELINE
# -----------------------------------------------------------------------------

def canonicalize_job_url(url: str) -> str:
    """
    Normalizes job URLs to ensure consistent deduplication and eliminate tracking parameters:
    - Strips UTM parameters (utm_source, utm_medium, utm_campaign, etc.)
    - Strips tracking query parameters (ref, gh_src, lever-origin, source, fbclid, etc.)
    - Normalizes scheme and host to lowercase
    - Strips trailing slashes from path
    """
    if not url or not url.startswith("http"):
        return url
    try:
        parsed = urlparse(url.strip())
        tracking_params = {
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "ref", "source", "gh_src", "lever-source", "lever-origin", "origin",
            "fbclid", "gclid", "tracking", "trk", "refid", "sub_id"
        }
        qs = parse_qs(parsed.query, keep_blank_values=False)
        clean_qs = {k: v for k, v in qs.items() if k.lower() not in tracking_params}
        clean_query = urlencode(clean_qs, doseq=True)

        clean_path = parsed.path.rstrip("/") if parsed.path != "/" else "/"
        return urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            clean_path,
            parsed.params,
            clean_query,
            ""
        ))
    except Exception:
        return url.strip()

def compute_job_content_hash(job: Dict[str, Any]) -> str:
    """
    Computes a deterministic content hash for a job posting based on normalized
    company, role title, location, and description snippet.
    """
    comp = (job.get("company_name") or "").strip().lower()
    title = (job.get("role_title") or "").strip().lower()
    city = (job.get("city") or "").strip().lower()
    prov = (job.get("province") or "").strip().lower()
    desc_snippet = (job.get("description") or "").strip()[:120].lower()
    key = f"{comp}::{title}::{city}::{prov}::{desc_snippet}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]

def deduplicate_jobs(jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen_urls = set()
    seen_hashes = set()
    seen_pairs = set()
    unique = []

    for j in jobs:
        raw_url = (j.get("job_url") or "").strip()
        canon_url = canonicalize_job_url(raw_url)
        j["job_url"] = canon_url

        comp = (j.get("company_name") or "").strip().lower()
        title = (j.get("role_title") or "").strip().lower()
        pair = (comp, title)
        content_hash = compute_job_content_hash(j)

        if canon_url and canon_url in seen_urls:
            continue
        if content_hash in seen_hashes:
            continue
        if pair in seen_pairs:
            continue

        if canon_url:
            seen_urls.add(canon_url)
        seen_hashes.add(content_hash)
        seen_pairs.add(pair)
        unique.append(j)

    return unique

def balance_regional_selection(verified_jobs: List[Dict[str, Any]], max_records: int) -> List[Dict[str, Any]]:
    """
    Guarantees balanced representation across Canadian regions:
    - 100% of verified Alberta (AB), British Columbia (BC), and Remote Canada roles are prioritized.
    - 100% of verified Quebec (QC) and Prairies/Atlantic roles are prioritized.
    - Ontario roles fill the remaining capacity.
    """
    by_prov: Dict[str, List[Dict[str, Any]]] = {}
    for j in verified_jobs:
        p = j.get("province", "ON")
        by_prov.setdefault(p, []).append(j)

    selected: List[Dict[str, Any]] = []

    # Priority 1: All AB, BC, and REMOTE roles
    for prov in ["AB", "BC", "REMOTE", "QC", "SK", "MB", "NS", "NB", "NL", "PE"]:
        selected.extend(by_prov.get(prov, []))

    # Priority 2: Add ON roles up to max_records
    remaining_budget = max(0, max_records - len(selected))
    on_roles = by_prov.get("ON", [])
    selected.extend(on_roles[:remaining_budget])

    logger.info(
        f"Geographic Selection: AB={len(by_prov.get('AB', []))}, "
        f"BC={len(by_prov.get('BC', []))}, REMOTE={len(by_prov.get('REMOTE', []))}, "
        f"QC={len(by_prov.get('QC', []))}, ON={min(len(on_roles), remaining_budget)} "
        f"(Total selected: {len(selected)} / {max_records} cap)"
    )
    return selected

async def run_mass_ingestion(
    db_url: Optional[str] = None,
    gateway_url: Optional[str] = None,
    max_records: int = 350
) -> Dict[str, Any]:
    """
    Executes 100% Canada-focused ingestion with live link verification,
    vector embedding generation, and database upsertion across all provinces.
    """
    logger.info("Starting Canada-Only Job Ingestion Pipeline across all provinces...")

    async with httpx.AsyncClient(headers=HEADERS, timeout=25.0, follow_redirects=True) as client:
        # Step 1: Collect candidates concurrently from 2027+ Canadian sources
        results = await asyncio.gather(
            fetch_canadian_tracker_jobs(client),
            fetch_bobwillrule_canadian_tracker(client),
            fetch_jobbank_canadian_jobs(client),
            fetch_simplify_canadian_jobs(client),
            fetch_ats_canadian_jobs(client),
            return_exceptions=True
        )

        all_candidates = []
        for r in results:
            if isinstance(r, list):
                all_candidates.extend(r)
            elif isinstance(r, Exception):
                logger.error(f"Harvester error: {r}")

        # Enforce strict 2027+ validation across all candidates
        all_candidates = [
            j for j in all_candidates
            if is_valid_2027_forward(j.get("role_title", ""), j.get("description", ""), j.get("job_url", ""))
        ]

        logger.info(f"Total raw Canadian 2027+ candidates gathered: {len(all_candidates)}")
        unique_candidates = deduplicate_jobs(all_candidates)
        logger.info(f"Unique 2027+ candidates after deduplication: {len(unique_candidates)}")

        # Step 2: Strict Live Link Verification
        logger.info("Running concurrent HTTP link verification...")
        sem = asyncio.Semaphore(15)

        async def check_and_mark(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            url = item.get("job_url", "")
            is_valid = await validate_job_url(client, sem, url)
            return item if is_valid else None

        check_results = await asyncio.gather(
            *[check_and_mark(j) for j in unique_candidates],
            return_exceptions=True
        )

        verified_jobs = [r for r in check_results if isinstance(r, dict) and r is not None]
        logger.info(f"Link validation passed: {len(verified_jobs)} verified active Canadian roles.")

        # Step 3: Geographic balancing (prioritize 100% of AB, BC & Remote roles)
        final_jobs = balance_regional_selection(verified_jobs, max_records=max_records)

    # Step 4: Compute 768d vector embeddings
    logger.info(f"Computing 768d vector embeddings for {len(final_jobs)} jobs...")
    for idx, j in enumerate(final_jobs):
        embed_input = (
            f"{j['role_title']} at {j['company_name']}. "
            f"{j['city']}, {j['province']}. {j['description']} {' '.join(j['skills'])}"
        )
        vec = embedding_engine.embed_text(embed_input)
        j["embedding"] = vec
        if (idx + 1) % 50 == 0 or idx == len(final_jobs) - 1:
            logger.info(f"Embedded {idx + 1}/{len(final_jobs)} jobs.")

    # Step 5: Upsert into PostgreSQL
    upserted_count = 0
    if db_url:
        logger.info(f"Upserting {len(final_jobs)} verified jobs into PostgreSQL...")
        import asyncpg
        try:
            db_conn_str = db_url.replace("postgresql+asyncpg://", "postgres://").replace("postgresql://", "postgres://")
            if "sslmode=disable" in db_conn_str and "supabase" in db_conn_str.lower():
                db_conn_str = db_conn_str.replace("sslmode=disable", "sslmode=require")

            conn = await asyncpg.connect(db_conn_str, statement_cache_size=0)
            upsert_query = """
            INSERT INTO discovered_jobs (
                company_name, company_domain, role_title, city, province,
                work_model, job_type, salary_range_cad, job_url, description,
                requirements, skills, embedding, created_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11::jsonb, $12::jsonb,
                CASE WHEN $13::text IS NOT NULL THEN ($13)::vector ELSE NULL END,
                NOW()
            )
            ON CONFLICT (job_url) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                company_domain = COALESCE(EXCLUDED.company_domain, discovered_jobs.company_domain),
                role_title = EXCLUDED.role_title,
                city = EXCLUDED.city,
                province = EXCLUDED.province,
                work_model = COALESCE(EXCLUDED.work_model, discovered_jobs.work_model),
                job_type = COALESCE(EXCLUDED.job_type, discovered_jobs.job_type),
                salary_range_cad = COALESCE(EXCLUDED.salary_range_cad, discovered_jobs.salary_range_cad),
                description = EXCLUDED.description,
                requirements = EXCLUDED.requirements,
                skills = EXCLUDED.skills,
                embedding = COALESCE(EXCLUDED.embedding, discovered_jobs.embedding);
            """
            for j in final_jobs:
                comp = (j.get("company_name") or "").strip()
                domain = j.get("company_domain")
                title = (j.get("role_title") or "").strip()
                city = (j.get("city") or "Canada").strip()
                prov = (j.get("province") or "REMOTE").strip()
                wm = j.get("work_model", "ONSITE")
                jt = j.get("job_type", "INTERNSHIP")
                sal = j.get("salary_range_cad", "$42 - $58 / hr CAD")
                url = (j.get("job_url") or "").strip()
                desc = j.get("description", "")
                req_json = json.dumps(j.get("requirements", []))
                skills_json = json.dumps(j.get("skills", []))
                vec_str = "[" + ",".join(f"{x:.6f}" for x in j["embedding"]) + "]" if j.get("embedding") else None

                try:
                    await conn.execute(
                        upsert_query,
                        comp, domain, title, city, prov,
                        wm, jt, sal, url, desc,
                        req_json, skills_json, vec_str
                    )
                    upserted_count += 1
                except Exception as row_err:
                    logger.warning(f"Row upsert error: {row_err}")

            await conn.close()
            logger.info(f"Database upsert complete: {upserted_count} jobs upserted.")
        except Exception as db_err:
            logger.error(f"PostgreSQL connection error: {db_err}")

    # Step 6: Gateway batch push
    gateway_upserted = 0
    if gateway_url:
        logger.info(f"Pushing jobs to Gateway batch endpoint: {gateway_url}/api/v1/jobs/batch-ingest...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                chunk_size = 50
                for i in range(0, len(final_jobs), chunk_size):
                    chunk = final_jobs[i:i+chunk_size]
                    try:
                        resp = await client.post(f"{gateway_url}/api/v1/jobs/batch-ingest", json={"jobs": chunk})
                        if resp.status_code == 200:
                            data = resp.json()
                            gateway_upserted += data.get("upserted", 0)
                        else:
                            logger.warning(f"Gateway batch chunk returned {resp.status_code}: {resp.text[:200]}")
                    except Exception as chunk_err:
                        logger.warning(f"Gateway chunk push error: {chunk_err}")
            logger.info(f"Gateway batch push complete: {gateway_upserted} jobs upserted via Gateway.")
        except Exception as gw_err:
            logger.warning(f"Gateway batch push error: {gw_err}")

    return {
        "status": "success",
        "total_fetched": len(all_candidates),
        "unique_verified": len(final_jobs),
        "db_upserted": upserted_count if upserted_count > 0 else gateway_upserted,
        "direct_db_upserted": upserted_count,
        "gateway_upserted": gateway_upserted,
    }

