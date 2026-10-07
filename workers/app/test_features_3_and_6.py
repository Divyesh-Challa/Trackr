import asyncio
import asyncpg
from app.config import config
from app.services.headless_scraper import headless_scraper
from app.services.cover_letter_generator import cover_letter_generator

async def test_feature_6_scraper():
    print("--- [TEST 1] Testing Feature 6: Playwright Headless Browser Scraper ---")
    test_url = "https://example.com"
    res = await headless_scraper.scrape_url(test_url)
    assert "Example Domain" in res["title"] or "Example Domain" in res["content"]
    assert res["method"] == "playwright_headless"
    print(f"PASS: Scraped {res['url']} with {res['method']}. Title: '{res['title']}'. Content chars: {res['char_count']}")

async def test_feature_3_outreach():
    print("\n--- [TEST 2] Testing Feature 3: RAG Cover Letter & Outreach Generator ---")
    db_url = config.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    pool = await asyncpg.create_pool(db_url)
    
    async with pool.acquire() as conn:
        app_row = await conn.fetchrow("SELECT id, company_name, role_title FROM applications LIMIT 1")
        if not app_row:
            print("FAIL: No applications found in DB")
            await pool.close()
            return
        app_id = str(app_row["id"])

    # Test COVER_LETTER
    cl_res = await cover_letter_generator.generate_outreach(
        application_id=app_id,
        user_id="00000000-0000-0000-0000-000000000001",
        outreach_type="COVER_LETTER",
        tone="IMPACT_DRIVEN",
        pool=pool
    )
    assert len(cl_res["content"]) > 100
    assert len(cl_res["matched_bullets"]) > 0
    print(f"PASS: Generated Cover Letter for {cl_res['company_name']} - {cl_res['role_title']}")
    print(f"Subject: {cl_res['subject']}")
    print(f"Evidence bullets used: {len(cl_res['matched_bullets'])}")

    # Test LINKEDIN_NOTE
    li_res = await cover_letter_generator.generate_outreach(
        application_id=app_id,
        user_id="00000000-0000-0000-0000-000000000001",
        outreach_type="LINKEDIN_NOTE",
        tone="CONCISE",
        pool=pool
    )
    assert len(li_res["content"]) <= 300
    print(f"PASS: Generated LinkedIn Note ({len(li_res['content'])} chars): {li_res['content']}")

    # Test EMAIL_RECRUITER
    em_res = await cover_letter_generator.generate_outreach(
        application_id=app_id,
        user_id="00000000-0000-0000-0000-000000000001",
        outreach_type="EMAIL_RECRUITER",
        tone="TECHNICAL",
        pool=pool
    )
    assert "Dear" in em_res["content"]
    print(f"PASS: Generated Recruiter Cold Email: Subject '{em_res['subject']}'")

    await pool.close()

async def main():
    await test_feature_6_scraper()
    await test_feature_3_outreach()
    print("\nALL FEATURE 3 & FEATURE 6 INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
