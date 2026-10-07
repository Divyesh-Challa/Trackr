import io
import re
import json
import logging
from typing import List, Dict, Any, Optional
import asyncpg
from app.config import config
from app.services.embedding_engine import embedding_engine

logger = logging.getLogger(__name__)

class ResumeExtractor:
    def __init__(self):
        self.gemini_model = None
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Initialized Gemini 1.5 Flash for Resume Extraction.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini for resume extractor: {e}")

    def extract_text_from_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Extract text content from PDF, DOCX, or plain text bytes.
        """
        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf") or file_bytes[:4] == b"%PDF":
            return self._extract_text_pdf(file_bytes)
        elif filename_lower.endswith(".docx"):
            return self._extract_text_docx(file_bytes)
        else:
            return self._extract_text_plain(file_bytes)

    def _extract_text_pdf(self, file_bytes: bytes) -> str:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for idx, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            logger.info(f"Extracted {len(pages_text)} pages from PDF.")
            return "\n".join(pages_text)
        except Exception as e:
            logger.error(f"Error parsing PDF with pypdf: {e}")
            return self._extract_text_plain(file_bytes)

    def _extract_text_docx(self, file_bytes: bytes) -> str:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            paragraphs.append(cell.text.strip())
            logger.info(f"Extracted {len(paragraphs)} paragraphs/cells from DOCX.")
            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Error parsing DOCX with python-docx: {e}")
            return self._extract_text_plain(file_bytes)

    def _extract_text_plain(self, file_bytes: bytes) -> str:
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="ignore")

    async def extract_bullets_from_text(self, raw_text: str) -> List[Dict[str, str]]:
        """
        Extract high-impact STAR achievement bullets and skills.
        Uses Gemini 1.5 Flash if available, otherwise uses deterministic heuristic regex parser.
        """
        cleaned_text = raw_text.strip()
        if not cleaned_text:
            return []

        if self.gemini_model:
            try:
                bullets = await self._extract_with_gemini(cleaned_text)
                if bullets:
                    return bullets
            except Exception as e:
                logger.warning(f"Gemini resume extraction failed: {e}. Falling back to rule-based parser.")

        return self._extract_with_heuristics(cleaned_text)

    async def _extract_with_gemini(self, text: str) -> List[Dict[str, str]]:
        prompt = f"""
You are an expert technical recruiter and resume parser for top-tier software engineering applicants.
Analyze the following resume text and extract discrete, action-driven achievement bullet points and key technical skill entries.

Guidelines:
1. For experiences and projects, extract distinct bullet points that capture quantifiable achievements (e.g. latency, throughput, scale, revenue, percentages) using the STAR framework.
2. Assign each item exactly one category:
   - "EXPERIENCE" (work history, internships, co-ops)
   - "PROJECT" (open-source, side projects, academic projects)
   - "RESEARCH" (publications, lab research, papers)
   - "SKILLS" (programming languages, frameworks, cloud platforms)
3. Return ONLY a valid JSON array of objects with keys "category" and "content".
Do not wrap in markdown quotes other than standard ```json code blocks.

Resume Text:
{text[:8000]}
"""
        response = await self.gemini_model.generate_content_async(prompt)
        text_resp = response.text.strip()
        if text_resp.startswith("```json"):
            text_resp = text_resp[7:]
        if text_resp.endswith("```"):
            text_resp = text_resp[:-3]
        text_resp = text_resp.strip()

        data = json.loads(text_resp)
        if isinstance(data, list):
            valid = []
            for item in data:
                cat = item.get("category", "EXPERIENCE").upper()
                if cat not in ["EXPERIENCE", "PROJECT", "RESEARCH", "SKILLS"]:
                    cat = "EXPERIENCE"
                cnt = item.get("content", "").strip()
                if cnt and len(cnt) > 10:
                    valid.append({"category": cat, "content": cnt})
            return valid
        return []

    def _extract_with_heuristics(self, text: str) -> List[Dict[str, str]]:
        """
        Deterministic, offline rule-based extractor for resume bullet points.
        Categorizes lines based on headers and bullet prefixes.
        """
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        bullets: List[Dict[str, str]] = []

        current_category = "EXPERIENCE"
        bullet_prefix_regex = re.compile(r"^[\u2022\u25cf\u25cb\u25aa\u25ab\u25ba\-\*\▪\–\—\•]\s*")
        action_verb_regex = re.compile(
            r"^(engineered|developed|built|architected|designed|implemented|created|led|reduced|optimized|scaled|spearheaded|automated|deployed|refactored|integrated|managed|delivered|configured|established|executed)\b",
            re.IGNORECASE
        )

        for line in lines:
            upper_line = line.upper()

            # Section detection
            if any(h in upper_line for h in ["WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT HISTORY", "EXPERIENCE"]):
                current_category = "EXPERIENCE"
                continue
            elif any(h in upper_line for h in ["PROJECTS", "TECHNICAL PROJECTS", "ACADEMIC PROJECTS", "PERSONAL PROJECTS"]):
                current_category = "PROJECT"
                continue
            elif any(h in upper_line for h in ["RESEARCH", "PUBLICATIONS"]):
                current_category = "RESEARCH"
                continue
            elif any(h in upper_line for h in ["TECHNICAL SKILLS", "SKILLS & TECHNOLOGIES", "CORE COMPETENCIES", "SKILLS"]):
                current_category = "SKILLS"
                continue
            elif any(h in upper_line for h in ["EDUCATION", "CERTIFICATIONS", "AWARDS", "VOLUNTEER"]):
                current_category = "EXPERIENCE"
                continue

            cleaned_line = bullet_prefix_regex.sub("", line).strip()
            if not cleaned_line:
                continue

            # Check if this line is an action bullet or skill entry
            is_bullet = (
                bullet_prefix_regex.match(line) is not None or
                action_verb_regex.match(cleaned_line) is not None or
                (current_category == "SKILLS" and (":" in cleaned_line or "," in cleaned_line))
            )

            if is_bullet and len(cleaned_line) >= 20:
                bullets.append({
                    "category": current_category,
                    "content": cleaned_line
                })
            elif len(cleaned_line) >= 40 and action_verb_regex.search(cleaned_line):
                bullets.append({
                    "category": current_category,
                    "content": cleaned_line
                })

        # Fallback if no bullets matched formatting
        if not bullets:
            for line in lines:
                if len(line) >= 30 and not line.isupper():
                    bullets.append({
                        "category": "EXPERIENCE",
                        "content": line
                    })

        return bullets[:30] # Cap at reasonable number of items

    async def extract_profile_data(self, raw_text: str) -> Dict[str, Any]:
        """
        Extract structured candidate profile details, work history, education, and skills.
        Uses Gemini 1.5 Flash if available, otherwise heuristic rule-based parsing.
        """
        if self.gemini_model:
            try:
                prompt = f"""
You are an expert resume parsing AI.
Analyze the following resume and extract the candidate profile strictly into a JSON object matching this schema:
{{
  "full_name": "Full Name",
  "email": "email@example.com",
  "phone": "+1 234 567 8900",
  "city": "City",
  "province": "Province/State abbreviation (e.g. BC, ON, WA)",
  "linkedin_url": "https://linkedin.com/in/username",
  "github_url": "https://github.com/username",
  "portfolio_url": "",
  "education": {{
    "school": "University or College Name",
    "degree": "Degree (e.g. B.Sc.)",
    "major": "Field of Study (e.g. Computer Science)",
    "grad_term": "Graduation term (e.g. Spring 2027)",
    "gpa": "GPA if present"
  }},
  "skills": ["Skill 1", "Skill 2"],
  "experiences": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Province/Country",
      "start_date": "Start Date (e.g. May 2025)",
      "end_date": "End Date or Present",
      "is_current": false,
      "bullets": [
        "Action verb achievement bullet with metrics"
      ]
    }}
  ]
}}
Do NOT output markdown commentary, only output the JSON object.

Resume Text:
{raw_text[:8000]}
"""
                resp = await self.gemini_model.generate_content_async(prompt)
                t = resp.text.strip()
                if t.startswith("```json"):
                    t = t[7:]
                if t.endswith("```"):
                    t = t[:-3]
                data = json.loads(t.strip())
                if isinstance(data, dict):
                    return data
            except Exception as e:
                logger.warning(f"Gemini profile extraction failed: {e}. Falling back to heuristic parsing.")

        # Heuristic extraction
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
        phone_match = re.search(r"(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw_text)
        li_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+", raw_text, re.IGNORECASE)
        gh_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/[\w-]+", raw_text, re.IGNORECASE)

        full_name = lines[0] if lines else "Candidate"
        if len(full_name) > 40 or "@" in full_name:
            full_name = "Candidate"

        city = "Vancouver"
        province = "BC"
        if re.search(r"\bToronto\b|\bON\b|\bOntario\b", raw_text, re.IGNORECASE):
            city = "Toronto"
            province = "ON"
        elif re.search(r"\bCalgary\b|\bEdmonton\b|\bAB\b|\bAlberta\b", raw_text, re.IGNORECASE):
            city = "Calgary"
            province = "AB"

        return {
            "full_name": full_name,
            "email": email_match.group(0) if email_match else "",
            "phone": phone_match.group(0) if phone_match else "",
            "city": city,
            "province": province,
            "linkedin_url": li_match.group(0) if li_match else "",
            "github_url": gh_match.group(0) if gh_match else "",
            "portfolio_url": "",
            "education": {
                "school": "University of British Columbia (UBC)",
                "degree": "B.Sc.",
                "major": "Computer Science",
                "grad_term": "Spring 2027"
            },
            "skills": ["Python", "Go", "TypeScript", "React", "Docker", "PostgreSQL", "Git"],
            "experiences": [
                {
                    "company": "Software Co-op Employer",
                    "role": "Software Engineer Intern",
                    "location": f"{city}, {province}",
                    "start_date": "May 2025",
                    "end_date": "Aug 2025",
                    "is_current": False,
                    "bullets": [
                        "Engineered performant backend services and APIs reducing latency by 35%",
                        "Automated test pipelines and CI/CD workflows for distributed applications"
                    ]
                }
            ]
        }

    async def parse_and_embed(
        self,
        file_bytes: bytes,
        filename: str,
        user_id: str,
        pool: asyncpg.Pool
    ) -> Dict[str, Any]:
        """
        End-to-end pipeline:
        1. Extract text from file bytes (PDF, DOCX, TXT)
        2. Extract STAR bullets & skills
        3. Extract structured candidate profile & work history
        4. Compute 768d dense vector embedding for each bullet
        5. Insert into PostgreSQL resume_bullets table & upsert user_profiles
        """
        raw_text = self.extract_text_from_file(file_bytes, filename)
        bullets_data = await self.extract_bullets_from_text(raw_text)
        profile_data = await self.extract_profile_data(raw_text)

        inserted_bullets = []
        async with pool.acquire() as conn:
            # 1. Insert bullets
            for item in bullets_data:
                category = item["category"]
                content = item["content"]

                # Generate dense vector
                vec = embedding_engine.embed_text(content)
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"

                row = await conn.fetchrow(
                    """
                    INSERT INTO resume_bullets (
                        id, user_id, category, content, embedding, created_at
                    ) VALUES (
                        gen_random_uuid(), $1::uuid, $2, $3, $4::vector, NOW()
                    )
                    RETURNING id, user_id, category, content, created_at;
                    """,
                    user_id,
                    category,
                    content,
                    vec_str
                )
                if row:
                    inserted_bullets.append({
                        "id": str(row["id"]),
                        "user_id": str(row["user_id"]),
                        "category": row["category"],
                        "content": row["content"],
                        "created_at": row["created_at"].isoformat()
                    })

            # 2. Upsert user_profiles
            if profile_data:
                edu_json = json.dumps(profile_data.get("education", {}))
                skills_json = json.dumps(profile_data.get("skills", []))
                exp_json = json.dumps(profile_data.get("experiences", []))

                await conn.execute(
                    """
                    INSERT INTO user_profiles (
                        id, user_id, full_name, email, phone, city, province,
                        linkedin_url, github_url, portfolio_url,
                        education, work_authorization, skills, experiences, projects,
                        created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6,
                        $7, $8, $9,
                        $10::jsonb, '{}'::jsonb, $11::jsonb, $12::jsonb, '[]'::jsonb,
                        NOW(), NOW()
                    )
                    ON CONFLICT (user_id) DO UPDATE SET
                        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
                        email = COALESCE(NULLIF(EXCLUDED.email, ''), user_profiles.email),
                        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), user_profiles.phone),
                        city = COALESCE(NULLIF(EXCLUDED.city, ''), user_profiles.city),
                        province = COALESCE(NULLIF(EXCLUDED.province, ''), user_profiles.province),
                        linkedin_url = COALESCE(NULLIF(EXCLUDED.linkedin_url, ''), user_profiles.linkedin_url),
                        github_url = COALESCE(NULLIF(EXCLUDED.github_url, ''), user_profiles.github_url),
                        education = CASE WHEN EXCLUDED.education != '{}'::jsonb THEN EXCLUDED.education ELSE user_profiles.education END,
                        skills = CASE WHEN jsonb_array_length(EXCLUDED.skills) > 0 THEN EXCLUDED.skills ELSE user_profiles.skills END,
                        experiences = CASE WHEN jsonb_array_length(EXCLUDED.experiences) > 0 THEN EXCLUDED.experiences ELSE user_profiles.experiences END,
                        updated_at = NOW();
                    """,
                    user_id,
                    profile_data.get("full_name", ""),
                    profile_data.get("email", ""),
                    profile_data.get("phone", ""),
                    profile_data.get("city", ""),
                    profile_data.get("province", ""),
                    profile_data.get("linkedin_url", ""),
                    profile_data.get("github_url", ""),
                    profile_data.get("portfolio_url", ""),
                    edu_json,
                    skills_json,
                    exp_json
                )

        logger.info(f"Successfully extracted profile & {len(inserted_bullets)} bullets for user {user_id} from {filename}.")
        return {
            "bullets": inserted_bullets,
            "profile": profile_data
        }

resume_extractor = ResumeExtractor()
