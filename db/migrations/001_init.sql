-- Trackr Schema Initialization
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Applications Core Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_name VARCHAR(120) NOT NULL,
    role_title VARCHAR(120) NOT NULL,
    job_location VARCHAR(120),
    work_model VARCHAR(20) CHECK (work_model IN ('REMOTE', 'HYBRID', 'ONSITE')),
    status VARCHAR(32) NOT NULL DEFAULT 'APPLIED',
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary_range VARCHAR(80),
    job_description_url TEXT,
    snapshot_s3_key TEXT,
    raw_description TEXT,
    match_score NUMERIC(5, 2), -- 0.00 to 100.00
    match_details JSONB DEFAULT '{}'::jsonb, -- Coverage details & flagged deficiencies
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_name);

-- 2. State Transition Velocity & Audit Log
CREATE TABLE IF NOT EXISTS application_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_state_transitions_app_id ON application_state_transitions(application_id);

-- 3. Resume Bullets & Vector Embeddings
-- 768 dimensions matches Google Gemini text-embedding-004 & FastEmbed nomic/bge models
CREATE TABLE IF NOT EXISTS resume_bullets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category VARCHAR(60) NOT NULL, -- 'EXPERIENCE', 'PROJECT', 'RESEARCH'
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Cosine Index for Sub-50ms Approximate Nearest Neighbor Retrieval
CREATE INDEX IF NOT EXISTS idx_resume_bullets_hnsw 
ON resume_bullets 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Milestones & Deadlines
CREATE TABLE IF NOT EXISTS application_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    milestone_type VARCHAR(40) NOT NULL, -- 'OA', 'RECRUITER_SCREEN', 'TECHNICAL_FINAL'
    scheduled_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_active_deadlines 
ON application_milestones(deadline_at) 
WHERE is_completed = FALSE;

-- 5. Inbound Email Audit & Ingest Log
CREATE TABLE IF NOT EXISTS inbound_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    sender VARCHAR(255) NOT NULL,
    subject TEXT,
    raw_payload_s3_key TEXT,
    classified_intent VARCHAR(40),
    confidence_score NUMERIC(4, 3),
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_sender ON inbound_email_logs(sender);
