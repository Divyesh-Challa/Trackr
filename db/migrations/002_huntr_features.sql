-- Migration 002: Huntr.co Features (Tasks, Contacts, Notes)

-- 1. Application Tasks / Checklist
CREATE TABLE IF NOT EXISTS application_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_application_id ON application_tasks(application_id);

-- 2. Application Contacts CRM
CREATE TABLE IF NOT EXISTS application_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    role_title VARCHAR(120),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON application_contacts(application_id);

-- 3. Application Notes
CREATE TABLE IF NOT EXISTS application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title VARCHAR(120),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_application_id ON application_notes(application_id);
