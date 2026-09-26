import asyncio
import os
import asyncpg
from dotenv import load_dotenv
from app.services.canadian_ats_scraper import canadian_ats_scraper
from app.services.embedding_engine import embedding_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://trackr:[REDACTED_PASSWORD]@localhost:5432/trackr_db?sslmode=disable")
CLEAN_DSN = DATABASE_URL.replace("?sslmode=disable", "")

# High-quality seeded Canadian student & tech internship roles
CURATED_INTERNSHIPS = [
    {
        "company_name": "Shopify",
        "company_domain": "shopify.com",
        "role_title": "Backend Developer Intern (Canada Remote)",
        "city": "Remote",
        "province": "REMOTE",
        "work_model": "REMOTE",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$52 - $60 CAD/hr",
        "job_url": "https://shopify.com/careers/backend-intern-canada",
        "description": "Build global merchant infrastructure at scale. Write high-throughput backend services that handle millions of requests during flash sales and Black Friday Cyber Monday.",
        "requirements": ["Currently enrolled in an accredited Canadian university degree or diploma program", "Experience writing code in Go, Ruby, Java, or Python", "Understanding of database query optimization and caching strategies", "Must be located anywhere in Canada"],
        "skills": ["Go", "Ruby", "Redis", "MySQL", "Kafka", "Distributed Systems"],
    },
    {
        "company_name": "Hootsuite",
        "company_domain": "hootsuite.com",
        "role_title": "Frontend Software Engineer Co-op",
        "city": "Vancouver",
        "province": "BC",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$40 - $46 CAD/hr",
        "job_url": "https://hootsuite.com/careers/frontend-coop",
        "description": "Join Hootsuite in Vancouver East Mount Pleasant to build responsive, accessible social media management interfaces using React, Next.js, and TypeScript.",
        "requirements": ["Enrolled in a Canadian post-secondary co-op program", "Strong understanding of React, TypeScript, and modern CSS frameworks", "Eye for UI/UX detail and performance optimization", "Based in Vancouver, BC"],
        "skills": ["React", "Next.js", "TypeScript", "Tailwind CSS", "REST APIs", "Jest"],
    },
    {
        "company_name": "Jobber",
        "company_domain": "getjobber.com",
        "role_title": "Infrastructure & Backend Co-op",
        "city": "Edmonton",
        "province": "AB",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$38 - $45 CAD/hr",
        "job_url": "https://getjobber.com/careers/backend-coop",
        "description": "Headquartered in Edmonton, Jobber helps small home-service businesses operate efficiently across North America. Join our Core Platform team to scale background workers and caching layers.",
        "requirements": ["Enrolled in an Alberta or Canadian post-secondary co-op stream", "Experience developing web backends in Ruby, Python, or Go", "Familiarity with relational databases and asynchronous job queues", "Curiosity for performance tuning and developer productivity tools"],
        "skills": ["Go", "Python", "PostgreSQL", "Redis", "Docker", "REST APIs"],
    },
    {
        "company_name": "Benevity",
        "company_domain": "benevity.com",
        "role_title": "Cloud Platform Engineer Co-op",
        "city": "Calgary",
        "province": "AB",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$40 - $46 CAD/hr",
        "job_url": "https://benevity.com/careers/cloud-coop",
        "description": "Benevity Calgary team powers corporate giving platforms for the world largest brands. Help engineer resilient cloud infrastructure, observability tooling, and Kubernetes clusters.",
        "requirements": ["Active enrollment in a Canadian university or college co-op program", "Foundational knowledge of Linux systems and cloud providers (AWS or GCP)", "Scripting skills in Python, Go, or Bash", "Eagerness to learn Infrastructure as Code (Terraform) and container orchestration"],
        "skills": ["AWS", "Kubernetes", "Terraform", "Python", "Linux", "Docker"],
    },
    {
        "company_name": "Garmin Canada",
        "company_domain": "garmin.com",
        "role_title": "Embedded Firmware Engineer Intern",
        "city": "Calgary",
        "province": "AB",
        "work_model": "ONSITE",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$42 - $48 CAD/hr",
        "job_url": "https://garmin.com/careers/calgary-embedded-intern",
        "description": "Based in Cochrane / Greater Calgary, Garmin Canada engineers world-class ANT+ wireless and fitness sensor technology. Design low-power embedded software in C/C++ on ARM microcontrollers.",
        "requirements": ["Pursuing degree in Computer Engineering, Electrical Engineering, or Computer Science", "Solid knowledge of embedded C, microcontrollers, and communication buses (SPI, I2C, UART)", "Experience with RTOS or bare-metal development", "Legally authorized to work in Canada"],
        "skills": ["C", "C++", "RTOS", "Embedded Systems", "Git", "Linux"],
    },
    {
        "company_name": "Electronic Arts (EA)",
        "company_domain": "ea.com",
        "role_title": "Software Engineer Intern (Vancouver)",
        "city": "Burnaby",
        "province": "BC",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$42 - $50 CAD/hr",
        "job_url": "https://ea.gr8people.com/jobs/burnaby-systems-intern",
        "description": "Based at EA Vancouver in Burnaby, work on core game subsystems, performance profiling, and graphics pipelines supporting next-gen titles.",
        "requirements": ["Enrolled in Computer Science or Software Engineering program in Canada", "Solid knowledge of modern C++ or C#", "Understanding of multithreading, data structures, and algorithms", "Located in or relocating to Greater Vancouver, BC"],
        "skills": ["C++", "C#", "Algorithms", "Graphics", "Git"],
    },
    {
        "company_name": "Clio",
        "company_domain": "clio.com",
        "role_title": "Full Stack Developer Co-op",
        "city": "Burnaby",
        "province": "BC",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$38 - $46 CAD/hr",
        "job_url": "https://clio.com/careers/fullstack-coop",
        "description": "Clio is transforming the legal experience for all. Join our product engineering team in Burnaby to build customer-facing cloud features using Ruby on Rails, TypeScript, and React.",
        "requirements": ["Enrolled in an accredited Canadian university co-op program", "Experience with TypeScript, React, Ruby, or Python", "Curiosity about building secure and accessible cloud applications", "Based in Metro Vancouver"],
        "skills": ["TypeScript", "React", "Ruby", "Rails", "PostgreSQL"],
    },
    {
        "company_name": "D-Wave Quantum",
        "company_domain": "dwavesys.com",
        "role_title": "Quantum Software Developer Intern",
        "city": "Burnaby",
        "province": "BC",
        "work_model": "ONSITE",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$44 - $52 CAD/hr",
        "job_url": "https://dwavesys.com/careers/quantum-software-intern",
        "description": "Work at the forefront of practical quantum computing in Burnaby, BC. Build Python-based hybrid quantum-classical solvers and Ocean SDK developer tools.",
        "requirements": ["Pursuing Bachelor or Master degree in Computer Science, Physics, or Math", "Proficiency in Python and numerical libraries (NumPy, SciPy)", "Interest in combinatorial optimization and quantum algorithms", "Based in Greater Vancouver, BC"],
        "skills": ["Python", "NumPy", "C++", "Quantum Computing", "Algorithms"],
    },
    {
        "company_name": "Amazon Vancouver",
        "company_domain": "amazon.com",
        "role_title": "Software Development Engineer (SDE) Intern",
        "city": "Vancouver",
        "province": "BC",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$55 - $64 CAD/hr",
        "job_url": "https://amazon.jobs/en/jobs/vancouver-sde-intern",
        "description": "Join Amazon Vancouver tech teams working on AWS services, digital retail infrastructure, and customer identity solutions at scale.",
        "requirements": ["Currently enrolled in a Bachelor or Master program in CS, CE, or related field graduating between Fall 2026 and Spring 2028 (2027 Cohort)", "Proficiency in Java, C++, Python, or Go", "Deep understanding of object-oriented design and algorithms", "Located in or willing to relocate to Vancouver, BC"],
        "skills": ["Java", "AWS", "Python", "Data Structures", "Distributed Systems"],
    },
    {
        "company_name": "AltaML",
        "company_domain": "altaml.com",
        "role_title": "Applied AI Developer Co-op",
        "city": "Edmonton",
        "province": "AB",
        "work_model": "HYBRID",
        "job_type": "INTERNSHIP",
        "salary_range_cad": "$38 - $44 CAD/hr",
        "job_url": "https://altaml.com/careers/ai-developer-coop",
        "description": "AltaML Edmonton is building applied machine learning products for healthcare, energy, and finance. Help train and deploy ML models and REST microservices.",
        "requirements": ["Enrolled in Computer Science, Data Science, or related co-op stream", "Strong foundation in Python, Pandas, and PyTorch or scikit-learn", "Familiarity with FastAPI and containerized deployments", "Based in Edmonton or Calgary, AB"],
        "skills": ["Python", "PyTorch", "FastAPI", "Machine Learning", "Docker"],
    },
]

async def clean_and_reingest():
    print("Connecting to PostgreSQL...")
    pool = await asyncpg.create_pool(CLEAN_DSN)

    async with pool.acquire() as conn:
        print("Cleaning non-internship postings from discovered_jobs...")
        deleted = await conn.execute("""
            DELETE FROM discovered_jobs 
            WHERE job_type != 'INTERNSHIP' 
               OR (role_title ~* '(senior|sr\\.|principal|staff|lead|director|manager|head of|vp)');
        """)
        print(f"Purged: {deleted}")

        print("Seeding curated Canadian tech student & co-op roles...")
        import json
        for j in CURATED_INTERNSHIPS:
            embed_text = f"{j['role_title']} {j['company_name']} {j['city']} {j['province']} {j['description'][:600]} {j['skills']}"
            vec = embedding_engine.embed_text(embed_text)
            vec_str = "[" + ",".join(str(x) for x in vec) + "]"

            await conn.execute("""
                INSERT INTO discovered_jobs (
                    company_name, company_domain, role_title, city, province,
                    work_model, job_type, salary_range_cad, job_url, description,
                    requirements, skills, embedding
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::vector
                )
                ON CONFLICT (job_url) DO UPDATE SET
                    role_title = EXCLUDED.role_title,
                    city = EXCLUDED.city,
                    province = EXCLUDED.province,
                    work_model = EXCLUDED.work_model,
                    job_type = EXCLUDED.job_type,
                    salary_range_cad = EXCLUDED.salary_range_cad,
                    description = EXCLUDED.description,
                    requirements = EXCLUDED.requirements,
                    skills = EXCLUDED.skills,
                    embedding = EXCLUDED.embedding;
            """,
                j["company_name"], j["company_domain"], j["role_title"], j["city"],
                j["province"], j["work_model"], j["job_type"], j["salary_range_cad"],
                j["job_url"], j["description"], json.dumps(j["requirements"]),
                json.dumps(j["skills"]), vec_str
            )

    print("Running Canadian ATS Scraper for live student and intern roles...")
    result = await canadian_ats_scraper.ingest_to_db(pool)
    print(f"Scraper Result: {result}")

    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT count(*) FROM discovered_jobs;")
        non_intern = await conn.fetchval("SELECT count(*) FROM discovered_jobs WHERE job_type != 'INTERNSHIP';")
        print(f"\nFinal State: Total {total} roles. Non-internships (must be 0): {non_intern}")
        rows = await conn.fetch("SELECT company_name, role_title, city, province, salary_range_cad FROM discovered_jobs ORDER BY company_name;")
        print("\nActive Canadian Tech Internships:")
        for r in rows:
            print(f"  • [{r['province']}] {r['company_name']} - {r['role_title']} ({r['city']}) | {r['salary_range_cad']}")

    await pool.close()

if __name__ == "__main__":
    asyncio.run(clean_and_reingest())
