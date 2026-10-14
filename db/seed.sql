-- Trackr Demo & Seed Data

-- Clear existing sample data
TRUNCATE TABLE application_state_transitions CASCADE;
TRUNCATE TABLE application_milestones CASCADE;
TRUNCATE TABLE inbound_email_logs CASCADE;
TRUNCATE TABLE resume_bullets CASCADE;
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE discovered_jobs CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- 1. Applications (Starts clean and empty - user can add via Discover or Job Ingest)
-- 2. State Transition Audit Log
-- 3. Milestones & Deadlines

-- 4. Candidate Resume Bullets
INSERT INTO resume_bullets (user_id, category, content) VALUES
('00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.'),
('00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 38%.'),
('00000000-0000-0000-0000-000000000001', 'PROJECT', 'Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 100K+ document embeddings in <60ms.'),
('00000000-0000-0000-0000-000000000001', 'PROJECT', 'Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference.'),
('00000000-0000-0000-0000-000000000001', 'RESEARCH', 'Developed multi-threaded C/C++ memory allocator benchmarking performance improvements against jemalloc on Linux kernels.');

-- 5. Canadian Tech Discovered Jobs (British Columbia & Alberta Focused)
INSERT INTO discovered_jobs (
    id, company_name, company_domain, role_title, city, province, work_model, job_type,
    salary_range_cad, job_url, description, requirements, skills, deadline_at
) VALUES
('22222222-2222-2222-2222-222222222201', 'Amazon Vancouver', 'amazon.com',
 'Software Development Engineer Intern (Fall / Winter 2026)', 'Vancouver', 'BC', 'HYBRID', 'INTERNSHIP',
 '$54 - $62 CAD/hr', 'https://amazon.jobs/en/jobs/vancouver-sde-intern',
 'Join Amazon Vancouver to build high-scale cloud services powering AWS and global retail infrastructure. You will design, build, and deploy distributed microservices.',
 '["Currently enrolled in Bachelor or Master in Computer Science or related engineering field", "Strong coding skills in Go, Java, or Python", "Knowledge of algorithms, data structures, and relational databases", "Authorized to work in Canada or valid Canadian Co-op Work Permit"]',
 '["Go", "Python", "Distributed Systems", "AWS", "PostgreSQL", "Docker"]',
 NOW() + INTERVAL '21 days'),

('22222222-2222-2222-2222-222222222202', 'Clio', 'clio.com',
 'Backend Software Engineer Co-op', 'Burnaby', 'BC', 'HYBRID', 'INTERNSHIP',
 '$46 - $52 CAD/hr', 'https://www.clio.com/careers/backend-coop',
 'Clio is Canada legal tech unicorn headquartered in Burnaby. Our engineering team develops scalable multi-tenant REST APIs, high-throughput background queues, and reliable database architectures.',
 '["Experience with backend languages such as Ruby, Python, or Go", "Familiarity with SQL (PostgreSQL or MySQL) and REST API principles", "Enrolled in a recognized Canadian university co-op program", "Passion for clean code, automated testing, and CI/CD pipelines"]',
 '["Go", "PostgreSQL", "REST APIs", "Docker", "Redis", "Ruby"]',
 NOW() + INTERVAL '14 days'),

('22222222-2222-2222-2222-222222222203', 'Electronic Arts (EA)', 'ea.com',
 'Systems Software Engineer (New Grad)', 'Burnaby', 'BC', 'ONSITE', 'NEW_GRAD',
 '$96,000 - $115,000 CAD', 'https://ea.gr8people.com/jobs/burnaby-systems-eng',
 'Based at EA Vancouver in Burnaby, work on next-generation game engines, network synchronization protocols, and asset processing pipelines supporting millions of concurrent players.',
 '["Bachelor degree in Computer Science, Computer Engineering, or equivalent completed within 12 months", "Solid proficiency in modern C++ (C++17/20) and memory management", "Understanding of multithreading, latency profiling, and network sockets", "Located in or willing to relocate to Greater Vancouver, BC"]',
 '["C++", "Systems Programming", "Multithreading", "Performance Profiling", "Python"]',
 NOW() + INTERVAL '30 days'),

('22222222-2222-2222-2222-222222222204', 'D-Wave Quantum', 'dwavesys.com',
 'Quantum Cloud Software Engineer', 'Burnaby', 'BC', 'HYBRID', 'FULL_TIME',
 '$105,000 - $130,000 CAD', 'https://dwavesys.com/careers/quantum-cloud',
 'Build and scale the world first quantum cloud platform Leap. You will implement distributed job scheduling, telemetry pipelines, and hybrid quantum-classical solvers.',
 '["Proficiency in Python and Go with experience building distributed backend systems", "Familiarity with containerized deployments (Docker, Kubernetes)", "Understanding of mathematical optimization or scientific computing is an asset", "Based in British Columbia"]',
 '["Python", "Go", "Kubernetes", "Distributed Systems", "PostgreSQL"]',
 NOW() + INTERVAL '25 days'),

('22222222-2222-2222-2222-222222222205', 'Benevity', 'benevity.com',
 'Cloud Platform Engineer Co-op', 'Calgary', 'AB', 'HYBRID', 'INTERNSHIP',
 '$40 - $46 CAD/hr', 'https://benevity.com/careers/cloud-coop',
 'Benevity Calgary team powers corporate giving platforms for the world largest brands. Help engineer our resilient cloud infrastructure, observability tooling, and Kubernetes clusters.',
 '["Active enrollment in a Canadian university or college co-op program", "Foundational knowledge of Linux systems and cloud providers (AWS or GCP)", "Scripting skills in Python, Go, or Bash", "Eagerness to learn Infrastructure as Code (Terraform) and container orchestration"]',
 '["AWS", "Kubernetes", "Terraform", "Python", "Linux", "Docker"]',
 NOW() + INTERVAL '18 days'),

('22222222-2222-2222-2222-222222222206', 'Neo Financial', 'neofinancial.com',
 'Full Stack Software Developer (New Grad)', 'Calgary', 'AB', 'ONSITE', 'NEW_GRAD',
 '$90,000 - $110,000 CAD', 'https://neofinancial.com/careers/fullstack-newgrad',
 'Re-imagining banking for Canadians from our Calgary headquarters. Join our high-velocity product teams building frictionless payment cards, savings accounts, and fraud-detection microservices.',
 '["Recent graduate or graduating senior in Computer Science, Software Engineering, or related field", "Hands-on experience with TypeScript, React, Node.js, or Go", "Understanding of transactional consistency and microservice architecture", "Must be eligible to work in Calgary, Alberta without visa restrictions"]',
 '["TypeScript", "React", "Node.js", "Go", "PostgreSQL", "GraphQL"]',
 NOW() + INTERVAL '12 days'),

('22222222-2222-2222-2222-222222222207', 'Jobber', 'getjobber.com',
 'Infrastructure & Backend Co-op', 'Edmonton', 'AB', 'HYBRID', 'INTERNSHIP',
 '$38 - $45 CAD/hr', 'https://getjobber.com/careers/backend-coop',
 'Headquartered in Edmonton, Jobber helps small home-service businesses operate efficiently across North America. Join our Core Platform team to scale background workers and caching layers.',
 '["Enrolled in an Alberta or Canadian post-secondary co-op stream", "Experience developing web backends in Ruby, Python, or Go", "Familiarity with relational databases and asynchronous job queues", "Curiosity for performance tuning and developer productivity tools"]',
 '["Go", "Python", "PostgreSQL", "Redis", "Docker", "REST APIs"]',
 NOW() + INTERVAL '15 days'),

('22222222-2222-2222-2222-222222222208', 'AltaML', 'altaml.com',
 'Machine Learning Solutions Engineer', 'Edmonton', 'AB', 'HYBRID', 'FULL_TIME',
 '$95,000 - $120,000 CAD', 'https://altaml.com/careers/ml-engineer',
 'AltaML is one of Canada leading applied AI studios based in Edmonton. Architect production LLM workflows, retrieval-augmented generation pipelines, and vector database embeddings for enterprise partners.',
 '["Strong background in Python, PyTorch or TensorFlow, and modern LLM orchestration", "Hands-on experience with vector search (pgvector, Milvus, or Qdrant)", "Experience building REST APIs with FastAPI or Flask", "Located in Edmonton or Calgary, Alberta"]',
 '["Python", "FastAPI", "pgvector", "PyTorch", "Docker", "RAG"]',
 NOW() + INTERVAL '28 days'),

('22222222-2222-2222-2222-222222222209', 'Garmin Canada', 'garmin.com',
 'Embedded Firmware Engineer Intern', 'Calgary', 'AB', 'ONSITE', 'INTERNSHIP',
 '$42 - $48 CAD/hr', 'https://garmin.com/careers/calgary-embedded-intern',
 'Based in Cochrane / Greater Calgary, Garmin Canada engineers world-class ANT+ wireless and fitness sensor technology. Design low-power embedded software in C/C++ on ARM microcontrollers.',
 '["Pursuing degree in Computer Engineering, Electrical Engineering, or Computer Science", "Solid knowledge of embedded C, microcontrollers, and communication buses (SPI, I2C, UART)", "Experience with RTOS or bare-metal development", "Legally authorized to work in Canada"]',
 '["C", "C++", "RTOS", "Embedded Systems", "Git", "Linux"]',
 NOW() + INTERVAL '19 days'),

('22222222-2222-2222-2222-222222222210', 'Shopify', 'shopify.com',
 'Backend Developer Intern (Canada Remote)', 'Remote', 'REMOTE', 'REMOTE', 'INTERNSHIP',
 '$52 - $60 CAD/hr', 'https://shopify.com/careers/backend-intern-canada',
 'Build global merchant infrastructure at scale. Write high-throughput backend services that handle millions of requests during flash sales and Black Friday Cyber Monday.',
 '["Currently enrolled in an accredited Canadian university degree or diploma program", "Experience writing code in Go, Ruby, Java, or Python", "Understanding of database query optimization and caching strategies", "Must be located anywhere in Canada"]',
 '["Go", "Ruby", "Redis", "MySQL", "Kafka", "Distributed Systems"]',
 NOW() + INTERVAL '16 days'),

('22222222-2222-2222-2222-222222222211', 'Wealthsimple', 'wealthsimple.com',
 'Platform Software Engineer (New Grad - Canada Remote)', 'Remote', 'REMOTE', 'REMOTE', 'NEW_GRAD',
 '$102,000 - $125,000 CAD', 'https://wealthsimple.com/careers/platform-newgrad',
 'Help build Canada leading financial platform. Join Platform Foundations to engineer reliable banking integrations, event-driven ledger services, and developer infrastructure.',
 '["Graduating in 2026/2027 with a degree in Computer Science, Software Engineering, or related", "Strong foundation in TypeScript, Node.js, Go, or Java", "Familiarity with event streaming and PostgreSQL", "Work from anywhere in Canada"]',
 '["TypeScript", "Go", "PostgreSQL", "Kafka", "AWS", "Docker"]',
 NOW() + INTERVAL '22 days'),

('22222222-2222-2222-2222-222222222212', 'Hootsuite', 'hootsuite.com',
 'Frontend Software Engineer Co-op', 'Vancouver', 'BC', 'HYBRID', 'INTERNSHIP',
 '$40 - $46 CAD/hr', 'https://hootsuite.com/careers/frontend-coop',
 'Join Hootsuite in Vancouver East Mount Pleasant to build responsive, accessible social media management interfaces using React, Next.js, and TypeScript.',
 '["Enrolled in a Canadian post-secondary co-op program", "Strong understanding of React, TypeScript, and modern CSS frameworks", "Eye for UI/UX detail and performance optimization", "Based in Vancouver, BC"]',
 '["React", "Next.js", "TypeScript", "Tailwind CSS", "REST APIs", "Jest"]',
 NOW() + INTERVAL '11 days');

-- 6. Simplify Canonical User Profile (Default Student User - Generic John Doe)
INSERT INTO user_profiles (
    user_id, full_name, email, phone, city, province,
    linkedin_url, github_url, portfolio_url,
    education, work_authorization, skills, experiences, projects
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'John Doe',
    'john.doe@uwaterloo.ca',
    '+1 (555) 234-5678',
    'Waterloo',
    'Ontario',
    'https://linkedin.com/in/johndoe',
    'https://github.com/johndoe',
    'https://johndoe.dev',
    '{
        "school": "University of Waterloo",
        "degree": "Bachelor of Computer Science (BCS)",
        "major": "Computer Science",
        "gpa": "3.90 / 4.00",
        "start_year": "2023",
        "grad_term": "Spring 2027",
        "is_coop_enrolled": true
    }'::jsonb,
    '{
        "work_auth_status": "CITIZEN_OR_PR",
        "canadian_work_eligible": true,
        "coop_work_permit": true,
        "requires_sponsorship": false,
        "target_term_length": "4 or 8 Months (Fall 2026 / Winter 2027)",
        "preferred_locations": ["Toronto, ON", "Waterloo, ON", "Vancouver, BC", "Canada Remote"]
    }'::jsonb,
    '["Go", "Python", "TypeScript", "React", "Next.js", "PostgreSQL", "pgvector", "Redis", "Docker", "AWS", "Tailwind CSS", "FastAPI", "C++"]'::jsonb,
    '[
        {
            "company": "Canadian Tech Co",
            "role": "Software Engineering Intern",
            "location": "Toronto, ON",
            "start_date": "May 2025",
            "end_date": "Aug 2025",
            "bullets": [
                "Engineered distributed microservices in Go and Python, serving 10M+ monthly requests with sub-50ms p95 latency.",
                "Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 35%."
            ]
        }
    ]'::jsonb,
    '[
        {
            "name": "Distributed Task Queue & Matching Engine",
            "link": "https://github.com/johndoe/task-engine",
            "bullets": [
                "Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 50K+ document embeddings in <50ms.",
                "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference."
            ]
        }
    ]'::jsonb
);

