import logging
import re
import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
import httpx
from bs4 import BeautifulSoup
from app.services.embedding_engine import embedding_engine

logger = logging.getLogger(__name__)

TARGET_CITIES = {
    "vancouver": ("Vancouver", "BC"),
    "burnaby": ("Burnaby", "BC"),
    "victoria": ("Victoria", "BC"),
    "richmond": ("Richmond", "BC"),
    "surrey": ("Surrey", "BC"),
    "kelowna": ("Kelowna", "BC"),
    "edmonton": ("Edmonton", "AB"),
    "calgary": ("Calgary", "AB"),
}

INTERNSHIP_KEYWORDS = [
    "intern", "internship", "co-op", "coop", "student",
    "summer 2027", "summer 2028", "fall 2027", "fall 2028",
    "winter 2027", "winter 2028", "work study"
]

EXCLUDE_SENIOR_KEYWORDS = [
    "senior", "sr.", "sr ", "principal", "staff", "lead",
    "director", "manager", "head of", "vp", "architect"
]

TECH_KEYWORDS = [
    "python", "typescript", "javascript", "react", "next.js", "node", "go", "golang",
    "java", "c++", "c#", "rust", "sql", "postgresql", "redis", "docker", "kubernetes",
    "aws", "gcp", "azure", "graphql", "rest", "ci/cd", "terraform", "linux", "distributed systems",
    "machine learning", "pytorch", "ai", "data engineering", "kafka", "spark", "agile",
]

class CanadianATSScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
        }

    def _is_student_or_intern_role(self, title: str) -> bool:
        t = title.lower()
        # Exclude senior / principal / staff / lead / manager roles
        if any(re.search(r'\b' + re.escape(w) + r'\b', t) for w in EXCLUDE_SENIOR_KEYWORDS):
            return False
        # Reject stale past years
        if any(stale in t for stale in ["2024", "2025"]):
            return False
        if "2026" in t and ("2027" not in t and "2028" not in t):
            return False
        # Require student / intern / co-op keywords
        return any(w in t for w in INTERNSHIP_KEYWORDS)

    def _clean_html(self, raw_html: str) -> str:
        if not raw_html:
            return ""
        soup = BeautifulSoup(raw_html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

    def _extract_skills(self, text: str) -> List[str]:
        lower = text.lower()
        skills = []
        for kw in TECH_KEYWORDS:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, lower):
                skills.append(kw.title() if kw not in ["aws", "gcp", "sql", "ai", "ci/cd"] else kw.upper())
        return list(dict.fromkeys(skills))[:12]

    def _classify_job_type(self, title: str) -> str:
        return "INTERNSHIP"

    def _classify_work_model(self, loc_str: str, workplace_type: str = "") -> str:
        s = f"{loc_str} {workplace_type}".lower()
        if "hybrid" in s:
            return "HYBRID"
        if "remote" in s:
            return "REMOTE"
        return "ONSITE"

    def _estimate_salary(self, job_type: str = "INTERNSHIP") -> str:
        return "$38 - $55 CAD/hr"

    def _match_canadian_location(self, loc_str: str, country: str = "") -> Optional[Tuple[str, str]]:
        if not loc_str:
            return None
        s = loc_str.lower().strip()

        # Check for explicit excluded countries
        if any(c in s for c in ["mexico", "united kingdom", "london", "poland", "germany", "india", "australia"]):
            return None
        if country and country.lower() not in ["ca", "canada", "can", ""]:
            return None

        # Check BC / AB cities
        for key, (city, prov) in TARGET_CITIES.items():
            if key in s:
                return city, prov

        # Check Canadian remote
        if "remote" in s and any(c in s for c in ["canada", "ca", "british columbia", "alberta", "bc", "ab"]):
            return "Remote", "REMOTE"

        if s in ["canada", "canada (remote)", "remote (canada)", "remote - canada", "canada - remote"]:
            return "Remote", "REMOTE"

        return None

    async def fetch_ashby(self, company_name: str, board_slug: str, domain: str) -> List[Dict[str, Any]]:
        url = f"https://api.ashbyhq.com/posting-api/job-board/{board_slug}"
        jobs = []
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Ashby board {board_slug} returned {resp.status_code}")
                    return []
                data = resp.json()
                for j in data.get("jobs", []):
                    title = j.get("title", "").strip()
                    if not self._is_student_or_intern_role(title):
                        continue

                    loc = j.get("location", "")
                    address_obj = j.get("address") or {}
                    country = address_obj.get("country", "")

                    loc_match = self._match_canadian_location(loc, country)
                    if not loc_match and j.get("isRemote"):
                        loc_match = self._match_canadian_location(f"{loc} canada remote", country)

                    if not loc_match:
                        for sec in j.get("secondaryLocations", []):
                            sec_loc = sec.get("location", "")
                            loc_match = self._match_canadian_location(sec_loc)
                            if loc_match:
                                break

                    if not loc_match:
                        continue

                    city, prov = loc_match
                    desc = self._clean_html(j.get("descriptionHtml") or j.get("descriptionPlain") or "")
                    if len(desc) < 50:
                        desc = f"{title} opportunity at {company_name} based in {city}, {prov}. Exciting Canadian tech position."

                    skills = self._extract_skills(f"{title} {desc}")
                    job_type = self._classify_job_type(title)
                    work_model = self._classify_work_model(loc, j.get("workplaceType", ""))
                    job_url = j.get("jobUrl") or f"https://jobs.ashbyhq.com/{board_slug}/{j.get('id')}"

                    jobs.append({
                        "company_name": company_name,
                        "company_domain": domain,
                        "role_title": title,
                        "city": city,
                        "province": prov,
                        "work_model": work_model,
                        "job_type": job_type,
                        "salary_range_cad": self._estimate_salary(job_type),
                        "job_url": job_url,
                        "description": desc,
                        "requirements": json.dumps([f"Experience with {s}" for s in skills[:4]]),
                        "skills": json.dumps(skills),
                    })
        except Exception as e:
            logger.error(f"Error scraping Ashby {board_slug}: {e}")
        return jobs

    async def fetch_greenhouse(self, company_name: str, board_slug: str, domain: str) -> List[Dict[str, Any]]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs?content=true"
        jobs = []
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Greenhouse board {board_slug} returned {resp.status_code}")
                    return []
                data = resp.json()
                for j in data.get("jobs", []):
                    title = j.get("title", "").strip()
                    if not self._is_student_or_intern_role(title):
                        continue

                    loc_dict = j.get("location") or {}
                    loc = loc_dict.get("name", "")

                    loc_match = self._match_canadian_location(loc)
                    if not loc_match:
                        # Check offices or departments
                        for off in j.get("offices", []):
                            off_loc = off.get("name", "") or off.get("location", "")
                            loc_match = self._match_canadian_location(off_loc)
                            if loc_match:
                                break

                    if not loc_match:
                        continue

                    city, prov = loc_match
                    desc = self._clean_html(j.get("content", ""))
                    if len(desc) < 50:
                        desc = f"{title} position at {company_name} located in {city}, {prov}. Innovative technology team."

                    skills = self._extract_skills(f"{title} {desc}")
                    job_type = self._classify_job_type(title)
                    work_model = self._classify_work_model(loc)
                    job_url = j.get("absolute_url") or f"https://boards.greenhouse.io/{board_slug}/jobs/{j.get('id')}"

                    jobs.append({
                        "company_name": company_name,
                        "company_domain": domain,
                        "role_title": title,
                        "city": city,
                        "province": prov,
                        "work_model": work_model,
                        "job_type": job_type,
                        "salary_range_cad": self._estimate_salary(job_type),
                        "job_url": job_url,
                        "description": desc,
                        "requirements": json.dumps([f"Experience with {s}" for s in skills[:4]]),
                        "skills": json.dumps(skills),
                    })
        except Exception as e:
            logger.error(f"Error scraping Greenhouse {board_slug}: {e}")
        return jobs

    async def fetch_lever(self, company_name: str, board_slug: str, domain: str) -> List[Dict[str, Any]]:
        url = f"https://api.lever.co/v0/postings/{board_slug}?mode=json"
        jobs = []
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Lever board {board_slug} returned {resp.status_code}")
                    return []
                data = resp.json()
                for j in data:
                    title = j.get("text", "").strip()
                    if not self._is_student_or_intern_role(title):
                        continue

                    cats = j.get("categories", {})
                    loc = cats.get("location", "")
                    country = j.get("country", "")

                    loc_match = self._match_canadian_location(loc, country)
                    if not loc_match:
                        for al in cats.get("allLocations", []):
                            loc_match = self._match_canadian_location(al, country)
                            if loc_match:
                                break

                    if not loc_match:
                        continue

                    city, prov = loc_match
                    desc = self._clean_html(j.get("descriptionPlain") or j.get("description") or "")
                    if len(desc) < 50:
                        desc = f"{title} opportunity at {company_name} based in {city}, {prov}."

                    skills = self._extract_skills(f"{title} {desc}")
                    job_type = self._classify_job_type(title)
                    work_model = self._classify_work_model(loc, j.get("workplaceType", ""))
                    job_url = j.get("hostedUrl") or j.get("applyUrl") or f"https://jobs.lever.co/{board_slug}/{j.get('id')}"

                    jobs.append({
                        "company_name": company_name,
                        "company_domain": domain,
                        "role_title": title,
                        "city": city,
                        "province": prov,
                        "work_model": work_model,
                        "job_type": job_type,
                        "salary_range_cad": self._estimate_salary(job_type),
                        "job_url": job_url,
                        "description": desc,
                        "requirements": json.dumps([f"Experience with {s}" for s in skills[:4]]),
                        "skills": json.dumps(skills),
                    })
        except Exception as e:
            logger.error(f"Error scraping Lever {board_slug}: {e}")
        return jobs

    async def aggregate_all_jobs(self) -> List[Dict[str, Any]]:
        """
        Gathers live Canadian tech student and internship postings across Ashby, Greenhouse, and Lever boards.
        """
        tasks = [
            # Ashby sources
            self.fetch_ashby("Jobber", "jobber", "getjobber.com"),
            self.fetch_ashby("Wealthsimple", "wealthsimple", "wealthsimple.com"),
            self.fetch_ashby("Cohere", "cohere", "cohere.com"),
            self.fetch_ashby("Float", "float", "floatcard.com"),
            self.fetch_ashby("Thinkific", "thinkific", "thinkific.com"),
            self.fetch_ashby("Bench", "bench", "bench.co"),
            # Greenhouse sources
            self.fetch_greenhouse("Hootsuite", "hootsuite", "hootsuite.com"),
            self.fetch_greenhouse("Geotab", "geotab", "geotab.com"),
            self.fetch_greenhouse("Ritual", "ritual", "ritual.co"),
            self.fetch_greenhouse("Unbounce", "unbounce", "unbounce.com"),
            self.fetch_greenhouse("StackAdapt", "stackadapt", "stackadapt.com"),
            self.fetch_greenhouse("Clio", "clio", "clio.com"),
            # Lever sources
            self.fetch_lever("AltaML", "altaml", "altaml.com"),
        ]

        results = await asyncio.gather(*tasks)
        all_jobs = []
        for job_list in results:
            all_jobs.extend(job_list)

        logger.info(f"Aggregated {len(all_jobs)} Canadian student/intern tech jobs across public ATS APIs.")
        return all_jobs

    async def ingest_to_db(self, pool, max_jobs: int = 100) -> Dict[str, Any]:
        """
        Aggregates jobs, generates 768d vector embeddings, and upserts into PostgreSQL discovered_jobs.
        """
        jobs = await self.aggregate_all_jobs()
        if not jobs:
            return {"status": "empty", "inserted": 0, "total": 0}

        target_jobs = jobs[:max_jobs]
        inserted_count = 0
        updated_count = 0

        async with pool.acquire() as conn:
            for j in target_jobs:
                # Generate pgvector 768-d embedding
                embed_text = f"{j['role_title']} {j['company_name']} {j['city']} {j['province']} {j['description'][:600]} {j['skills']}"
                vec = embedding_engine.embed_text(embed_text)
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"

                upsert_query = """
                INSERT INTO discovered_jobs (
                    company_name, company_domain, role_title, city, province,
                    work_model, job_type, salary_range_cad, job_url, description,
                    requirements, skills, embedding
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::vector
                )
                ON CONFLICT (job_url) DO UPDATE SET
                    role_title = EXCLUDED.role_title,
                    city = EXCLUDED.city,
                    province = EXCLUDED.province,
                    work_model = EXCLUDED.work_model,
                    job_type = EXCLUDED.job_type,
                    salary_range_cad = EXCLUDED.salary_range_cad,
                    description = EXCLUDED.description,
                    requirements = EXCLUDED.requirements,
                    skills = EXCLUDED.skills,
                    embedding = EXCLUDED.embedding
                RETURNING (xmax = 0) AS is_insert;
                """
                try:
                    row = await conn.fetchrow(
                        upsert_query,
                        j["company_name"],
                        j["company_domain"],
                        j["role_title"],
                        j["city"],
                        j["province"],
                        j["work_model"],
                        j["job_type"],
                        j["salary_range_cad"],
                        j["job_url"],
                        j["description"],
                        j["requirements"],
                        j["skills"],
                        vec_str,
                    )
                    if row and row["is_insert"]:
                        inserted_count += 1
                    else:
                        updated_count += 1
                except Exception as e:
                    logger.warning(f"Failed to upsert job {j['company_name']} - {j['role_title']}: {e}")

        return {
            "status": "success",
            "inserted": inserted_count,
            "updated": updated_count,
            "total_processed": len(target_jobs),
        }

canadian_ats_scraper = CanadianATSScraper()
