"""
Resume Tailor Service for Trackr.
Custom tailors a candidate's resume specifically to an exact job posting,
aligning experience bullets, technical skills, and projects with the job's core challenges.
Outputs structured JSON and complete LaTeX in Jake's Resume Template format:
(Based on /Users/divyeshchalla/Desktop/Jake's template.pdf).
"""

import json
import re
import logging
from typing import Dict, Any, List, Optional
import asyncpg
from app.config import config
from app.services.embedding_engine import embedding_engine

logger = logging.getLogger(__name__)

# Common tech keywords for matching
KEYWORD_VOCAB = [
    "Python", "Go", "Golang", "Java", "C++", "C#", "C", "Rust", "TypeScript", "JavaScript",
    "React", "Next.js", "Node.js", "Vue", "Angular", "FastAPI", "Flask", "Django", "Spring Boot",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "PostgreSQL", "MySQL", "Redis", "MongoDB",
    "GraphQL", "REST", "RESTful", "Kafka", "RabbitMQ", "Microservices", "Distributed Systems",
    "CI/CD", "Git", "GitHub", "Linux", "Terraform", "PyTorch", "TensorFlow", "Machine Learning",
    "AI", "Vector Search", "pgvector", "SQL", "Tailwind CSS", "Pandas", "NumPy"
]

LATEX_ESCAPE_MAP = {
    '&': r'\&',
    '%': r'\%',
    '$': r'\$',
    '#': r'\#',
    '_': r'\_',
    '{': r'\{',
    '}': r'\}',
    '~': r'\textasciitilde{}',
    '^': r'\textasciicircum{}',
    '\\': r'\textbackslash{}',
}
LATEX_ESCAPE_REGEX = re.compile(r'[&%$#_{}~^\\]')

def escape_latex(text: Any) -> str:
    """
    Escapes all LaTeX special characters in a single pass to ensure 100% clean compilation
    in TeX Live and Overleaf without recursive re-escaping.
    """
    if text is None:
        return ""
    s = str(text)
    return LATEX_ESCAPE_REGEX.sub(lambda m: LATEX_ESCAPE_MAP[m.group(0)], s)

class ResumeTailor:
    def __init__(self):
        self.gemini_model = None
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Initialized Gemini for Resume Tailor.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini for Resume Tailor: {e}")

    async def tailor_resume(
        self,
        company_name: str,
        role_title: str,
        job_description: str,
        user_id: str,
        pool: Optional[asyncpg.Pool] = None,
        candidate_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Custom tailors the candidate's resume to the exact job posting.
        Returns tailored resume data, ATS match metrics, and Jake's Template LaTeX.
        """
        # 1. Fetch Candidate Profile & Bullets
        profile = candidate_override or {}
        bullets = []

        if pool:
            try:
                async with pool.acquire() as conn:
                    # Fetch user profile
                    if not profile.get("full_name"):
                        p_row = await conn.fetchrow(
                            "SELECT * FROM user_profiles WHERE user_id = $1::uuid LIMIT 1",
                            user_id
                        )
                        if p_row:
                            profile = dict(p_row)
                            if isinstance(profile.get("education"), str):
                                profile["education"] = json.loads(profile["education"])
                            if isinstance(profile.get("skills"), str):
                                profile["skills"] = json.loads(profile["skills"])
                            if isinstance(profile.get("experiences"), str):
                                profile["experiences"] = json.loads(profile["experiences"])
                            if isinstance(profile.get("projects"), str):
                                profile["projects"] = json.loads(profile["projects"])

                    # Fetch active resume bullets
                    b_rows = await conn.fetch(
                        "SELECT category, content FROM resume_bullets WHERE user_id = $1::uuid ORDER BY created_at DESC",
                        user_id
                    )
                    bullets = [dict(r) for r in b_rows]
            except Exception as e:
                logger.warning(f"Error fetching profile from DB: {e}")

        # Default fallback candidate if profile not found in DB
        if not profile.get("full_name"):
            profile = {
                "full_name": "Divyesh Challa",
                "phone": "+1 (604) 555-0199",
                "email": "divyesh.challa@alumni.ubc.ca",
                "city": "Vancouver, BC",
                "linkedin_url": "linkedin.com/in/divyeshchalla",
                "github_url": "github.com/divyeshchalla",
                "portfolio_url": "divyesh.dev",
                "education": {
                    "school": "University of British Columbia (UBC)",
                    "degree": "Bachelor of Science in Computer Science",
                    "location": "Vancouver, BC",
                    "grad_term": "May 2027",
                    "gpa": "3.85 / 4.00"
                },
                "skills": ["Go", "Python", "TypeScript", "React", "Next.js", "PostgreSQL", "pgvector", "Redis", "Docker", "AWS", "FastAPI", "C++", "Git", "Linux"],
                "experiences": [
                    {
                        "role": "Software Engineering Intern",
                        "company": "Tech Internship Inc",
                        "location": "Vancouver, BC",
                        "start_date": "May 2025",
                        "end_date": "Aug 2025",
                        "bullets": [
                            "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.",
                            "Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 38%."
                        ]
                    }
                ],
                "projects": [
                    {
                        "name": "Trackr Career Hub",
                        "technologies": "Go, Next.js, PostgreSQL, pgvector, Redis, Docker",
                        "dates": "Jan 2026 – Present",
                        "bullets": [
                            "Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 100K+ document embeddings in <60ms.",
                            "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference."
                        ]
                    }
                ]
            }

        # 2. Extract Job Requirements & Keywords
        jd_text = f"{role_title} {company_name} {job_description}".lower()
        matched_keywords = []
        for kw in KEYWORD_VOCAB:
            if re.search(r"\b" + re.escape(kw.lower()) + r"\b", jd_text):
                matched_keywords.append(kw)

        if not matched_keywords:
            matched_keywords = ["Python", "Go", "PostgreSQL", "Docker", "Git", "REST"]

        # 3. AI Tailoring with Gemini or Deterministic Engine
        tailored_data = None
        if self.gemini_model:
            try:
                tailored_data = await self._tailor_with_gemini(
                    company_name, role_title, job_description, profile, bullets, matched_keywords
                )
            except Exception as e:
                logger.warning(f"Gemini resume tailoring error: {e}. Falling back to deterministic engine.")

        if not tailored_data:
            tailored_data = self._tailor_deterministic(
                company_name, role_title, job_description, profile, bullets, matched_keywords
            )

        # Ensure match_score is cleanly bounded 0-100%
        try:
            raw_score = tailored_data.get("match_score", 88)
            clean_score = int(float(str(raw_score).replace("%", "").strip()))
            tailored_data["match_score"] = min(100, max(0, clean_score))
        except Exception:
            tailored_data["match_score"] = 88

        # 4. Generate Jake's Template LaTeX
        latex_code = self._generate_jakes_latex(tailored_data)
        tailored_data["latex_source"] = latex_code

        return tailored_data

    async def _tailor_with_gemini(
        self,
        company_name: str,
        role_title: str,
        job_description: str,
        profile: Dict[str, Any],
        bullets: List[Dict[str, Any]],
        matched_keywords: List[str]
    ) -> Dict[str, Any]:
        prompt = f"""
You are an expert technical resume strategist specializing in software engineering applications.
Tailor the candidate's resume specifically for:
Company: {company_name}
Role Title: {role_title}
Job Description:
{job_description[:2500]}

Candidate Raw Profile:
Name: {profile.get('full_name')}
Contact: Phone: {profile.get('phone')}, Email: {profile.get('email')}, Location: {profile.get('city')}, LinkedIn: {profile.get('linkedin_url')}, GitHub: {profile.get('github_url')}
Education: {json.dumps(profile.get('education', {}))}
Experiences: {json.dumps(profile.get('experiences', []))}
Projects: {json.dumps(profile.get('projects', []))}
Skills: {json.dumps(profile.get('skills', []))}
Available Achievement Highlights:
{json.dumps([b.get('content', '') for b in bullets[:10]])}

Formatting Rules (Jake's Resume Template from Overleaf):
1. Re-order Technical Skills into 4 clear categories:
   - Languages: (Prioritize languages matching the job description first)
   - Frameworks: (Prioritize frameworks matching the job description first)
   - Developer Tools: (e.g. Git, Docker, AWS, Kubernetes, Linux)
   - Libraries / Databases: (e.g. PostgreSQL, Redis, pgvector, pandas, NumPy)
2. Tailor Experience bullet points:
   - Use high-impact STAR structure: [Action Verb] + [Specific Problem/Technology] + [Quantifiable Outcome with % or metric].
   - Subtly incorporate relevant vocabulary from {company_name}'s tech stack and challenges without inventing false degrees or fake employers.
3. Tailor Project bullet points:
   - Align with {company_name}'s domain (scale, latency, data pipelines, modern UI, AI/ML, or reliability).
4. Compute an accurate ATS Match Score (70-98%) based on keyword coverage and role alignment.

Return ONLY a valid JSON object with the following schema:
{{
  "match_score": 92,
  "matched_keywords": ["keyword1", "keyword2"],
  "tailoring_summary": "1-2 sentences explaining how this resume was tailored to {company_name}'s specific needs",
  "header": {{
    "name": "{profile.get('full_name')}",
    "phone": "{profile.get('phone')}",
    "email": "{profile.get('email')}",
    "linkedin": "{profile.get('linkedin_url', '')}",
    "github": "{profile.get('github_url', '')}",
    "location": "{profile.get('city', 'Canada')}"
  }},
  "education": [
    {{
      "school": "University of British Columbia (UBC)",
      "degree": "Bachelor of Science in Computer Science",
      "location": "Vancouver, BC",
      "dates": "Aug. 2023 – May 2027",
      "gpa": "3.85 / 4.00"
    }}
  ],
  "experience": [
    {{
      "role": "Software Engineering Intern",
      "company": "Company Name",
      "location": "Location",
      "dates": "Date Range",
      "bullets": [
        "bullet 1...",
        "bullet 2...",
        "bullet 3..."
      ]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "technologies": "Tech1, Tech2, Tech3",
      "dates": "Date Range",
      "bullets": [
        "bullet 1...",
        "bullet 2..."
      ]
    }}
  ],
  "skills": {{
    "languages": "...",
    "frameworks": "...",
    "developer_tools": "...",
    "libraries": "..."
  }}
}}
"""
        response = await self.gemini_model.generate_content_async(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        data = json.loads(text)
        return data

    def _tailor_deterministic(
        self,
        company_name: str,
        role_title: str,
        job_description: str,
        profile: Dict[str, Any],
        bullets: List[Dict[str, Any]],
        matched_keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Deterministic, zero-failure tailoring engine that aligns candidate profile
        to the target role and generates structured Jake's resume data.
        """
        # Clean URLs
        linkedin = (profile.get("linkedin_url") or "linkedin.com/in/divyeshchalla").replace("https://", "")
        github = (profile.get("github_url") or "github.com/divyeshchalla").replace("https://", "")

        # Categorize Skills
        all_skills = profile.get("skills", ["Python", "Go", "TypeScript", "React", "PostgreSQL", "Docker", "AWS", "Redis"])
        
        # Sort skills by match
        def prioritize(skill_list):
            return sorted(skill_list, key=lambda s: 0 if any(k.lower() == s.lower() for k in matched_keywords) else 1)

        known_languages = prioritize(["Go", "Python", "TypeScript", "JavaScript", "C++", "Java", "SQL", "HTML/CSS"])
        known_frameworks = prioritize(["React", "Next.js", "FastAPI", "Node.js", "Express", "Tailwind CSS", "Gin"])
        known_tools = prioritize(["Docker", "Git", "GitHub Actions", "AWS", "Linux", "Kubernetes", "PostgreSQL", "Redis"])
        known_libs = prioritize(["pgvector", "PyTorch", "HNSW", "REST APIs", "Pandas", "WebSocket"])

        # Experience Bullets
        exp_list = profile.get("experiences", [])
        tailored_experiences = []
        for exp in exp_list:
            comp = exp.get("company", "Tech Internship Inc")
            title = exp.get("role", "Software Engineering Intern")
            loc = exp.get("location", "Vancouver, BC")
            dates = f"{exp.get('start_date', 'May 2025')} – {exp.get('end_date', 'Present')}"
            orig_bullets = exp.get("bullets", [
                "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.",
                "Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 38%."
            ])
            # Add third bullet from available pool if present
            extra = next((b["content"] for b in bullets if b.get("category") == "EXPERIENCE"), None)
            if extra and len(orig_bullets) < 3:
                orig_bullets.append(extra)

            tailored_experiences.append({
                "role": title,
                "company": comp,
                "location": loc,
                "dates": dates,
                "bullets": orig_bullets[:3]
            })

        # Project Bullets
        proj_list = profile.get("projects", [])
        tailored_projects = []
        for p in proj_list:
            p_name = p.get("name", "Trackr Platform")
            tech = p.get("technologies") or (f"{matched_keywords[0]}, {matched_keywords[1]}, PostgreSQL, Docker" if len(matched_keywords) >= 2 else "Go, Next.js, PostgreSQL, Redis")
            p_bullets = p.get("bullets", [
                "Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 100K+ document embeddings in <60ms.",
                "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference."
            ])
            tailored_projects.append({
                "name": p_name,
                "technologies": tech,
                "dates": "Jan. 2026 – Present",
                "bullets": p_bullets[:3]
            })

        # Add second project if needed
        if len(tailored_projects) < 2:
            tailored_projects.append({
                "name": "Distributed Grocery Price Intelligence Engine",
                "technologies": "Python, FastAPI, Docker, SQLite, BeautifulSoup",
                "dates": "Oct. 2025 – Dec. 2025",
                "bullets": [
                    "Engineered automated crawler parsing 120+ weekly flyer deals across 6 Canadian supermarket chains with regex price normalization.",
                    "Implemented combinatorial branch-and-bound solver to optimize grocery basket expenditures, reducing candidate trip cost by 24%."
                ]
            })

        edu = profile.get("education", {})
        tailored_edu = [{
            "school": edu.get("school", "University of British Columbia (UBC)"),
            "degree": edu.get("degree", "Bachelor of Science in Computer Science"),
            "location": edu.get("location", "Vancouver, BC"),
            "dates": f"Sept. 2023 – {edu.get('grad_term', 'May 2027')}",
            "gpa": edu.get("gpa", "3.85 / 4.00")
        }]

        match_score = min(96, max(75, 70 + len(matched_keywords) * 4))

        return {
            "match_score": match_score,
            "matched_keywords": matched_keywords,
            "tailoring_summary": f"Tailored for {company_name}'s {role_title} role, emphasizing relevant system architecture, {', '.join(matched_keywords[:4])}, and high-throughput execution.",
            "header": {
                "name": profile.get("full_name", "Divyesh Challa"),
                "phone": profile.get("phone", "+1 (604) 555-0199"),
                "email": profile.get("email", "divyesh.challa@alumni.ubc.ca"),
                "linkedin": linkedin,
                "github": github,
                "location": profile.get("city", "Vancouver, BC")
            },
            "education": tailored_edu,
            "experience": tailored_experiences,
            "projects": tailored_projects,
            "skills": {
                "languages": ", ".join(known_languages[:7]),
                "frameworks": ", ".join(known_frameworks[:6]),
                "developer_tools": ", ".join(known_tools[:7]),
                "libraries": ", ".join(known_libs[:6])
            }
        }

    def _generate_jakes_latex(self, data: Dict[str, Any]) -> str:
        """
        Generates clean, compilable LaTeX source code replicating Jake's Resume template:
        (Based on /Users/divyeshchalla/Desktop/Jake's template.pdf).
        """
        h = data.get("header", {})
        name = escape_latex(h.get("name", "Divyesh Challa"))
        phone = escape_latex(h.get("phone", "+1 (604) 555-0199"))
        email_raw = (h.get("email") or "divyesh.challa@alumni.ubc.ca").replace("mailto:", "").strip()
        linkedin_raw = (h.get("linkedin") or "linkedin.com/in/divyeshchalla").replace("https://", "").replace("http://", "").strip()
        github_raw = (h.get("github") or "github.com/divyeshchalla").replace("https://", "").replace("http://", "").strip()

        email_display = escape_latex(email_raw)
        linkedin_display = escape_latex(linkedin_raw)
        github_display = escape_latex(github_raw)

        skills = data.get("skills", {})
        langs = escape_latex(skills.get("languages", "Python, Go, Java, TypeScript, C++, SQL"))
        fworks = escape_latex(skills.get("frameworks", "React, Next.js, FastAPI, Node.js, Tailwind CSS"))
        tools = escape_latex(skills.get("developer_tools", "Git, Docker, AWS, PostgreSQL, Redis, Linux"))
        libs = escape_latex(skills.get("libraries", "pgvector, HNSW, PyTorch, Pandas, REST APIs"))

        edu_items = data.get("education", [])
        exp_items = data.get("experience", [])
        proj_items = data.get("projects", [])

        latex = r"""%-------------------------
% Resume in Latex (Jake's Template)
% Author : Jake Ryan / Divyesh Challa
% License : MIT
%------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{} % clear all header and footer fields
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Adjust margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\pdfgentounicode=1

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge \scshape """ + name + r"""} \\ \vspace{1pt}
    \small """ + phone + r""" $|$ \href{mailto:""" + email_raw + r"""}{\underline{""" + email_display + r"""}} $|$ 
    \href{https://""" + linkedin_raw + r"""}{\underline{""" + linkedin_display + r"""}} $|$
    \href{https://""" + github_raw + r"""}{\underline{""" + github_display + r"""}}
\end{center}


%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
"""
        for edu in edu_items:
            school = escape_latex(edu.get("school", "University of British Columbia"))
            loc = escape_latex(edu.get("location", "Vancouver, BC"))
            degree = escape_latex(edu.get("degree", "Bachelor of Science in Computer Science"))
            if edu.get("gpa"):
                degree += f" (GPA: {escape_latex(edu.get('gpa'))})"
            dates = escape_latex(edu.get("dates", "Sept. 2023 – May 2027"))
            latex += f"""    \\resumeSubheading
      {{{school}}}{{{loc}}}
      {{{degree}}}{{{dates}}}
"""
        latex += r"""  \resumeSubHeadingListEnd


%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
"""
        for exp in exp_items:
            role = escape_latex(exp.get("role", "Software Engineering Intern"))
            dates = escape_latex(exp.get("dates", "May 2025 – Aug. 2025"))
            company = escape_latex(exp.get("company", "Tech Company"))
            loc = escape_latex(exp.get("location", "Vancouver, BC"))
            latex += f"""    \\resumeSubheading
      {{{role}}}{{{dates}}}
      {{{company}}}{{{loc}}}
      \\resumeItemListStart
"""
            for b in exp.get("bullets", []):
                clean_b = escape_latex(b)
                latex += f"        \\resumeItem{{{clean_b}}}\n"
            latex += "      \\resumeItemListEnd\n\n"

        latex += r"""  \resumeSubHeadingListEnd


%-----------PROJECTS-----------
\section{Projects}
    \resumeSubHeadingListStart
"""
        for proj in proj_items:
            p_name = escape_latex(proj.get("name", "Project"))
            tech = escape_latex(proj.get("technologies", "Go, Python, Docker"))
            p_dates = escape_latex(proj.get("dates", "Jan. 2026 – Present"))
            latex += f"""      \\resumeProjectHeading
          {{\\textbf{{{p_name}}} $|$ \\emph{{{tech}}}}}{{{p_dates}}}
          \\resumeItemListStart
"""
            for b in proj.get("bullets", []):
                clean_b = escape_latex(b)
                latex += f"            \\resumeItem{{{clean_b}}}\n"
            latex += "          \\resumeItemListEnd\n\n"

        latex += r"""    \resumeSubHeadingListEnd


%-----------TECHNICAL SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: """ + langs + r"""} \\
     \textbf{Frameworks}{: """ + fworks + r"""} \\
     \textbf{Developer Tools}{: """ + tools + r"""} \\
     \textbf{Libraries}{: """ + libs + r"""}
    }}
 \end{itemize}

%-------------------------------------------
\end{document}
"""
        return latex

resume_tailor = ResumeTailor()
