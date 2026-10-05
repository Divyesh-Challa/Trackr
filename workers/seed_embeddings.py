import asyncio
import asyncpg
from app.config import config
from app.services.embedding_engine import embedding_engine

async def main():
    if not config.DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required")
    db_url = config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    pool = await asyncpg.create_pool(db_url)
    async with pool.acquire() as conn:
        # Embed resume bullets
        bullets = await conn.fetch("SELECT id, content FROM resume_bullets WHERE embedding IS NULL")
        print(f"Embedding {len(bullets)} resume bullets...")
        for b in bullets:
            vec = embedding_engine.embed_text(b["content"])
            vec_str = "[" + ",".join(str(x) for x in vec) + "]"
            await conn.execute("UPDATE resume_bullets SET embedding = $1::vector WHERE id = $2", vec_str, b["id"])

        # Embed discovered jobs
        jobs = await conn.fetch("SELECT id, role_title, description, skills FROM discovered_jobs WHERE embedding IS NULL")
        print(f"Embedding {len(jobs)} discovered jobs...")
        for j in jobs:
            text = f"{j['role_title']} {j['description']} {j['skills']}"
            vec = embedding_engine.embed_text(text)
            vec_str = "[" + ",".join(str(x) for x in vec) + "]"
            await conn.execute("UPDATE discovered_jobs SET embedding = $1::vector WHERE id = $2", vec_str, j["id"])

    await pool.close()
    print("All vector embeddings generated and stored successfully.")

if __name__ == "__main__":
    asyncio.run(main())
