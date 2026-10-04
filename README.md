# Trackr — Career Pipeline & Internship Accelerator

> Built by **Divyesh Challa** (Computer Science, University of British Columbia)  
> **Live Demo:** [trackr-portal.vercel.app](https://trackr-portal.vercel.app) • **API Gateway:** [trackr-gateway.onrender.com](https://trackr-gateway.onrender.com/health)

[![Next.js 15](https://img.shields.io/badge/Next.js-15%20App%20Router-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.24%2B-00ADD8?style=flat&logo=go)](https://go.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791?style=flat&logo=postgresql)](https://github.com/pgvector/pgvector)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4%20(Simplify%20Theme)-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

Trackr is an end-to-end career platform designed specifically for university students navigating high-volume Canadian tech co-op and internship recruiting cycles.

---

## Why I Built Trackr

Applying to hundreds of software engineering internships every term is exhausting:
1. **Spreadsheet Chaos:** Tracking 50–150 applications across Google Sheets or Notion leads to broken links, missed follow-ups, and forgotten interview deadlines.
2. **Stale Job Postings:** Most scrapers ingest stale listings from 2024 or 2025, or link to expired Greenhouse/Lever pages that 404 when you click them.
3. **Time-Consuming Tailoring:** Customizing a resume and cover letter for every single role takes hours, and generic AI cover letters sound robotic and get rejected.
4. **Interview Anxiety:** Practicing behavioral and technical interview questions alone in front of a mirror doesn't provide actionable feedback on whether your answers follow the **STAR method**.

I built Trackr to solve these pain points in a single, high-performance platform.

---

## Key Features

### 1. Curated Canadian Tech Jobs Feed (2027+ Focus)
* **Real-Time Job Ingestion:** Aggregates verified student postings from top Canadian tech trackers (Job Bank Canada, Canadian-Tech-Internships, Ashby, Greenhouse, Lever).
* **Strict Freshness & Link Validation:** Actively filters out stale 2024/2025 listings, closed postings, and broken URLs. Only serves verified **2027 and forward** Canadian roles (BC, Alberta, Ontario, Quebec, Remote).
* **One-Click Add to Board:** Move any job directly into your tracking pipeline with one click.

### 2. Resume Studio with Jake's Resume Format
* **ATS-Optimized Single-Page Layout:** Formatted strictly in the widely-used **Jake's Resume** template (Computer Modern serif typography, clean 0.5" margins, small-caps section headers, pipe-separated contact bar).
* **Job-Specific Tailoring:** Select any target job or paste a job description. The engine calculates an **ATS match score (0–100%)**, highlights matched keywords, and orders technical skills by relevance.
* **Instant Export Options:** One-click **Print / Save PDF** (clean single-page print stylesheet), **Copy LaTeX code** (ready to paste into Overleaf), or copy plain text for application portals.

### 3. High-Converting Cover Letter Generator
* **Pain-Point Matching:** Focuses on the "What You'll Do" section of the job posting to identify the employer's top 3 engineering pain points rather than arbitrary requirements.
* **Dialect & Metric Alignment:** Directly maps candidate metrics to the employer's exact technical terminology.
* **Authentic Company Research:** Highlights genuine team values and initiatives without generic filler.
* **Zero Guesswork Salutation:** Defaults safely to `Hi [Company] Hiring Team,` when a hiring manager isn't publicly listed, avoiding awkward hallucinations.

### 4. Interactive AI Interview Simulator
* **Company & Role Tailored Challenges:** Simulates real interview rounds customized to top Canadian employers (Shopify, Amazon, Clio, Hootsuite, RBC).
* **Multi-Turn Conversational Rounds:** Progressive 3-round interview flow where the AI interviewer asks **dynamic follow-up questions** probing into trade-offs, concurrency, and failure modes.
* **Instant STAR Rubric Scoring:** Live feedback across Situation, Task, Action, and Result with percentage scores and coaching tips.
* **Voice Integration (Web Speech API):** Speak your answers naturally using microphone dictation (`SpeechRecognition`) and listen to questions read aloud (`speechSynthesis`).
* **Hiring Committee Debrief:** Concludes with an official recommendation (`Strong Hire`, `Hire`, `Leaning Hire`, `Needs Practice`), key strengths, growth areas, and a model response architecture.

### 5. Application Pipeline & CRM
* **Interactive Kanban Board:** Manage applications across `Wishlist`, `Applied`, `Interviewing`, `Offer`, and `Rejected` with smooth drag-and-drop and optimistic UI updates.
* **Per-Job Hub:** Track deadlines, follow-up tasks, recruiter contacts (names, emails, LinkedIn), and interview notes for every company.
* **Simplify.jobs Aesthetic:** Crisp light theme (`#F8FAFC` background, white cards, subtle borders, Simplify blue accents) designed for clean readability.

---

## System Architecture

```text
                     +---------------------------------------+
                     |         Next.js 15 Client             |
                     |  (React 19, Tailwind CSS, TanStack)   |
                     +-------------------+-------------------+
                                         |
                       HTTP REST / SSE   |   Proxy
                                         v
                     +---------------------------------------+
                     |          Go REST Gateway              |
                     |         (Gin, pgxpool, :8080)         |
                     +---------+-------------------+---------+
                               |                   |
            Direct Queries /   |                   | Async Tasks /
            State Transitions  |                   | Forwarding
                               v                   v
            +----------------------+   +-----------------------+
            |    PostgreSQL 16     |   |   Python AI Worker    |
            |     + pgvector       |   |   (FastAPI, :8085)    |
            | (Applications, Jobs, |   | (Resume Tailor, STAR  |
            |  Profile, Embeddings)|   |  Simulator, Ingest)   |
            +----------------------+   +-----------+-----------+
                                                   |
                                                   v
                                       +-----------------------+
                                       |   FastEmbed / Gemini  |
                                       |  768d Dense Vectors   |
                                       +-----------------------+
```

### Engineering Decisions & Trade-Offs

1. **Go for the API Gateway:**
   - Go's lightweight concurrency model (`goroutines`) and compiled binary provide sub-15ms responses for critical paths like Kanban board updates, status transitions, and user profile management.
2. **PostgreSQL with `pgvector`:**
   - Keeping relational application state and 768-dimensional vector embeddings in a single database eliminates the operational overhead of a separate vector database (like Pinecone) while allowing atomic transactions.
3. **Python for Specialized AI & Scraping:**
   - Python handles document parsing (`pypdf`, `python-docx`), embeddings (`fastembed`), and structured LLM prompt generation where the ecosystem is strongest.
4. **Optimistic UI with TanStack Query:**
   - Card movements on the Kanban board update immediately in the UI before server confirmation, rolling back gracefully if a network issue occurs.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query v5, Lucide Icons |
| **Backend API** | Go 1.24, Gin Web Framework, pgxpool, Go-Redis |
| **AI & Workers** | Python 3.12, FastAPI, Asyncpg, FastEmbed, Google Gemini API, Web Speech API |
| **Database & Cache** | PostgreSQL 16 (`pgvector`), Redis 7 |
| **Infrastructure** | Docker, Docker Compose, Render (Gateway), Vercel (Frontend), Supabase |

---

## Getting Started Locally

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/) & npm
- [Python 3.11+](https://www.python.org/)

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Divyesh-Challa/Trackr.git
cd Trackr
cp .env.example .env
```

### 2. Start PostgreSQL & Redis
```bash
docker compose up -d postgres redis
```

### 3. Start the Go Gateway
```bash
cd gateway
go run cmd/server/main.go
```
The gateway will start on `http://localhost:8080`.

### 4. Start the Python AI Worker
```bash
cd workers
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8085
```
The worker will listen on `http://localhost:8085`.

### 5. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```text
trackr/
├── frontend/                  # Next.js 15 web application
│   ├── src/app/
│   │   ├── page.tsx           # Kanban board & application tracker
│   │   ├── discover/          # Canadian tech job feed (2027+)
│   │   ├── resume/            # Resume studio & cover letter generator
│   │   ├── simulator/         # Interactive AI interview simulator
│   │   └── profile/           # Canonical profile & ATS autofill export
│   └── src/components/        # UI components (Jake's Resume preview, drawers, modals)
├── gateway/                   # Go REST API gateway
│   ├── cmd/server/main.go     # Route definitions & HTTP server
│   └── internal/              # Handlers, models, database pool, redis client
├── workers/                   # Python microservices
│   ├── app/main.py            # FastAPI endpoints & worker logic
│   └── app/services/          # Resume tailoring, interview simulator, scrapers
├── db/                        # SQL migrations & seed data
└── docker-compose.yml         # Local container orchestration
```

---

## Contact & Credits

Created by **Divyesh Challa**  
- **LinkedIn:** [linkedin.com/in/divyesh-challa](https://linkedin.com/in/divyesh-challa)  
- **GitHub:** [github.com/Divyesh-Challa](https://github.com/Divyesh-Challa)  
- **Email:** divyeshchallavgr@gmail.com
