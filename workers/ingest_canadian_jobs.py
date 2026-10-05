import asyncio
import asyncpg
from app.config import config
from app.services.canadian_ats_scraper import canadian_ats_scraper

async def main():
    print("=" * 70)
    print("Trackr Multi-Source Canadian ATS Scraper (BC & Alberta Scope)")
    print("Sources: Ashby (Jobber, Wealthsimple, Cohere, Float, Thinkific)")
    print("         Greenhouse (Hootsuite, Geotab, Ritual, Unbounce)")
    print("         Lever (AltaML)")
    print("=" * 70)

    if not config.DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required")
    db_url = config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Connecting to database...")
    pool = await asyncpg.create_pool(db_url)

    print("Scraping live public ATS APIs and computing 768d vector embeddings...")
    result = await canadian_ats_scraper.ingest_to_db(pool, max_jobs=80)
    print(f"Ingest Result: {result}")

    # Verify counts in database
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT count(*) FROM discovered_jobs")
        by_prov = await conn.fetch("SELECT province, count(*) as count FROM discovered_jobs GROUP BY province ORDER BY count DESC")
        by_company = await conn.fetch("SELECT company_name, count(*) as count FROM discovered_jobs GROUP BY company_name ORDER BY count DESC LIMIT 12")

        print("\n--- DATABASE SUMMARY ---")
        print(f"Total Discovered Jobs in Database: {total}")
        print("\nBreakdown by Province:")
        for r in by_prov:
            print(f"  {r['province']}: {r['count']} jobs")

        print("\nTop Employers:")
        for r in by_company:
            print(f"  {r['company_name']}: {r['count']} jobs")

    await pool.close()
    print("\nIngestion completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
