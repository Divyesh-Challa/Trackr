import asyncio
import json
import logging
from typing import Optional
import redis.asyncio as aioredis
import asyncpg
from app.config import config
from app.services.llm_extractor import llm_extractor
from app.services.embedding_engine import embedding_engine
from app.services.gap_analyzer import gap_analyzer
from app.services.email_classifier import email_classifier
from app.services.s3_storage import s3_service
from app.services.resume_extractor import resume_extractor
import base64

logger = logging.getLogger(__name__)

QUEUE_JD = "trackr:queue:jd_ingestion"
QUEUE_VEC = "trackr:queue:vectorization"
QUEUE_EMAIL = "trackr:queue:email_classification"
QUEUE_RESUME = "trackr:queue:resume_extraction"

async def process_jd_task(data: dict, pool: asyncpg.Pool):
    app_id = data.get("application_id")
    user_id = data.get("user_id")
    url = data.get("url")
    text = data.get("text")

    logger.info(f"Processing JD extraction for application {app_id}")
    extraction = await llm_extractor.extract(raw_text=text, url=url)

    # Upload snapshot to S3
    snapshot_key = f"snapshots/{app_id}.html"
    snapshot_content = f"<html><body><h1>{extraction.company_name} - {extraction.role_title}</h1><p>{text or url}</p></body></html>"
    s3_url = s3_service.upload_snapshot(snapshot_key, snapshot_content)

    # Run RAG Gap Analysis
    gap_result = await gap_analyzer.analyze(pool, user_id, extraction.requirements)
    match_score = gap_result["coverage_score"]

    async with pool.acquire() as conn:
        update_query = """
            UPDATE applications
            SET company_name = $1,
                role_title = $2,
                job_location = $3,
                work_model = $4,
                salary_range = $5,
                snapshot_s3_key = $6,
                match_score = $7,
                match_details = $8::jsonb,
                updated_at = NOW()
            WHERE id = $9::uuid;
        """
        await conn.execute(
            update_query,
            extraction.company_name,
            extraction.role_title,
            extraction.job_location,
            extraction.work_model,
            extraction.salary_range,
            s3_url,
            match_score,
            json.dumps(gap_result),
            app_id
        )
    logger.info(f"Completed JD ingestion for {app_id} (Match Score: {match_score}%)")

async def process_vectorization_task(data: dict, pool: asyncpg.Pool):
    bullet_id = data.get("bullet_id")
    content = data.get("content", "")

    logger.info(f"Vectorizing resume bullet {bullet_id}")
    vec = embedding_engine.embed_text(content)
    vec_str = "[" + ",".join(str(x) for x in vec) + "]"

    async with pool.acquire() as conn:
        query = """
            UPDATE resume_bullets
            SET embedding = $1::vector
            WHERE id = $2::uuid;
        """
        await conn.execute(query, vec_str, bullet_id)
    logger.info(f"Vectorized and indexed bullet {bullet_id}")

async def process_email_task(data: dict, pool: asyncpg.Pool):
    log_id = data.get("log_id")
    sender = data.get("sender", "")
    subject = data.get("subject", "")
    body = data.get("body", "")

    logger.info(f"Classifying inbound email log {log_id}")
    res = await email_classifier.classify(sender, subject, body)

    async with pool.acquire() as conn:
        # Update email log
        await conn.execute(
            """
            UPDATE inbound_email_logs
            SET classified_intent = $1,
                confidence_score = $2
            WHERE id = $3::uuid;
            """,
            res["intent"],
            res["confidence"],
            log_id
        )

        # If matched application and OA/Interview detected, create milestone
        row = await conn.fetchrow(
            "SELECT application_id FROM inbound_email_logs WHERE id = $1::uuid",
            log_id
        )
        if row and row["application_id"] and res["deadline_at"]:
            app_id = row["application_id"]
            milestone_type = "OA" if res["intent"] == "OA_INVITATION" else "INTERVIEW"
            await conn.execute(
                """
                INSERT INTO application_milestones (
                    id, application_id, milestone_type, deadline_at, is_completed, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3::timestamptz, FALSE, NOW()
                )
                """,
                app_id,
                milestone_type,
                res["deadline_at"]
            )
            logger.info(f"Auto-scheduled milestone for app {app_id} from inbound email")

async def process_resume_task(data: dict, pool: asyncpg.Pool):
    user_id = data.get("user_id", "00000000-0000-0000-0000-000000000001")
    filename = data.get("file_name", "resume.txt")
    raw_content = data.get("content", "")

    file_bytes = b""
    try:
        # Check if content is base64 encoded
        file_bytes = base64.b64decode(raw_content)
    except Exception:
        file_bytes = raw_content.encode("utf-8")

    logger.info(f"Processing background resume extraction for user {user_id} ({filename})")
    await resume_extractor.parse_and_embed(
        file_bytes=file_bytes,
        filename=filename,
        user_id=user_id,
        pool=pool
    )

async def start_consumer(pool: asyncpg.Pool):
    rdb = aioredis.from_url(config.REDIS_URL, decode_responses=True)
    logger.info("Redis Task Consumer started. Listening on queues...")

    while True:
        try:
            # Poll queues with 1s timeout
            item = await rdb.brpop([QUEUE_JD, QUEUE_VEC, QUEUE_EMAIL, QUEUE_RESUME], timeout=1)
            if item:
                queue_name, raw_payload = item
                data = json.loads(raw_payload)

                if queue_name == QUEUE_JD:
                    await process_jd_task(data, pool)
                elif queue_name == QUEUE_VEC:
                    await process_vectorization_task(data, pool)
                elif queue_name == QUEUE_EMAIL:
                    await process_email_task(data, pool)
                elif queue_name == QUEUE_RESUME:
                    await process_resume_task(data, pool)
        except Exception as e:
            logger.error(f"Error in task consumer loop: {e}")
            await asyncio.sleep(1)
