import asyncio
import asyncpg
from app.config import config
from app.services.resume_extractor import resume_extractor

async def main():
    db_url = config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    pool = await asyncpg.create_pool(db_url)
    user_id = "00000000-0000-0000-0000-000000000001"
    res = await resume_extractor.parse_and_embed(
        b"Built distributed Go gateway with Redis caching.",
        "test.txt",
        user_id,
        pool
    )
    print(f"Extracted and embedded {len(res)} bullet(s) into pgvector successfully.")
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
