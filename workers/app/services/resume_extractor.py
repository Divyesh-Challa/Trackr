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

    async def parse_and_embed(
        self,
        file_bytes: bytes,
        filename: str,
        user_id: str,
        pool: asyncpg.Pool
    ) -> List[Dict[str, Any]]:
        """
        End-to-end pipeline:
        1. Extract text from file bytes (PDF, DOCX, TXT)
        2. Extract STAR bullets & skills
        3. Compute 768d dense vector embedding for each
        4. Insert into PostgreSQL resume_bullets table
        """
        raw_text = self.extract_text_from_file(file_bytes, filename)
        bullets_data = await self.extract_bullets_from_text(raw_text)

        inserted_bullets = []
        async with pool.acquire() as conn:
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

        logger.info(f"Successfully extracted and embedded {len(inserted_bullets)} resume bullets for user {user_id} from {filename}.")
        return inserted_bullets

resume_extractor = ResumeExtractor()
