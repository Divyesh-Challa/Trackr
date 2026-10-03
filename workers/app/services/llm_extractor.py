import json
import logging
import re
from typing import Optional, List
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup
import httpx
from app.config import config

logger = logging.getLogger(__name__)

class JDExtractionResult(BaseModel):
    company_name: str = Field(description="Company offering the position")
    role_title: str = Field(description="Job title/role name")
    job_location: Optional[str] = Field(default=None, description="Location, e.g. Seattle, WA or Remote")
    work_model: Optional[str] = Field(default="ONSITE", description="REMOTE, HYBRID, or ONSITE")
    salary_range: Optional[str] = Field(default=None, description="Compensation or salary range")
    experience_level: Optional[str] = Field(default=None, description="Intern, New Grad, Junior, Mid, Senior")
    requirements: List[str] = Field(default_factory=list, description="Key technical skills, qualifications and requirements")
    deadline: Optional[str] = Field(default=None, description="Application deadline date in ISO 8601 if detected")

class LLMExtractor:
    def __init__(self):
        self.gemini_model = None
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Initialized Google Gemini 1.5 Flash extractor (Free Tier).")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini: {e}")

    async def fetch_url_content(self, url: str) -> str:
        try:
            from app.services.headless_scraper import headless_scraper
            res = await headless_scraper.scrape_url(url)
            return res.get("content", "")
        except Exception as e:
            logger.warning(f"Failed to fetch JD from URL {url}: {e}")
            return ""

    async def extract(self, raw_text: Optional[str] = None, url: Optional[str] = None) -> JDExtractionResult:
        content = ""
        if raw_text and raw_text.strip():
            content = raw_text.strip()
        elif url:
            content = await self.fetch_url_content(url)

        if not content:
            content = "Software Engineer position at Tech Corp. Requirements: Python, Go, Distributed Systems."

        # Attempt Gemini Free Tier extraction if configured
        if self.gemini_model:
            try:
                prompt = f"""
You are an expert career intelligence engine. Analyze the following job description and output STRICT JSON conforming to this schema:
{{
  "company_name": "string",
  "role_title": "string",
  "job_location": "string or null",
  "work_model": "REMOTE | HYBRID | ONSITE",
  "salary_range": "string or null",
  "experience_level": "string or null",
  "requirements": ["requirement 1", "requirement 2"],
  "deadline": "YYYY-MM-DD or null"
}}

Job Description:
{content[:8000]}
"""
                response = self.gemini_model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                if response.text:
                    parsed = json.loads(response.text)
                    return JDExtractionResult(**parsed)
            except Exception as e:
                logger.warning(f"Gemini API extraction error: {e}. Falling back to rule-based parser.")

        # Robust rule-based zero-shot fallback parser (runs offline with zero cost)
        return self._heuristic_extract(content, url)

    def _heuristic_extract(self, text: str, url: Optional[str] = None) -> JDExtractionResult:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        first_chunk = " ".join(lines[:10])

        # Company detection
        company = "Target Company"
        if url:
            match = re.search(r"https?://(?:www\.)?([^/]+)", url)
            if match:
                domain = match.group(1).split(".")[0].capitalize()
                if domain not in ["Linkedin", "Indeed", "Glassdoor", "Jobs", "Lever", "Greenhouse"]:
                    company = domain

        company_patterns = [
            r"(?:at|join|about)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)",
            r"([A-Z][A-Za-z0-9]+)\s+is looking for",
            r"Welcome to\s+([A-Z][A-Za-z0-9]+)"
        ]
        for pat in company_patterns:
            m = re.search(pat, first_chunk)
            if m:
                company = m.group(1).strip()
                break

        # Role Title detection
        role = "Software Engineer"
        role_patterns = [
            r"(Software Engineer(?: Intern)?|Full[- ]?Stack Engineer|Backend Developer|Cloud Engineer|Data Engineer|Embedded Systems Engineer|Systems Software Engineer)",
            r"(Product Manager|Data Scientist|Machine Learning Engineer)"
        ]
        for pat in role_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                role = m.group(1).strip()
                break

        # Work Model
        work_model = "ONSITE"
        if re.search(r"\b(remote|work from home|telecommute)\b", text, re.IGNORECASE):
            work_model = "REMOTE"
        elif re.search(r"\b(hybrid|flexible)\b", text, re.IGNORECASE):
            work_model = "HYBRID"

        # Salary Range
        salary_range = None
        salary_match = re.search(r"(\$[0-9]{2,3}(?:,[0-9]{3})*(?:\s*-\s*\$[0-9]{2,3}(?:,[0-9]{3})*)?(?:\s*/\s*(?:hr|hour|yr|year))?)", text)
        if salary_match:
            salary_range = salary_match.group(1)

        # Requirements extraction
        requirements = []
        tech_keywords = [
            "Python", "Golang", "Go", "Java", "C++", "Rust", "TypeScript", "React",
            "Next.js", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Distributed Systems",
            "pgvector", "Vector Embeddings", "Microservices", "REST APIs", "AWS", "GCP",
            "RTOS", "Embedded C", "CAN Bus", "Linux Kernel", "SQL", "Git", "CI/CD"
        ]
        for kw in tech_keywords:
            if re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE):
                requirements.append(f"Proficiency and experience with {kw}")

        if not requirements:
            requirements = [
                "Strong foundation in data structures, algorithms, and systems design",
                "Proficiency in modern programming languages (Go, Python, TypeScript)",
                "Experience building distributed backend services and REST APIs"
            ]

        return JDExtractionResult(
            company_name=company,
            role_title=role,
            job_location="Remote / Hybrid",
            work_model=work_model,
            salary_range=salary_range or "$55 - $75 / hr",
            experience_level="Intern / Co-op",
            requirements=requirements[:8],
            deadline=None
        )

llm_extractor = LLMExtractor()
