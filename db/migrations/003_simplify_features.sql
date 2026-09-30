-- Migration 003: Simplify Platform Features (Discovered Jobs for BC & AB, Canonical Profile)

-- 1. Canadian Tech Discovered Jobs Table (British Columbia & Alberta Scope)
CREATE TABLE IF NOT EXISTS discovered_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(120) NOT NULL,
    company_domain VARCHAR(120),
    role_title VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    province VARCHAR(20) NOT NULL CHECK (province IN ('BC', 'AB', 'REMOTE')),
    work_model VARCHAR(20) CHECK (work_model IN ('REMOTE', 'HYBRID', 'ONSITE')),
    job_type VARCHAR(40) CHECK (job_type IN ('INTERNSHIP', 'NEW_GRAD', 'FULL_TIME')),
    salary_range_cad VARCHAR(80),
    job_url TEXT,
    description TEXT NOT NULL,
    requirements JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    deadline_at TIMESTAMPTZ,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geographical & work model filtering
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_province ON discovered_jobs(province);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_type ON discovered_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_work_model ON discovered_jobs(work_model);

-- HNSW Vector Index for Sub-50ms Cosine Distance Matching
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_hnsw 
ON discovered_jobs 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Simplify Canonical User Profile (Single Source of Truth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    city VARCHAR(100) DEFAULT '',
    province VARCHAR(50) DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    education JSONB DEFAULT '{}'::jsonb,
    work_authorization JSONB DEFAULT '{}'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    experiences JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
