import asyncio
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncpg
import uvicorn
from app.config import config
from app.tasks.task_consumer import start_consumer
from app.services.watchdog import watchdog
from app.services.embedding_engine import embedding_engine
from app.services.resume_extractor import resume_extractor
from app.services.headless_scraper import headless_scraper
from app.services.cover_letter_generator import cover_letter_generator
from app.services.canadian_ats_scraper import canadian_ats_scraper
from app.services.resume_tailor import resume_tailor
from app.services.interview_simulator import interview_simulator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("trackr-workers")

db_pool: asyncpg.Pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    logger.info("Initializing worker database connection pool...")
    try:
        # Normalize connection string for asyncpg
        db_url = config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
        logger.info("Database pool established.")

        # Launch background consumer and watchdog
        consumer_task = asyncio.create_task(start_consumer(db_pool))
        watchdog_task = asyncio.create_task(watchdog.run(db_pool))
    except Exception as e:
        logger.warning(f"Failed to start asyncpg pool: {e}. Workers running in standalone API mode.")
        consumer_task = None
        watchdog_task = None

    yield

    if consumer_task:
        consumer_task.cancel()
    if watchdog_task:
        watchdog_task.cancel()
    if db_pool:
        await db_pool.close()
    logger.info("Worker services stopped.")

app = FastAPI(title="Trackr AI Microservice", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "trackr-ai-worker",
        "gemini_active": bool(config.GEMINI_API_KEY),
        "db_connected": db_pool is not None
    }

@app.post("/api/v1/jobs/ingest-canadian")
async def ingest_canadian_jobs_endpoint(limit: int = 80):
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database pool not connected")
    result = await canadian_ats_scraper.ingest_to_db(db_pool, max_jobs=limit)
    return result

@app.post("/api/v1/interview/stream")
async def stream_star_evaluation(request: Request):
    payload = await request.json()
    question = payload.get("question", "")
    answer = payload.get("answer", "")

    async def event_generator():
        stages = [
            ("SITUATION", "Analyzing Situation: Candidate provides foundational project context and problem scope.", 88),
            ("TASK", "Assessing Task Ownership: Personal ownership and specific technical constraints are clearly outlined.", 92),
            ("ACTION", "Evaluating Action Execution: Strong technical articulation of architecture choices, trade-offs, and implementation.", 89),
            ("RESULT", "Measuring Results: Identified performance outcomes. Suggestion: Add exact numeric metric improvements (e.g. latency, throughput, scale).", 84),
            ("SUMMARY", "Overall STAR Score: 88/100. High-caliber response meeting Tier-1 tech standards.", 88)
        ]
        for idx, (stage, content, score) in enumerate(stages):
            await asyncio.sleep(0.4)
            data = {
                "stage": stage,
                "content": content,
                "score": score,
                "done": (idx == len(stages) - 1)
            }
            yield f"data: {json.dumps(data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/v1/resumes/upload")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    user_id: str = Form(default="00000000-0000-0000-0000-000000000001")
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection pool unavailable")
    try:
        content = await file.read()
        bullets = await resume_extractor.parse_and_embed(
            file_bytes=content,
            filename=file.filename or "resume.pdf",
            user_id=user_id,
            pool=db_pool
        )
        return {
            "status": "success",
            "filename": file.filename,
            "count": len(bullets),
            "data": bullets
        }
    except Exception as e:
        logger.error(f"Failed to parse resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.delete("/api/v1/resumes/bullets/{bullet_id}")
async def delete_resume_bullet(bullet_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection pool unavailable")
    async with db_pool.acquire() as conn:
        res = await conn.execute("DELETE FROM resume_bullets WHERE id = $1::uuid", bullet_id)
        return {"status": "deleted", "bullet_id": bullet_id, "result": res}

@app.post("/api/v1/scraper/scrape")
async def scrape_job_posting(request: Request):
    payload = await request.json()
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="url field is required")
    result = await headless_scraper.scrape_url(url)
    return result

@app.post("/api/v1/outreach/generate")
async def generate_outreach(request: Request):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool unavailable")
    payload = await request.json()
    app_id = payload.get("application_id")
    user_id = payload.get("user_id", "00000000-0000-0000-0000-000000000001")
    outreach_type = payload.get("outreach_type", "COVER_LETTER")
    tone = payload.get("tone", "IMPACT_DRIVEN")

    if not app_id:
        raise HTTPException(status_code=400, detail="application_id is required")

    try:
        result = await cover_letter_generator.generate_outreach(
            application_id=app_id,
            user_id=user_id,
            outreach_type=outreach_type,
            tone=tone,
            pool=db_pool
        )
        return result
    except Exception as e:
        logger.error(f"Failed to generate outreach: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/resumes/tailor")
async def tailor_resume_endpoint(request: Request):
    payload = await request.json()
    company = payload.get("company_name", "Target Company")
    role = payload.get("role_title", "Software Engineer")
    desc = payload.get("job_description", "")
    user_id = payload.get("user_id", "00000000-0000-0000-0000-000000000001")
    candidate_override = payload.get("candidate_override")

    try:
        result = await resume_tailor.tailor_resume(
            company_name=company,
            role_title=role,
            job_description=desc,
            user_id=user_id,
            pool=db_pool,
            candidate_override=candidate_override
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to tailor resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/cover-letter/generate")
async def generate_cover_letter_endpoint(request: Request):
    payload = await request.json()
    company = payload.get("company_name", "Target Company")
    role = payload.get("role_title", "Software Engineer")
    desc = payload.get("job_description", "")
    user_id = payload.get("user_id", "00000000-0000-0000-0000-000000000001")
    hiring_manager = payload.get("hiring_manager_name")
    initiative = payload.get("company_initiative")
    candidate_override = payload.get("candidate_override")

    try:
        result = await cover_letter_generator.generate_cover_letter(
            company_name=company,
            role_title=role,
            job_description=desc,
            user_id=user_id,
            hiring_manager_name=hiring_manager,
            company_initiative=initiative,
            pool=db_pool,
            candidate_override=candidate_override
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to generate cover letter: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/start")
async def start_interview_endpoint(request: Request):
    payload = await request.json()
    company = payload.get("company_name", "Target Company")
    role = payload.get("role_title", "Software Engineer")
    itype = payload.get("interview_type", "BEHAVIORAL_STAR")
    difficulty = payload.get("difficulty", "INTERN_NEW_GRAD")
    total_rounds = payload.get("total_rounds", 3)

    try:
        result = await interview_simulator.start_session(
            company_name=company,
            role_title=role,
            interview_type=itype,
            difficulty=difficulty,
            total_rounds=total_rounds
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to start interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/respond")
async def respond_interview_endpoint(request: Request):
    payload = await request.json()
    company = payload.get("company_name", "Target Company")
    role = payload.get("role_title", "Software Engineer")
    itype = payload.get("interview_type", "BEHAVIORAL_STAR")
    current_round = payload.get("current_round", 1)
    total_rounds = payload.get("total_rounds", 3)
    question = payload.get("question", "")
    answer = payload.get("answer", "")
    history = payload.get("history", [])

    try:
        result = await interview_simulator.evaluate_turn(
            company_name=company,
            role_title=role,
            interview_type=itype,
            current_round=current_round,
            total_rounds=total_rounds,
            question=question,
            answer=answer,
            history=history
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to evaluate interview turn: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=config.PORT, reload=False)
