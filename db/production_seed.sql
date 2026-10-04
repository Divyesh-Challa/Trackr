--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

-- Clean up existing tables to ensure clean, idempotent execution
DROP TABLE IF EXISTS public.application_contacts CASCADE;
DROP TABLE IF EXISTS public.application_milestones CASCADE;
DROP TABLE IF EXISTS public.application_notes CASCADE;
DROP TABLE IF EXISTS public.application_state_transitions CASCADE;
DROP TABLE IF EXISTS public.application_tasks CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.discovered_jobs CASCADE;
DROP TABLE IF EXISTS public.inbound_email_logs CASCADE;
DROP TABLE IF EXISTS public.resume_bullets CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

--
-- Name: application_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.application_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    role_title character varying(120),
    email character varying(255),
    phone character varying(50),
    linkedin_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: application_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.application_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    milestone_type character varying(40) NOT NULL,
    scheduled_at timestamp with time zone,
    deadline_at timestamp with time zone,
    is_completed boolean DEFAULT false,
    action_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: application_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.application_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    title character varying(120),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: application_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.application_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    from_status character varying(32) NOT NULL,
    to_status character varying(32) NOT NULL,
    transitioned_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: application_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.application_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    title text NOT NULL,
    is_completed boolean DEFAULT false,
    due_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name character varying(120) NOT NULL,
    role_title character varying(120) NOT NULL,
    job_location character varying(120),
    work_model character varying(20),
    status character varying(32) DEFAULT 'APPLIED'::character varying NOT NULL,
    applied_date date DEFAULT CURRENT_DATE NOT NULL,
    salary_range character varying(80),
    job_description_url text,
    snapshot_s3_key text,
    raw_description text,
    match_score numeric(5,2),
    match_details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT applications_work_model_check CHECK (((work_model)::text = ANY ((ARRAY['REMOTE'::character varying, 'HYBRID'::character varying, 'ONSITE'::character varying])::text[])))
);


--
-- Name: discovered_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.discovered_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name character varying(120) NOT NULL,
    company_domain character varying(120),
    role_title character varying(120) NOT NULL,
    city character varying(80) NOT NULL,
    province character varying(20) NOT NULL,
    work_model character varying(20),
    job_type character varying(40),
    salary_range_cad character varying(80),
    job_url text,
    description text NOT NULL,
    requirements jsonb DEFAULT '[]'::jsonb,
    skills jsonb DEFAULT '[]'::jsonb,
    deadline_at timestamp with time zone,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discovered_jobs_job_type_check CHECK (((job_type)::text = ANY ((ARRAY['INTERNSHIP'::character varying, 'NEW_GRAD'::character varying, 'FULL_TIME'::character varying])::text[]))),
    CONSTRAINT discovered_jobs_province_check CHECK (((province)::text = ANY ((ARRAY['BC'::character varying, 'AB'::character varying, 'REMOTE'::character varying])::text[]))),
    CONSTRAINT discovered_jobs_work_model_check CHECK (((work_model)::text = ANY ((ARRAY['REMOTE'::character varying, 'HYBRID'::character varying, 'ONSITE'::character varying])::text[])))
);


--
-- Name: inbound_email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.inbound_email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    sender character varying(255) NOT NULL,
    subject text,
    raw_payload_s3_key text,
    classified_intent character varying(40),
    confidence_score numeric(4,3),
    processed_at timestamp with time zone DEFAULT now()
);


--
-- Name: resume_bullets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.resume_bullets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category character varying(60) NOT NULL,
    content text NOT NULL,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name character varying(120) DEFAULT ''::character varying NOT NULL,
    email character varying(255) DEFAULT ''::character varying NOT NULL,
    phone character varying(50) DEFAULT ''::character varying,
    city character varying(100) DEFAULT ''::character varying,
    province character varying(50) DEFAULT ''::character varying,
    linkedin_url text DEFAULT ''::text,
    github_url text DEFAULT ''::text,
    portfolio_url text DEFAULT ''::text,
    education jsonb DEFAULT '{}'::jsonb,
    work_authorization jsonb DEFAULT '{}'::jsonb,
    skills jsonb DEFAULT '[]'::jsonb,
    experiences jsonb DEFAULT '[]'::jsonb,
    projects jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Data for Name: application_contacts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: application_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.application_milestones VALUES ('c8a77c07-4a32-40ab-a631-6b803ffa876b', '11111111-1111-1111-1111-111111111101', 'OA', '2026-10-06 08:04:05.848071+00', '2026-10-08 08:04:05.848071+00', false, 'https://hackerrank.com/amazon-sde-oa', '2026-10-06 08:04:05.848071+00');
INSERT INTO public.application_milestones VALUES ('f36318ad-7671-4ecb-ac40-bb39289af1e2', '11111111-1111-1111-1111-111111111102', 'TECHNICAL_FINAL', '2026-10-09 08:04:05.848071+00', NULL, false, 'https://rivian.zoom.us/j/987654321', '2026-10-06 08:04:05.848071+00');
INSERT INTO public.application_milestones VALUES ('b1c12134-1c21-485e-abb6-baeed27f1017', '11111111-1111-1111-1111-111111111103', 'OFFER_DEADLINE', NULL, '2026-10-20 08:04:05.848071+00', false, 'https://databricks.applicant.portal', '2026-10-06 08:04:05.848071+00');


--
-- Data for Name: application_notes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: application_state_transitions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.application_state_transitions VALUES ('9789b24c-4e47-45e7-a709-d854cef82072', '11111111-1111-1111-1111-111111111101', 'APPLIED', 'OA_SCHEDULED', '2026-10-04 08:04:05.847222+00', '{"source": "inbound_email_parser"}');
INSERT INTO public.application_state_transitions VALUES ('a2e84705-af8e-4c77-9a12-fdc57c4f0e37', '11111111-1111-1111-1111-111111111102', 'APPLIED', 'OA_SCHEDULED', '2026-09-28 08:04:05.847222+00', '{"source": "recruiter_portal"}');
INSERT INTO public.application_state_transitions VALUES ('ba42b111-38cb-42d9-add5-0f6abc1b68e5', '11111111-1111-1111-1111-111111111102', 'OA_SCHEDULED', 'INTERVIEWING', '2026-10-02 08:04:05.847222+00', '{"source": "recruiter_screen"}');
INSERT INTO public.application_state_transitions VALUES ('6cc2c04e-53d1-444c-bf68-ddfd357924b1', '11111111-1111-1111-1111-111111111103', 'APPLIED', 'INTERVIEWING', '2026-09-18 08:04:05.847222+00', '{}');
INSERT INTO public.application_state_transitions VALUES ('71d13f90-fa81-42dc-9fb4-5600aa77eca6', '11111111-1111-1111-1111-111111111103', 'INTERVIEWING', 'OFFER', '2026-10-04 08:04:05.847222+00', '{"offer_deadline": "2026-11-01"}');
INSERT INTO public.application_state_transitions VALUES ('41657890-fa47-49a7-a682-c1034b785080', '11111111-1111-1111-1111-111111111105', 'WISHLIST', 'APPLIED', '2026-10-06 17:41:29.126727+00', '{}');


--
-- Data for Name: application_tasks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Amazon', 'Software Development Engineer Intern', 'Seattle, WA', 'HYBRID', 'OA_SCHEDULED', '2026-10-03', '$62 - $75 / hr', NULL, NULL, NULL, 92.50, '{"deficiencies": [], "coverage_score": 92.5, "matched_skills": [{"similarity": 95.0, "requirement": "Proficiency in Go or Python"}, {"similarity": 90.0, "requirement": "Distributed Systems"}]}', '2026-10-03 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'Rivian', 'Embedded Software Engineer Co-op', 'Palo Alto, CA', 'ONSITE', 'INTERVIEWING', '2026-09-26', '$58 - $68 / hr', NULL, NULL, NULL, 78.00, '{"deficiencies": [{"similarity": 42.0, "requirement": "CAN bus and RTOS", "actionable_feedback": "Resume lacks embedded RTOS or CAN automotive protocol experience."}], "coverage_score": 78.0, "matched_skills": [{"similarity": 88.0, "requirement": "C/C++ Systems Programming"}]}', '2026-09-26 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000001', 'Databricks', 'Systems Software Engineer Intern', 'San Francisco, CA', 'HYBRID', 'OFFER', '2026-09-11', '$80 - $95 / hr', NULL, NULL, NULL, 96.00, '{"deficiencies": [], "coverage_score": 96.0, "matched_skills": [{"similarity": 96.0, "requirement": "Distributed storage & query engines"}]}', '2026-09-11 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000001', 'Stripe', 'Backend Infrastructure Engineer Intern', 'Seattle, WA', 'REMOTE', 'APPLIED', '2026-10-05', '$65 - $82 / hr', NULL, NULL, NULL, 89.00, '{"deficiencies": [], "coverage_score": 89.0, "matched_skills": [{"similarity": 92.0, "requirement": "PostgreSQL & Redis performance"}]}', '2026-10-05 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111106', '00000000-0000-0000-0000-000000000001', 'Tesla', 'Autopilot Software Intern', 'Austin, TX', 'ONSITE', 'REJECTED', '2026-09-22', '$50 - $65 / hr', NULL, NULL, NULL, 65.00, '{"deficiencies": [{"similarity": 48.0, "requirement": "CUDA & C++ optimization"}], "coverage_score": 65.0, "matched_skills": [{"similarity": 80.0, "requirement": "Python & PyTorch"}]}', '2026-09-22 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111107', '00000000-0000-0000-0000-000000000001', 'Cloudflare', 'Systems Engineering Intern', 'Austin, TX', 'HYBRID', 'WITHDRAWN', '2026-09-28', '$60 - $70 / hr', NULL, NULL, NULL, 88.00, '{"deficiencies": [], "coverage_score": 88.0, "matched_skills": [{"similarity": 90.0, "requirement": "Rust & Go networking"}]}', '2026-09-28 08:04:05.846066+00', '2026-10-06 08:04:05.846066+00');
INSERT INTO public.applications VALUES ('ef3d40c0-b88f-4eea-94f8-bc2c5c1f4aa2', '00000000-0000-0000-0000-000000000001', 'Target Company', 'Software Engineer', 'Remote / Hybrid', 'ONSITE', 'APPLIED', '2026-10-06', '$55 - $75 / hr', NULL, 'fallback://snapshots/ef3d40c0-b88f-4eea-94f8-bc2c5c1f4aa2.html', 'Sample Software Engineer role requiring Go, Python, and Redis.', 24.00, '{"deficiencies": [{"similarity": 19.5, "requirement": "Proficiency and experience with Python", "best_match_bullet": "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.", "actionable_feedback": "Requirement ''Proficiency and experience with Python'' has low resume coverage (20%). Consider adding a bullet point highlighting practical experience."}, {"similarity": 20.9, "requirement": "Proficiency and experience with Go", "best_match_bullet": "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.", "actionable_feedback": "Requirement ''Proficiency and experience with Go'' has low resume coverage (21%). Consider adding a bullet point highlighting practical experience."}, {"similarity": 31.6, "requirement": "Proficiency and experience with Redis", "best_match_bullet": "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference.", "actionable_feedback": "Requirement ''Proficiency and experience with Redis'' has low resume coverage (32%). Consider adding a bullet point highlighting practical experience."}], "matched_count": 0, "coverage_score": 24.0, "matched_skills": [], "deficiencies_count": 3, "total_requirements": 3}', '2026-10-06 08:04:19.132413+00', '2026-10-06 08:04:19.933821+00');
INSERT INTO public.applications VALUES ('11111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000001', 'Palantir', 'Forward Deployed Software Engineer', 'New York, NY', 'ONSITE', 'APPLIED', '2026-10-06', '$135,000 - $160,000', NULL, NULL, NULL, 84.00, '{"deficiencies": [], "coverage_score": 84.0, "matched_skills": [{"similarity": 86.0, "requirement": "TypeScript & React"}]}', '2026-10-06 08:04:05.846066+00', '2026-10-06 17:41:29.126727+00');


--
-- Data for Name: discovered_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222210', 'Shopify', 'shopify.com', 'Backend Developer Intern (Canada Remote)', 'Remote', 'REMOTE', 'REMOTE', 'INTERNSHIP', '$52 - $60 CAD/hr', 'https://shopify.com/careers/backend-intern-canada', 'Build global merchant infrastructure at scale. Write high-throughput backend services that handle millions of requests during flash sales and Black Friday Cyber Monday.', '["Currently enrolled in an accredited Canadian university degree or diploma program", "Experience writing code in Go, Ruby, Java, or Python", "Understanding of database query optimization and caching strategies", "Must be located anywhere in Canada"]', '["Go", "Ruby", "Redis", "MySQL", "Kafka", "Distributed Systems"]', '2026-10-22 08:04:05.849368+00', '[0,0.039684,0,0,0,0.039684,-0.039684,0,0,0,0,0,0,0,0,0,0,0,0,-0.039684,0,0,0,0.119051,-0.039684,0,0,0,0,0,0.039684,0,0,-0.119051,0,0.039684,0,0,0,-0.039684,0,0,0,0,0,0,0,0,0,-0.039684,0,0,-0.039684,0,0,-0.119051,0,0,-0.039684,0,0.119051,0,0,0,0,0,0,0,0,0,0.039684,0,0,0,0,0.119051,0,0.119051,0,0.039684,0.039684,0,0,0,0,0,0,0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039684,0,0,0,0,0.039684,0,0,0,0,0,0,0,0,0,0,0,0.039684,0,0,0,0.039684,-0.079368,0.039684,0,0,0,0.039684,0,0,0,0,0,0,-0.079368,0,0,0.039684,0,0,0.119051,0,0,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0.039684,0.119051,0,0,0,0,0,0,0,0,0,0,0,-0.039684,0,0,0,0.119051,-0.039684,0,0,0.039684,0,0,0,0,0,0,0.119051,-0.039684,0,0,0,0,0,0,0,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.119051,0,0,0,0.039684,0,0,-0.119051,0,0,0,0,0,0,0,0,0.079368,0.039684,0,-0.039684,0.039684,0,0,0,0.039684,0,0.039684,0,0,0,-0.039684,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.119051,-0.039684,0,0,0,0,0,0,0,0,0.039684,0,0,0,0,0,0.119051,0.039684,0,0,0,0,0,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0,-0.039684,0,0,0,0.039684,0,0,0,0.158735,0,0,0,0.039684,0,0,0,0,0,0,0,0,-0.039684,0,0,0.039684,0,-0.039684,-0.079368,0,0,0,0,0,0,0,0,-0.119051,0,0.039684,0,0,0,0,-0.158735,0,0.079368,0.119051,0.039684,0,0,0,0.039684,0,0,0,0.039684,0,0,0,0.039684,-0.039684,0,0,0.079368,-0.039684,0,-0.238103,0,0,0.079368,0.039684,0,0,0,0.119051,0,0,-0.039684,0,0,0,0,0.039684,0,0.119051,0,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0,-0.039684,0,-0.039684,0,-0.079368,0,0,0,0.039684,0,0,0,0,0,0,0,0.079368,0,0,0.119051,0,0,0,0,0,0,0,0,0,-0.039684,-0.039684,0,0,0,0,0.238103,0,0,0,0,0.039684,0,0,0,0,0,0,0,0,0,0,0,0,-0.039684,0,-0.119051,0,0,0,0,0,0,-0.039684,0,0,0,0,0,-0.039684,0,0.039684,0,-0.039684,0,-0.039684,0,0,0,0,0,0,0.119051,0,-0.158735,0,0,0,0,0,0,0,0.039684,0,0,0.039684,0,0,0,0,0,0,0.039684,0,0.039684,0.039684,-0.039684,-0.039684,0.039684,0,0,0,-0.039684,0,0,0.039684,0,0,0,0,0,0,0,0,0,0.039684,0,0,0,0,0,0,0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.079368,0,0,0,0,0,0.039684,-0.158735,0,0,0.039684,-0.079368,-0.079368,0,0,0,0,0.079368,-0.119051,0,0,0,0,0.039684,0,0,0.039684,0,0,0,0.039684,0.119051,0,0,0,0,0,0,0,0,0.039684,0.039684,0,-0.119051,0,0,0,-0.079368,0,0,0,0,0.039684,0,0,0,0,0,-0.039684,0,0,0,0,-0.039684,0,0,0,0,0.039684,0,0,-0.119051,0,0,0,0,0,0,0,0,0,0.039684,0,0,0,0,0,0,0.119051,-0.039684,0,0,-0.039684,0,0,0,0,0,0,0,0,0,0.119051,0,0,0,0,0.039684,0,0,0,0.039684,0,0,0,0.039684,0,0,0,0,0,0.039684,0,0,0,0,-0.119051,0,0,0,0,0,0,0,-0.039684,0.238103,0,0,0,0,-0.039684,0,-0.039684,-0.079368,0.039684,0,0,0,0,-0.039684,0,-0.119051,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039684,0.119051,0,0,-0.119051,0,-0.039684,0,-0.039684,0.039684,-0.079368,0,0,0.039684,0,0,0,0,0,0,0,0,0,0,0,0,0,0.119051,0,0,0,0,0,0.039684,0,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222207', 'Jobber', 'getjobber.com', 'Infrastructure & Backend Co-op', 'Edmonton', 'AB', 'HYBRID', 'INTERNSHIP', '$38 - $45 CAD/hr', 'https://getjobber.com/careers/backend-coop', 'Headquartered in Edmonton, Jobber helps small home-service businesses operate efficiently across North America. Join our Core Platform team to scale background workers and caching layers.', '["Enrolled in an Alberta or Canadian post-secondary co-op stream", "Experience developing web backends in Ruby, Python, or Go", "Familiarity with relational databases and asynchronous job queues", "Curiosity for performance tuning and developer productivity tools"]', '["Go", "Python", "PostgreSQL", "Redis", "Docker", "REST APIs"]', '2026-10-21 08:04:05.849368+00', '[0,0.042182,0,0.126547,0,0,0.084365,0,0,0,0,0.042182,0,0,0,0,0,0.042182,0,-0.084365,0,0,0.042182,0,-0.042182,0,0,0,0,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,-0.042182,0,0,0,0.042182,0,0,-0.042182,0,-0.084365,0,0,-0.042182,0,0,-0.126547,-0.042182,0,0,0,-0.042182,0,0,0.126547,0,0,0.126547,0,0,0.042182,0,0,0,0,0,-0.042182,0.042182,0,0,0,-0.253095,-0.042182,0,0,0,0,0,0,0.126547,0,0,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.042182,-0.126547,0,-0.042182,-0.126547,0,0.042182,0,0,0.126547,0,0,0,0,0,0,0,0,0,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.126547,0,-0.042182,0,0,0,-0.042182,0,0,0,0,0,-0.126547,0,0,0,0,0,0,0,0,0.042182,0,0,0,0,0,0,0.042182,0,0,-0.042182,0,0,0,0,0,0,-0.042182,0,0,0.126547,-0.042182,0,0,0,0,-0.042182,0,0,0,0,0,0,-0.126547,0,0,0,0,0,0,0,0,0,0,0.126547,0,0,0,0,-0.126547,0,0,0,0.042182,0,0,0,0,-0.042182,0.042182,0,0,0,0,0,0,0,-0.084365,0,0,0,0,0,0,0.084365,0,0,0,0,0,0,0,0.126547,0,0,0,0,0,0,0,0,0,0,0.042182,0,0,0,0,0,0,0,0.084365,0,0,0,-0.042182,0,0,0.042182,0,0,0.042182,0,0,-0.126547,0,0,0.042182,-0.084365,0,-0.042182,0,0,0,0,0,0,0,0,0,0,0,-0.042182,0,0,-0.126547,0,0.126547,0,0,0,0,0.042182,-0.126547,0,0,0,0.042182,0,0,-0.042182,0.084365,0,0,0,0,0,-0.042182,0.126547,0,0.042182,-0.042182,-0.042182,0.042182,0,0,0,0,-0.042182,0,-0.042182,0,0,0,0,-0.042182,-0.042182,0,0,0,0,0.042182,0,0.126547,0,0,0.084365,0,0.042182,0,0,0,0,-0.126547,0.042182,0.042182,0,0,0.042182,0,0,0.084365,0,0,0,0,0.042182,0,0,0,-0.084365,-0.042182,0.042182,0,0,0,0.042182,0,0,0,0,0,-0.042182,0,0,0,0,0,-0.042182,0,0,0,0.042182,0,-0.042182,0,0,0,0,-0.084365,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.042182,0,0,0,0.042182,0,0,0.084365,0,0,0,0.042182,-0.042182,0,0,0.042182,0.042182,0,0,0,0,-0.042182,0,0.126547,0,0,0,0,-0.042182,0,-0.126547,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.126547,0,-0.084365,0,0,0,0,0,0,0,-0.042182,0,0.126547,0.042182,0,0,0,0,0,0,0,0,0.042182,0.042182,0,0,0,0,0,0,-0.042182,0,0,0.084365,0,0,-0.126547,0,0,0.042182,0,0,0,-0.126547,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042182,-0.042182,0,0,-0.126547,-0.042182,0,0,0,-0.084365,0,0,-0.042182,0,0,0,-0.042182,0,0,0,0,-0.084365,0,0,0,0,0.042182,0,0,0,0.084365,0,0,0,0,0.084365,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.042182,-0.042182,0,0,0,0,0.042182,0,-0.042182,-0.084365,0,-0.042182,0,0,0,0,0,0,0,0,0,0,0.042182,0,0,-0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042182,0,0,0,-0.042182,0,0,0,0,0,0.042182,0,0,-0.042182,-0.042182,0,0,0,0,0,0,-0.042182,0,0.084365,0,0,0,0.126547,0,0,0,0,0,0,0.042182,0,0.126547,0,0,-0.084365,0,0,0,0,0.126547,0,0,0.126547,0,0,0,0,0.042182,0,0,-0.126547,0.042182,0,0,-0.084365,0,0,0,0,0,-0.042182,0,0,-0.042182,0,0.126547,0,0,0.042182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.084365,0,-0.084365,0,0,0.042182,0,0,-0.042182,0,0,0,0,0,0,0,0,0.042182,0,0.042182,0,0,0.042182,0,0,0,0,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222205', 'Benevity', 'benevity.com', 'Cloud Platform Engineer Co-op', 'Calgary', 'AB', 'HYBRID', 'INTERNSHIP', '$40 - $46 CAD/hr', 'https://benevity.com/careers/cloud-coop', 'Benevity Calgary team powers corporate giving platforms for the world largest brands. Help engineer resilient cloud infrastructure, observability tooling, and Kubernetes clusters.', '["Active enrollment in a Canadian university or college co-op program", "Foundational knowledge of Linux systems and cloud providers (AWS or GCP)", "Scripting skills in Python, Go, or Bash", "Eagerness to learn Infrastructure as Code (Terraform) and container orchestration"]', '["AWS", "Kubernetes", "Terraform", "Python", "Linux", "Docker"]', '2026-10-24 08:04:05.849368+00', '[0,0.078087,0,0.11713,0,0,-0.039043,0,-0.078087,0,-0.039043,0.039043,0,0,0,-0.039043,0,0.039043,0.039043,-0.039043,0,0,0,0,-0.078087,0,0,0,0,0,-0.11713,0,0,0,0,0,0.039043,0,0,0.078087,0,-0.039043,0,0,0.039043,0,-0.039043,0,0,-0.039043,0,0,0,0,-0.039043,0,0,0,-0.039043,0,0,-0.039043,0,0.039043,0,0,0,0,0,0,-0.078087,0.11713,0.039043,0,0,0,0,-0.039043,0.039043,0,0,0,0.11713,0,0,0,0,0,0,-0.039043,0,0,0,0,0.078087,0,0,0,0.078087,0,0,0,0,0.11713,0,0,0,0,0,0,0,0,0,0,0.039043,0,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039043,0,0,0,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,0.156174,0,0,0,0,0,-0.039043,0.039043,-0.039043,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11713,0,0,0,0.234261,0,-0.078087,0,-0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0.078087,0,0,0,-0.039043,0,0,0,0,0,0,0,0,0,0,0.11713,0,0,0,0,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.078087,0,0,0,0.039043,0,0,0,0,-0.195217,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,0.039043,0,0,0,0,0.039043,0,0,0,0,-0.039043,0,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,0,0.11713,0.078087,0,0,0,0,0,0,0,0,-0.039043,-0.078087,0,0,0,0,0,0,0,0,0,0,0.039043,0,0,0,0,0.11713,0,0.039043,0,0,0.039043,0,0,0,0,0.078087,0,0,0,0,0,0,0,0,0,0,0,0,0.078087,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,0,0.11713,0,0,0,0,-0.039043,0,0,0,0,0,0,0,0.039043,0,0.078087,0,0,0,0,0,0,0,0,0,0.039043,0,0,0,-0.039043,0.039043,0.039043,0,0,0.078087,0.039043,0,0,0,-0.234261,0,0,0,-0.039043,-0.078087,0,0.078087,0,0,0,0,0,-0.039043,0,0,0,0,0,-0.039043,0,0,0,-0.234261,0,0,0,0,0,0,0,0,0,0,-0.11713,0,0.039043,-0.078087,-0.078087,0.11713,0,0,0,0,-0.039043,0,0,0,0,0,0,0,0,0,0,0,-0.039043,-0.078087,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11713,0,0,0,0,0,0,0,-0.039043,-0.078087,0,0,0.078087,0.156174,0.078087,0,-0.078087,0,0,0.078087,0,-0.039043,-0.078087,0,0,0,0,-0.039043,0,0,0,-0.078087,0,0,0,0,0,0,0,0,0,0,0.11713,0.11713,0,0,0,0.039043,0,0,0,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,0,0,-0.11713,0,0,0,0,0,0,0,0,0,0,0,0.039043,0,0,-0.039043,0,0.078087,-0.234261,0,0,0.11713,-0.039043,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,-0.039043,0,0,0,0,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.11713,0.039043,0,0,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,-0.039043,0,0,0,0,0,0,0,0,0,-0.11713,0,0,0,0,0,0.039043,-0.078087,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039043,0,0,0,0,0,0.039043,0,0,-0.078087,0,0,0,0,0,0,0,0,0,0.039043,0,0,0,0.078087,0,0,0,0,0,0.039043,0.039043,-0.039043,0,0.11713,0,0.039043,0,0,0,0,0.11713,0,-0.11713,0,0,0,0,0,0.039043,0,0,-0.11713,0.039043,0,0,0.039043,0,-0.11713,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039043,0.11713,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.156174,0,0,0,0,0.039043,0,0,0,0,0,0.039043,0,0,0.039043,0,0,0,0,-0.039043,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222209', 'Garmin Canada', 'garmin.com', 'Embedded Firmware Engineer Intern', 'Calgary', 'AB', 'ONSITE', 'INTERNSHIP', '$42 - $48 CAD/hr', 'https://garmin.com/careers/calgary-embedded-intern', 'Based in Cochrane / Greater Calgary, Garmin Canada engineers world-class ANT+ wireless and fitness sensor technology. Design low-power embedded software in C/C++ on ARM microcontrollers.', '["Pursuing degree in Computer Engineering, Electrical Engineering, or Computer Science", "Solid knowledge of embedded C, microcontrollers, and communication buses (SPI, I2C, UART)", "Experience with RTOS or bare-metal development", "Legally authorized to work in Canada"]', '["C", "C++", "RTOS", "Embedded Systems", "Git", "Linux"]', '2026-10-25 08:04:05.849368+00', '[0,0.074329,0,0.111494,0,0.037165,0,0.037165,-0.074329,-0.037165,0,0.037165,-0.037165,0,0,0,0,0,0.074329,0,0,0,0,0,0,0,0,-0.074329,0,0,0,0,-0.037165,0,0,0,0,0,0,0,0,0,0,-0.148659,0,0,-0.037165,0,0,-0.111494,0,-0.037165,-0.037165,-0.111494,0,0,0,0,-0.037165,-0.111494,0,0,0,0,0,0.111494,-0.111494,-0.111494,0,0,-0.074329,0.074329,0,0,0,0,0.260153,0,0,0,0.037165,0,0,0,0,0,-0.037165,0,0,0,0,0,0,0,0,-0.037165,0.037165,0,-0.037165,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037165,0,0.111494,-0.111494,0,0,-0.037165,0,0,0,-0.037165,0,0,0,0,0,0,0,0,0,0,-0.111494,0,0,0,0,-0.111494,0.111494,0,0,0,0,0.037165,0,-0.037165,0.037165,0,0,0,0,0,0,0,0,0,0,0.037165,0,0,0,0,0,-0.037165,-0.222988,0,0,0,0,0,-0.037165,0,0,0,0,0,0,0,-0.037165,-0.037165,0,0,0,0,0,0,0,0,0,0,0,0.037165,0,0,0,0,0,0,0,0,0,0,0,0,-0.037165,0,0,0,0,0,0,-0.037165,0,0,0,0,0,0,0,-0.111494,0,0.111494,0,0,0,0,0.037165,0,0,0,0.037165,0,0,0,0,0,0,0,0,0,0,0,-0.037165,0,0,0,0.037165,0,0,0,0,0,0,0,0,0,0,-0.111494,0,0,0,0,0,0,0,0,0,0,0,0,0.037165,-0.037165,0,0,0,0,0.111494,0,-0.037165,0,0,0,0,0,-0.037165,0,-0.074329,0,0,0,0,0,-0.111494,-0.037165,0,0.037165,-0.037165,0,-0.037165,0.037165,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.074329,0,0,0,0.037165,0,0.037165,0,0,0,0,0,0,0.111494,0,0,0,0,-0.037165,0,0,0,0.037165,0,0,0,0,0,-0.037165,0,0.037165,0,0,0,0.074329,0,0,0.037165,0,-0.111494,-0.037165,0,0,0,0,0,0,0,0.037165,-0.037165,0.111494,0,-0.148659,0.037165,0,0,0,0,0,0,0,0,-0.037165,-0.037165,0,0,0,0,0,0,0,0.037165,0.037165,0,0,-0.074329,0,0,0,0,0.148659,0,0,0,0.037165,0,0,0,0,0.037165,0,0,0,0,0,0,-0.074329,0,0,0,0,0,0,0,0,0,0,0,0,0.037165,0,-0.074329,0,0,0,0,0,0,0,0,0,0,0.074329,0,0,0,0,0,0,-0.037165,-0.074329,0,0,0,0,0,0.111494,0,0.037165,0,0,0,0,0,0.037165,0,0,0,0,0,0,0,-0.111494,0,0.037165,-0.037165,-0.074329,0,0,0.037165,0.037165,0,0,0,0,0,0,0,0,0,0,-0.037165,0,0,-0.037165,0,0,-0.037165,0,0,0,-0.111494,-0.074329,0,0,0,0.037165,0,0,0,0,0,0,0.037165,0,0,0,0.111494,0,0.037165,0,0,0,0,0,0.111494,0,0,0,0,0.111494,0,0,0,0,-0.037165,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037165,0,0,0.037165,0,-0.074329,0,0,0.037165,0,-0.111494,0,0,0,0,0,0,0,-0.111494,0,0,0,0,0,-0.037165,0.037165,0,0,0,0,0,0,0,-0.111494,0,0,0.037165,0,0,0,0,0,-0.037165,0,0,0,0,0,0,0,0,0,0,0.074329,-0.074329,0,0,0.111494,-0.222988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037165,0,0,0,0.037165,0,0,0,0,-0.037165,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037165,0,-0.111494,-0.074329,0,0,0,0,0,0,0,0,0,0,0,0,-0.037165,0,0,0,0,0,0,0,-0.037165,0,-0.037165,0,0,0,0,0,0,0.074329,0,0,0,0,0.037165,-0.111494,0,0,0,0,0,0,-0.037165,0,-0.111494,0,0,-0.074329,0,0,-0.111494,0.037165,0,0,0,0,0,0,0,0,0,0,-0.037165,-0.037165,0,0.222988,0,0,0,0,0,0,0,-0.074329,0,0,0,0,0,0,0.111494,0,0,0,0,0,0.074329,-0.037165,0,0,0,0,0,0.037165,0,0,0,0,0,0,0,-0.111494,0,0,0.037165,-0.037165,0,0.037165,0,0,0.037165,0,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('a415a284-cdd8-4fbf-bbd9-ff1226556cef', 'Electronic Arts (EA)', 'ea.com', 'Software Engineer Intern (Vancouver)', 'Burnaby', 'BC', 'HYBRID', 'INTERNSHIP', '$42 - $50 CAD/hr', 'https://ea.gr8people.com/jobs/burnaby-systems-intern', 'Based at EA Vancouver in Burnaby, work on core game subsystems, performance profiling, and graphics pipelines supporting next-gen titles.', '["Enrolled in Computer Science or Software Engineering program in Canada", "Solid knowledge of modern C++ or C#", "Understanding of multithreading, data structures, and algorithms", "Located in or relocating to Greater Vancouver, BC"]', '["C++", "C#", "Algorithms", "Graphics", "Git"]', NULL, '[0,0,0,0,0,0,0,-0.131056,-0.043685,0,0,0,0.043685,0,0.131056,0,0,-0.043685,0,0.08737,0.043685,0,-0.08737,0,-0.218426,0,0,-0.043685,0,0,0,0,-0.043685,0,0,0,0.043685,0,0,0,0,0,0,-0.131056,0,0,-0.043685,0,0,0,0,0,-0.043685,0,0,-0.043685,0,0,0,-0.08737,0,0,0,0,0.043685,0,-0.043685,0,0,0,-0.043685,0,0,0,0.131056,0,0.043685,0,0,0.043685,0.043685,-0.043685,0,-0.043685,0.043685,0,0,0,0,0,0,0,0,-0.043685,0,0,0.043685,0,-0.174741,0,0,0,0,0,0,0,0.131056,0,0,0,-0.043685,0,0,-0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.131056,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.131056,0,0,0,0.043685,0,0,0,0,0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.174741,0,0,0,0.131056,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.043685,0,0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.043685,0,0,-0.043685,0,0,-0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.043685,-0.043685,0.043685,0,0,0,0,0,0,0,0,0.131056,0,0,0,0,0,0,0,0,0,0,0,0,-0.043685,-0.043685,-0.043685,0,0,0,0,0,0,0,0.043685,0,0.043685,-0.043685,0.08737,-0.131056,0,0,0,0,0,0,0,0,0,0,0,0,-0.131056,0.08737,0,0,0,0.043685,0,0,0,0,0,0,0,0,0.08737,0,0,0,0,0,0.08737,0,0,0,0,0,0,0.08737,0,-0.131056,0,0.043685,0,0,0,0.043685,0,0,0,0,-0.131056,0,0,0,0,0,0,0,0,0,0,-0.131056,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.043685,0,0,0,-0.08737,0,0,0.043685,0,0.08737,0,-0.131056,0,0,0,0,0,0,0,0,0,0,0,0.08737,0,0,0,0,0,0,0,0,0,0,0,0,0,0.131056,0,0,0.043685,0.131056,0,0,0.08737,0,0,0,0.043685,0,0,0,0,0,0,0,0,0,0,-0.043685,0,0,0,0,0,0,0,0,0,0,0,0.043685,0,0.043685,0,0,0,0,0,0,-0.043685,0,-0.043685,0.043685,0,0,0,0,0,0.131056,0,0,0,0,0,0,0,-0.043685,0,0,-0.043685,0.043685,0,0,0,0,0,-0.131056,0,0,0,-0.043685,0,0,0,0,0,-0.043685,0,-0.131056,0,0.043685,0.131056,0,0,0.08737,0,-0.043685,0.043685,0,0,0,0.043685,0,0.131056,0,0.043685,0,-0.043685,0,0,0,0,0,0.08737,0,0,0,0,0,0,0,0,0.043685,0,0,0,0,0,0.08737,0,0.043685,0,0,0.043685,0,-0.043685,0.043685,0,-0.131056,0,-0.08737,0,-0.08737,-0.043685,0,-0.08737,0,0,0,0,0,0,0,0,0,0.043685,0,0,0,0,0,0,0,0,0,0,0.043685,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.131056,0,0,0,0,0,0,0,0,0,0.131056,0,0,0,0,0.131056,0,-0.043685,0,-0.08737,0,0,0,0,0,0,0,0,0,0,-0.043685,0,0,0.043685,0,-0.043685,0,0,0,0,0.043685,-0.043685,0,0,0,0,0,0.043685,0,0,0,0,0.174741,0,-0.08737,0,0,0,0,0,0.131056,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.043685,0,0,0,0,0,0,0,0,-0.131056,0,0,0,0,0,-0.131056,0,0,0,0,0,0,-0.08737,0,0,-0.043685,-0.043685,0,-0.043685,0,0.131056,0,0,0,0,0,0,0.043685,0.08737,0,0,0,0,0,0,0,-0.043685,0,0,0,0,0,0,0,0,-0.043685,0,0,-0.043685,0,0,0,0,0.043685,0,0,0,0,0.043685,0,0,0,0.08737,0,0,0,0,0,0]', '2026-10-06 17:57:54.9971+00');
INSERT INTO public.discovered_jobs VALUES ('178cfd14-8d1e-4497-8917-5b153e89fa7b', 'StackAdapt', 'stackadapt.com', 'Employment Counsel, Canada & International', 'Remote', 'REMOTE', 'ONSITE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://job-boards.greenhouse.io/stackadapt/jobs/4373441009', '<div class="content-intro"><p>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marketers choose StackAdapt to orchestrate high-impact campaigns across programmatic advertising and marketing channels.</p></div><div class="section page-centered">
<p>StackAdapt is looking for an Employment Counsel to join our growing Legal team. Reporting to the Senior Director, Employment Counsel, you will help support the employment law function across Canada and, as needed, our other key international markets. This role is well-suited to an employment lawyer with 3+ years of hands-on experience looking to take on broad ownership across advisory work, compliance, dispute resolution, and cross-functional projects at a fast-growing, global technology company.</p>
<p>You''ll work closely with our People &amp; Culture (P&amp;C) team and business leaders on the full employment lifecycle, from hiring through to termination, while helping build scalable, compliant frameworks as StackAdapt continues to expand internationally.</p>
<p>StackAdapt is a Remote First company. We are open to candidates located in Canada for this position.&nbsp;</p>
<h3>What You''ll Be Doing:</h3>
<ul>
<li>Provide day-to-day employment law advisory support for Canada (all provinces, as applicable), with additional support to other jurisdictions such as the UK, Germany, Australia, and Singapore, working with local outside counsel as needed.</li>
<li>Manage and help resolve employment standards complaints, human rights complaints, and demand letters, and support litigation strategy and outside counsel instruction where required.</li>
<li>Partner with the People &amp; Culture team on workplace investigations, performance management, accommodations, leaves of absence, and terminations.</li>
<li>Draft and maintain employment agreements, policies, and handbooks across supported jurisdictions.</li>
<li>Support key employment-related compliance projects and initiatives as the company scales, helping build sustainable and efficient processes for the Legal and P&amp;C teams.</li>
<li>Support international expansion by helping stand up compliant employment frameworks in new markets.</li>
<li>Identify and lead opportunities to use AI tools to improve the speed and quality of employment law advice, document drafting, research, and case/matter management.</li>
</ul>
</div>
<div class="section page-centered">
<h3>What You''ll Bring to the Table</h3>
<ul>
<li>Minimum 3+ years of relevant employment law experience, with some of that at a law firm where you advised on Canadian employment matters and handled employment demands and litigation; experience with other jurisdictions (e.g., US, UK, Australia, Singapore, Germany) is an asset.</li>
<li>Called to the bar in at least one Canadian province (Ontario preferred) and in good standing.</li>
<li>Strong working knowledge of Canadian employment and human rights legislation, with the ability to quickly get up to speed on multi-jurisdictional nuances.</li>
<li>Excellent judgment and the ability to balance legal risk with practical, business-oriented advice.</li>
<li>Strong project management skills and comfort managing a high volume of concurrent matters and stakeholders.</li>
<li>Clear, confident communicator who can distill complex legal issues into practical guidance for non-lawyers.</li>
<li>Comfort working in a fast-paced, high-growth environment with evolving priorities.</li>
<li>Genuine curiosity about how AI tools can be applied to legal work, along with a willingness to learn and adopt new tools as they''re introduced.</li>
</ul>
<h3>Using AI In This Role</h3>
<p>AI is an increasingly important part of how our Legal team works, and this role will have real opportunities to help shape that. Depending on the task, you may use AI tools to:</p>
<ul>
<li>Accelerate legal research and first drafts of memos, policies, playbooks, and correspondence (with your own review, judgment, and sign-off always required).</li>
<li>Summarize and triage incoming matters, demand letters, and complaints to help prioritize response.</li>
<li>Build and maintain internal playbooks, templates, and self-serve resources for the People &amp; Culture team and business stakeholders.</li>
<li>Support process improvement and automation for recurring employment law workflows, in partnership with the broader Legal and Compliance teams.</li>
</ul>
<p>We''re looking for someone comfortable using AI-powered tools as part of their everyday workflow, who applies sound legal judgment to review and validate AI-assisted output, and who is interested in helping identify new ways AI can support the employment law function as our tools and processes evolve.</p>
<p>&nbsp;</p>
<div>&nbsp;</div>
</div><div class="content-pay-transparency"><div class="pay-input"><div class="description"><p>The compensation range listed for this role reflects the expected base salary for candidates located in the posting country based on a global rate. It is informed by market data and the approved budget for this position. StackAdapt maintains different compensation ranges for roles across other countries and regions, and final offers will be aligned to the candidate’s current location. <em>We do not ask c</em>andidates about current or prior salary history, and we will not use such information, if volunteered, in setting an offer.</p>
<p>This range represents base salary only. Depending on the role, candidates may also be eligible for additional compensation such as annual bonuses, commissions, equity awards, and a comprehensive benefits package.</p>
<p><strong>Factors Influencing Final Compensation:</strong></p>
<ul>
<li>The final compensation offer will be determined by a variety of factors, which may include, but are not limited to: the candidate''s specific experience, technical skills, knowledge, abilities, and relevant education, licensure, and certifications.</li>
<li>Other business factors, such as organizational needs and budget alignment, may also be considered in the final offer.</li>
</ul></div><div class="title">Base Salary Band</div><div class="pay-range"><span>$114,400</span><span class="divider">&mdash;</span><span>$157,300 CAD</span></div></div></div><div class="content-conclusion"><div class="section page-centered">
<h3>StackAdapter''s Enjoy:</h3>
<ul>
<li data-stringify-indent="0" data-stringify-border="0">Highly competitive salary</li>
<li data-stringify-indent="0" data-stringify-border="0">Retirement/ 401K/ Pension Savings globally</li>
<li data-stringify-indent="0" data-stringify-border="0">Competitive Paid time off packages including birthday''s off!</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to a comprehensive mental health care program</li>
<li data-stringify-indent="0" data-stringify-border="0">Health benefits from day one of employment</li>
<li data-stringify-indent="0" data-stringify-border="0">Work from home reimbursements</li>
<li data-stringify-indent="0" data-stringify-border="0">Optional global WeWork membership for those who want a change from their home office and hubs in London and Toronto</li>
<li data-stringify-indent="0" data-stringify-border="0">Robust training and onboarding program</li>
<li data-stringify-indent="0" data-stringify-border="0">Coverage and support of personal development initiatives (conferences, courses, books etc)</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to StackAdapt programmatic courses and certifications to support continuous learning</li>
<li data-stringify-indent="0" data-stringify-border="0">An awesome parental leave program</li>
<li data-stringify-indent="0" data-stringify-border="0">A friendly, welcoming, and supportive culture</li>
<li data-stringify-indent="0" data-stringify-border="0">Our social and team events!</li>
</ul>
<p><em>Please note: Benefits and perks may vary depending on your country of employment and the nature of your engagement. In locations where StackAdapt does not have a legal entity, employment and benefits are administered in accordance with local regulations and partner policies.</em></p>
</div>
<div class="section page-centered" data-qa="closing-description">
<div><em>StackAdapt is a diverse and inclusive team of collaborative, hardworking individuals trying to make a dent in the universe. No matter who you are, where you are from, who you love, follow in faith, disability, superpower status, ethnicity, or the gender you identify with (if you’re comfortable, let us know your pronouns), you are welcome at StackAdapt. </em></div>
<div>&nbsp;</div>
<div><em>StackAdapt is committed to providing an inclusive and accessible recruitment process. Accommodations are available upon request for candidates taking part in all aspects of the selection process. If you require an accommodation, please let us know.</em></div>
<div>&nbsp;</div>
<div><em data-stringify-type="italic">We use artificial intelligence (AI) to streamline the resume reviews of candidates and assess their fit based on the criteria outlined in the job posting. We do not use AI to make any final hiring or interview decisions.</em></div>
<div>&nbsp;</div>
<div><strong>About StackAdapt</strong></div>
<div>&nbsp;</div>
<div>We''ve been recognized for our diverse and supportive workplace, high performing campaigns, award-winning customer service, and innovation. We''ve been awarded:</div>
<div>&nbsp;</div>
<div><a href="https://www.stackadapt.com/resources/blog/g2-2026-best-software-awards" target="_blank">G2 Top Software for 2026</a><br><a href="https://www.greatplacetowork.ca/en/bestworkplaces/best-workplaces-for-young-talent/2026" target="_blank">2026 Best Workplaces™ for Young Talent</a> and <a href="https://www.stackadapt.com/resources/blog/great-place-to-work-best-workplaces-canada-2026" target="_blank">in Canada</a> by Great Place to Work®<br><a href="https://www.stackadapt.com/resources/blog/best-cross-channel-advertising-platform" target="_blank">#1 DSP on G2 and leader in a number of categories including Cross-Channel Advertising</a></div>
<div><a href="https://www.stackadapt.com/resources/blog/adweek-tech-stack-awards-2026">2026 Winner in the (CTV/OTT) Product/Platform category for the 2026 ADWEEK Tech Stack Awards</a></div>
<div>&nbsp;</div>
<div>To learn more about our privacy practices, please see our <a href="https://www.stackadapt.com/legal-document-centre/website-and-platform-user-privacy-policy">Privacy Policy</a>.</div>
<div>&nbsp;</div>
<div><span style="color: rgb(243, 243, 244);">#LI-REMOTE</span></div>
</div></div>', '["Experience with AI"]', '["AI"]', NULL, '[0.0212,0.0212,0,-0.0212,0,0,0,-0.0212,-0.0212,0,0,0.0424,0,0.0636,0,0.0212,0,0.0212,0,-0.0212,0,0,0,0.0636,-0.1484,0,0,-0.0212,0,0,0.0212,0,0.0212,0,-0.0212,0,0.0212,0,0,0.0636,0.0212,0,-0.0636,-0.0424,0.0424,0,0,0,0,-0.0212,0,-0.0212,0,-0.0848,-0.0212,0,0,-0.254399,-0.0212,0,0,0,0,0,0.0212,0,0,0,0,0.0636,0,0,0.1272,0,0,0,0,-0.0212,-0.0212,-0.0636,0,0,0,-0.0424,0,0.0212,0,0.0212,0,-0.0424,0,-0.0848,0,-0.0212,0.0212,0,0,0,0,0,0,0,0,-0.0636,0,0,0.0212,-0.106,0,0,0.1908,0,0,0,-0.0212,0,0,0,0,-0.0212,-0.0424,0.0212,-0.0848,0.0212,0,0.0424,0,0,0,0,0.0212,0.0212,0,0,0,0,-0.0424,-0.0212,-0.0636,0,-0.0212,0,-0.0212,-0.0636,0,0.0636,0,0,-0.0212,0,-0.0212,0,-0.0212,0,0,0,-0.0636,0.0212,0,0.0212,0,0,0,0,0,0,-0.0636,0,0,0,0.0636,0,0,0,-0.0212,0.0424,0,0.0212,-0.0212,0,-0.0424,-0.0424,0,0,0,0,0.0212,-0.0212,0,0,0,0.0424,0,0.0424,0,0,0,-0.0212,0,0,0,0,0,0,0,0,0,0,0.1908,0,0,0,0,0,0.0212,0.0424,0,0,0,0,0,0,0,0,0,0,0,0,0.0424,0.0212,0.0212,0,0.0212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0636,0,0.0212,0.0212,0.0424,0,0,0,-0.0636,-0.0636,0,0,0,0.0424,-0.0212,0.0424,-0.0424,0.0424,0,0,0.0424,0,0,0,0,0,0,0.1908,0,0,0,0,0,0.0212,0,0,0,0,0,0,-0.0212,0,0,0,0,0,0.0212,0,0,0,0,0.106,0,0.0424,0,0,-0.0212,0,0,0,0,0,0,0,0,-0.0636,0.0424,-0.0212,0.0424,0,0.0212,0.0212,0,0,0.0212,0.0424,-0.0212,0,0.106,-0.0636,0.1484,0,0,0,0,0,0,0,0,-0.0212,0.0212,-0.0212,0,0,0,0.0424,0,0,0,0.0424,0,0.0636,0,0.0848,0.0212,0.1272,0,0,0,0,0,0,0,0,0,0,0,0.0636,0,-0.0212,0,0,-0.0212,0,0,0.0212,0,0,0.0212,0.106,0.0212,-0.1272,-0.0212,-0.0212,0,0,0,0,0.0636,0.0424,0.0424,0.0212,0,0,-0.0212,0,0,0,0,0.0212,0,0,0.0636,0,0,0,0,0,-0.0424,0,0.0212,0,0,0.0424,0,0.106,0,0,0,-0.0212,0.0848,0.0424,0,0,-0.0212,0,0.0212,0.0212,0,0,0,0,0,0.106,0,0.0212,0,-0.0212,0,0,0,0.0212,0.0212,0,0,0.0636,0.0212,0,0,-0.0424,0.0212,0,0,0,0,0,0,0,0.0212,0.0636,0,0,0,0,0,0,-0.0212,0,0,0,-0.0212,0,-0.0212,0.0636,0,0.0212,0,0,0,-0.0212,0,0,0.0212,0,0.0424,0,0.0424,0,-0.0212,0,0,0,0,0.0212,0,-0.1908,-0.106,0,0,-0.0212,0,-0.0636,0,0,0,0.0424,0.0212,0,0.0636,0,0,0,-0.0212,0.0212,0,0.0636,0,0,0.106,0,0,0,-0.0424,0,0,0,0.0636,0,0,0.0636,0,0,0,0,-0.0212,0,0,0,0,0,0,0,0,0.0212,0,0,0.0212,0,0,0.0212,0,0,0.0848,0,0,0.0212,0,0,0.0212,0,0,0.0636,0,0,-0.0212,0,0,-0.0212,0,0,0.0212,0,0,0,-0.0212,0,0.0212,0,-0.0636,0,0,0.0424,0,0,0.0212,0.0212,0,0.0424,0,0,0,0,0,-0.0212,0,-0.1908,0,0,0,0,0,0,0.0848,-0.0212,0.1272,0.0212,0,0,0,0,0,-0.0636,0,0,0,0,0,0,0,0.0848,0,0,0,0,0,0,0.0212,0,0.0636,0,0,0,0,0,0,-0.0848,0,0,0,0,0,0,0,0,0,0,0,0,-0.0636,0,0,0,0.0212,-0.0212,0,0,-0.0212,0,0,-0.0424,0,0,0,-0.0636,0.0212,0.0424,0,0,0.0212,-0.0212,0,0.0212,0,-0.0424,0,0,0,0.0212,0,0.0424,0,0.0212,0,0,0.0212,0,0.0636,0,0,0,0,0.106,0,0,0,-0.0212,0.0424,0,-0.0212,0.0424,0.0212,0,0,0,-0.0212,0,-0.1484,-0.1908,0,0,0,0.0848,0.0424,0.0212,0,0,0,0,-0.0424,0,0,0,0,0,0,0,0,0,0,-0.1696,0,0,0.0848,-0.0212,0,-0.0212,0.0636,0.0424,-0.0848,-0.0212,0,0,0,0.0212,0,0,0.0636,0,0.0424,0.0212,-0.0848,0.0212,-0.0424,0,0,-0.0212,0,0,0,0.1696,0,0.1484,0,0,0,0,0,0.0424,0,0,0]', '2026-10-06 17:57:58.075727+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222202', 'Clio', 'clio.com', 'Backend Software Engineer Co-op', 'Burnaby', 'BC', 'HYBRID', 'INTERNSHIP', '$46 - $52 CAD/hr', 'https://www.clio.com/careers/backend-coop', 'Clio is Canada legal tech unicorn headquartered in Burnaby. Our engineering team develops scalable multi-tenant REST APIs, high-throughput background queues, and reliable database architectures.', '["Experience with backend languages such as Ruby, Python, or Go", "Familiarity with SQL (PostgreSQL or MySQL) and REST API principles", "Enrolled in a recognized Canadian university co-op program", "Passion for clean code, automated testing, and CI/CD pipelines"]', '["Go", "PostgreSQL", "REST APIs", "Docker", "Redis", "Ruby"]', '2026-10-20 08:04:05.849368+00', '[0,0.172133,0,0,0,0.043033,0.129099,0,-0.215166,0,0,-0.043033,0,0,0,0,0,0,0,0,0,0,0,0,-0.043033,0,0,-0.043033,0,0,0,0,0,0,0,0,0,0,0,0,-0.043033,0,-0.086066,-0.129099,0.129099,0.043033,0,0,0,-0.086066,0,0.043033,0,0,0,0,0,0,0,0,0,0,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0.129099,0,0,0.043033,0.043033,0,0,0,-0.086066,0,0,0,0,-0.129099,0,0.129099,0,0,0,0,0,0.043033,0,0,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.043033,0,0,0,0.043033,0.043033,0,0,0,0,0.043033,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0.043033,0,0,0.043033,0,0,0,0,-0.043033,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,-0.129099,0.043033,0,-0.043033,-0.129099,0.129099,0,0,0,0,0,0,-0.043033,0,0.043033,0,0,0,0,0,0.043033,0,0,0,-0.043033,0,0,0,-0.086066,0,0,0.043033,0,-0.043033,0,0,0,0.043033,0,0,0,0,0,-0.043033,-0.043033,0,0,0,0,0,0,0.043033,0,0,-0.129099,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0.043033,0,0,0,0,0.086066,0,0.172133,0,0,0,0,0,-0.043033,0,0,-0.043033,0,0,0,0,0,0,0.043033,0,0,0.043033,0,0,0,-0.043033,0,0,-0.043033,-0.086066,-0.043033,0,0,0,0,0,0,0,-0.086066,0,-0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.129099,0,0,-0.043033,0,0,0,0,0,-0.043033,0.086066,0,0,-0.043033,0,0,0,0,0,0,0,0,0,0.086066,-0.043033,-0.043033,0,0,0,0,0,0,-0.043033,-0.043033,0,0,0,0,0,-0.043033,0,0,-0.086066,0,0.043033,0,0,0,0,-0.043033,0,0.043033,0,0,0,0,0.043033,-0.043033,0.043033,0,0,0.043033,0,0,0,0,0,0,0,-0.043033,0,0,0,-0.043033,-0.043033,0.043033,0,0,0,0,0,0,0,0,0,-0.043033,0,-0.043033,0.043033,0,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,-0.043033,0,0,0.086066,0.129099,0,0,0.043033,-0.043033,0,0,0,0,-0.043033,0,0,0,0,0,0.043033,0,0,0,0,0,0,-0.129099,0,0,0,0,0,0,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,0.043033,0,0.043033,0,0,0,0,0,0,-0.043033,0,0,0,-0.043033,-0.129099,0,0,0,0,0,0,0,0,0,-0.043033,0,0,0,0,0,0,0,0,0,0,0,-0.043033,0,0,0,0.043033,0,0,-0.043033,0.043033,0.043033,0,0,0,0,0,0,0,0,0,0,0,0.043033,0,-0.129099,0,-0.129099,0.043033,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,-0.086066,0.043033,0,0,-0.043033,-0.043033,0,0,0,0,-0.043033,0,-0.129099,0,0,0,0.129099,0,0,-0.043033,-0.086066,0,0,0,0,0.086066,0,0,0.129099,0.043033,0,0,0,-0.043033,0.043033,0,0,0,-0.129099,0,0,0,-0.129099,0,0,0,0,0,0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.043033,0.043033,0,-0.043033,0,0,0,0.043033,0,0,0,0,0,0,0.043033,0,-0.043033,0,0,0,0,0,0,0,0,0,0.043033,0,0.043033,0,0,0,0.043033,0.043033,0,0,0.043033,-0.043033,0,0,0,0,0,0,0,0,0,-0.043033,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,-0.043033,0,0,0.129099,-0.086066,-0.043033,0,0,0,0,0,0,0,0,-0.043033,0,0,0,0,0,0,0,0,-0.172133,0,0,-0.129099,-0.129099,0,0,0,0,0,0,-0.043033,0,0.043033,0,-0.086066,0,-0.129099,0.172133,0,0,0,0,0,0,0,0.043033,0,0,0,0,0,0,0,0,0,-0.043033,0,0,0.043033,0,0,0,0.043033,0,0,0,0,0,0,0.043033,0,0,0,0,0.043033,0,0.129099,-0.129099,0,0,-0.043033,0,0,0,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222212', 'Hootsuite', 'hootsuite.com', 'Frontend Software Engineer Co-op', 'Vancouver', 'BC', 'HYBRID', 'INTERNSHIP', '$40 - $46 CAD/hr', 'https://hootsuite.com/careers/frontend-coop', 'Join Hootsuite in Vancouver East Mount Pleasant to build responsive, accessible social media management interfaces using React, Next.js, and TypeScript.', '["Enrolled in a Canadian post-secondary co-op program", "Strong understanding of React, TypeScript, and modern CSS frameworks", "Eye for UI/UX detail and performance optimization", "Based in Vancouver, BC"]', '["React", "Next.js", "TypeScript", "Tailwind CSS", "REST APIs", "Jest"]', '2026-10-17 08:04:05.849368+00', '[0,0,0,0,0,0.040258,0,-0.080517,-0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080517,0,-0.040258,0,0,0,0,0,0,0,0.080517,0,0,0,0,0.040258,0,-0.040258,0,0,0.080517,-0.120775,0,0.040258,0,0,0,-0.120775,0,-0.040258,0,0,0.040258,0,0,-0.120775,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.120775,0,0,0,0,-0.040258,0,0,0,0,0.080517,0,0,0,0,0,0,0,0,0.040258,0,0,0.120775,0,0,0,0,0,0,-0.040258,0,0,0,0,0,0,0.040258,-0.120775,0,0,0,0,0,0,0,0,-0.120775,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.201292,0,0,0,0,-0.040258,0,0,-0.040258,0,0.040258,0,0,0,0,0,0,0,-0.040258,0,0,0,0,0,0,0,0,0,0,0,0,-0.080517,0,0,0,0,0,0,-0.040258,0,-0.080517,0.120775,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040258,0.080517,0,0.040258,0.040258,0,0,0,0,0,0,0,0,0,0,0,0.120775,0.040258,0,0,0,0,0,0.080517,-0.040258,0,0,0,-0.120775,0,0,0,0,0,0,0,0.040258,-0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,-0.080517,-0.120775,0,0,0,-0.241551,0,0.120775,0.120775,0,0,0,0,0.040258,0,0,0,0,0,0,0,0.040258,0,0,0,0,0,0.080517,0,0,0,-0.040258,0,0,0.040258,0,-0.080517,0,0.080517,-0.080517,0,0,0.040258,0,0.120775,0,0,0,0,-0.120775,0.161034,0,0,0,0,0.040258,0,0,0,-0.080517,0,0,0,0,0,0,0,0.120775,-0.040258,0.080517,0,-0.040258,0,0.120775,0,0,0,-0.120775,-0.080517,0,0,0,0,-0.040258,0,0,0,0,0,0,0,0.040258,0,0,0,0.040258,0,0,0,0,0,0,0.080517,0.040258,0,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,0,0.040258,0.120775,0,0,-0.040258,-0.040258,0,0,0,0,0,0.040258,0.120775,0,0,0,0,0,0,-0.040258,0.080517,0,0,0,0,0,0,0.040258,0.040258,0,0,0.080517,0,0,0,0,-0.120775,0,0,0.080517,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,-0.040258,0,0,0,0,0,0,-0.040258,0,0,-0.120775,0,0,0,0,0,0,0,-0.040258,0,0,0,0.080517,-0.080517,0,0.040258,0,0,0,0,0,0,0.080517,0,0,0.040258,0,0,0.080517,0,0,0,0,0.040258,0,0.080517,0,0,-0.120775,0,0,0,-0.040258,0,0,-0.120775,-0.040258,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0.040258,0,-0.040258,0,-0.040258,0,-0.040258,0.161034,0,0,0,0,0,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0.040258,0,0,0,-0.080517,0,0,0,0,0,-0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040258,0,0,0,0,0,0,0,0,0,0,0,0,-0.040258,0,0,0,0.040258,0,0,0.040258,0,0.040258,0,0,0,0,0,-0.080517,0,-0.040258,0,0,0,0,0,0,-0.080517,0,0,0,0,-0.040258,0.281809,0,0,0,0,0,0,-0.040258,0,0,0,0,0,0,0,0,-0.201292,-0.080517,0,0.040258,0,0.040258,0,0,0,0,0,0,0,-0.120775,0,0,0,0.040258,0,0,0,0,0,0,0,0,0.040258,0.040258,0.120775,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.120775,0,0,0,0.040258,-0.040258,0,0,0.040258,0,0,0,0,0,0,0,0,0,0,0,0,0.080517,0,0,0,0,0,0,0,0.040258,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('10931cdc-e736-498f-a74a-e1dd9fb33817', 'Clio', 'clio.com', 'Full Stack Developer Co-op', 'Burnaby', 'BC', 'HYBRID', 'INTERNSHIP', '$38 - $46 CAD/hr', 'https://clio.com/careers/fullstack-coop', 'Clio is transforming the legal experience for all. Join our product engineering team in Burnaby to build customer-facing cloud features using Ruby on Rails, TypeScript, and React.', '["Enrolled in an accredited Canadian university co-op program", "Experience with TypeScript, React, Ruby, or Python", "Curiosity about building secure and accessible cloud applications", "Based in Metro Vancouver"]', '["TypeScript", "React", "Ruby", "Rails", "PostgreSQL"]', NULL, '[0,0,0,0,0,0,0.120096,0.040032,-0.040032,0,0,0.040032,0,0,0,-0.040032,0,0,0,0,0,0,-0.160128,0,-0.160128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040032,0,0,0.040032,0,0,0.040032,0,0,0,0,0,0,0,0,0,0,0,-0.120096,-0.040032,0,0,0,-0.040032,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,-0.160128,0,0,0,0,0,0,0,0,0,0,0.040032,0,0.120096,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0.120096,0,0,0,0,0,0.040032,0,0,0,0,0,0,0.080064,0,0,0.040032,0,0,0,0.080064,0,0,0,0,0,0,0,0,0.040032,0.040032,0,0,0,0,0,0,-0.080064,-0.080064,0,-0.040032,0,0,0,0,0,0,0,0,0,0,0,-0.120096,0.040032,0,-0.040032,-0.040032,0.120096,0,0,0,0.120096,0,0,0,0,0.120096,0,0,0.040032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040032,0,0,0,0,0,0,0,0,-0.040032,0,0,0,0.120096,0,0,0,0,0,0,0,0,-0.120096,0,0,0,0,0,0,0,0,0,-0.120096,-0.040032,0,0,0,0.040032,0,0,0,0,0,0,-0.040032,0,0,0.040032,0,0.040032,0,0,0,0,0,0,0.120096,0,0.040032,0,0,0,0,0,0,0,0,-0.120096,0,0,-0.080064,0,0,0,0,0,0,0,-0.120096,-0.040032,0,0,0,0,0,0,0,0,0,0,0,0,-0.040032,-0.040032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.120096,0,0,0,0,0,0,0,0,0,0.040032,0,0,0,0,0,0,0,0,0.040032,0,0,0,0.040032,0,0,0,0,0,0,0,-0.040032,0,0,0,0,0,0,0,-0.040032,0.120096,0,-0.120096,0,0.120096,0,0,0,0,-0.040032,0,0,0.120096,0.040032,0,0,0,0,0,0,0,0,0,0,0,0,0.040032,0,0,0,0,0.080064,0,-0.040032,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0.040032,0,0.080064,0,0,0,0,0,-0.040032,0,0,0,0,0,0,0,0,0,0.120096,0,0,0,0,-0.040032,0,0,0,0,0,0,0.040032,0,0,-0.040032,0,0,0.040032,0,0,0,0,-0.040032,0,0,0,0,-0.040032,0,0,0,0,0,-0.080064,0.080064,0,0,0,0.080064,0,0,0,0.040032,0,0,0,0,0,0,-0.040032,0,0,0,0.080064,0,0,-0.080064,0.120096,0,-0.040032,0,0,0.040032,-0.040032,0,0,-0.040032,0,0,0,-0.080064,0,0,0,0,0,0,0.120096,0,0,0,0,0,0,0,0,0,0,0,-0.160128,-0.080064,0.040032,0.160128,0,0,-0.040032,-0.040032,0,0,-0.120096,0,0,0,0,0,0,0,0,0.120096,0,-0.120096,0,0.040032,0,0,-0.120096,0,0,0.040032,-0.040032,0,0,-0.120096,0,0,0,0,0,0,0,0,0,0,-0.120096,0,0,0,0,0,0,-0.040032,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,-0.040032,0,0,0,-0.040032,0,0,0,0,0,0.040032,0,0,0,0.040032,0,0,0,-0.080064,-0.120096,0,0,0,0,0,0,0,0,0,0,0,0.040032,0,0,-0.040032,0,0,0,0,0,0.040032,0,0,0,-0.080064,0,0,0,-0.040032,0,-0.040032,0,0,0,0,0,0,0.240192,0,0,0,0.040032,0.040032,0,-0.040032,0,0,0,-0.040032,0,0,0,0,0,0.040032,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040032,-0.040032,0,0,-0.080064,0,-0.040032,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,-0.040032,0,0,0,-0.120096,0,0,0,0,0.040032,0,0,0,0,0,0,0,0,0,0.120096,0,0,0,0,0,0,0.040032,0.080064,0,0,0,0.040032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,-0.040032,0,0,0,0,0,0,0,0.120096,-0.240192,0,0,0,-0.040032,0,0.040032,0,0]', '2026-10-06 17:57:54.999776+00');
INSERT INTO public.discovered_jobs VALUES ('22222222-2222-2222-2222-222222222201', 'Amazon Vancouver', 'amazon.com', 'Software Development Engineer (SDE) Intern', 'Vancouver', 'BC', 'HYBRID', 'INTERNSHIP', '$55 - $64 CAD/hr', 'https://amazon.jobs/en/jobs/vancouver-sde-intern', 'Join Amazon Vancouver tech teams working on AWS services, digital retail infrastructure, and customer identity solutions at scale.', '["Currently enrolled in a Bachelor or Master program in CS, CE, or related field graduating between Fall 2025 and Spring 2027", "Proficiency in Java, C++, Python, or Go", "Deep understanding of object-oriented design and algorithms", "Located in or willing to relocate to Vancouver, BC"]', '["Java", "AWS", "Python", "Data Structures", "Distributed Systems"]', '2026-10-27 08:04:05.849368+00', '[0,0.040423,0,0,-0.040423,0,-0.040423,-0.121268,-0.040423,0,0,0.040423,0,0,0,0,0,-0.242536,0.040423,-0.080845,0,0,0,0,-0.040423,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0,-0.040423,0,0.040423,-0.121268,0,0,0.040423,0,0,0,0,0,-0.040423,-0.040423,-0.040423,-0.121268,0,0,-0.040423,0,0.121268,0,0,0,0,0,0,0,0,0,-0.121268,0,0.040423,0,0,0,0,0,0,0,0.040423,0,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0.040423,-0.040423,-0.040423,0,0,0,0,0.040423,0,0,0,0,-0.040423,0,-0.040423,0.121268,0,0,0,0,0.040423,0.121268,0,0,0,0,0,0,0,0,0.040423,0.040423,0,0,0.080845,0,0,0,0,0,-0.121268,0,0,0,0.040423,0,0,0,0,0,0,0,0.121268,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,0.040423,0,0,-0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.121268,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040423,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040423,0.040423,0,0,0,0.080845,0,0,0.040423,0,0,0,-0.121268,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,0.040423,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,0,0,0,0.040423,0,0,0,0,0.080845,0,0,0,0.040423,0,0,0,0,0,0,-0.040423,0,0.040423,0,0,0,0,0,0.121268,0,0,0.202113,0,0,0,0,0,-0.16169,0,0,0,0,0,0.040423,0,0,0,0,-0.202113,0,0.040423,0,0,0,0,0,0.040423,0,0,0,0.040423,0,0,0,0.040423,0,0,0,0.121268,-0.040423,-0.121268,0,0,0,0.040423,0,0,0,0,0,0,0,0,-0.040423,-0.040423,0,-0.040423,0.040423,0,-0.040423,0,0,0,-0.040423,0,0,0,0,0,0,0,0,0,0.121268,-0.040423,0,0,0,0,0,0,0,0.040423,-0.121268,0,0,0,-0.121268,0,0,0.080845,0.121268,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080845,-0.080845,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040423,0,0,0,0,0,0.040423,0,0,0,0,0,0,0.080845,0,0,0,0,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,-0.121268,0,0,0,-0.040423,0,0,0,0.080845,0,0,0,0,0,0,-0.040423,0,-0.040423,0.121268,0,0.080845,0.040423,0,0,0,-0.040423,0,0.121268,0,0,0,0,0.040423,0,-0.121268,0,0,0.040423,0,0,0,0,0,0,0,0,0.040423,0.121268,0,0,0,0,0,0,0,0,-0.040423,0.040423,0,-0.080845,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,0,-0.080845,0,0,0,-0.040423,0,0,0,0,0,0.080845,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040423,0,0,0,0,0,0.040423,0,0,0,-0.080845,0,0,0,0,0,-0.040423,-0.040423,0.040423,0,0,0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040423,0,0,0,0,0,0,0,-0.040423,0,0,0,0,0,0,-0.040423,0,0.040423,0,0,-0.040423,0,0,0,0,0,0,-0.121268,0,0,0.040423,0,0,0.363803,0,0,0,0,0,0,0.080845,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080845,0,0,0,0,0,0,-0.040423,-0.121268,-0.080845,0,0,0.080845,0.040423,0,0,0.040423,0,0,0,-0.040423,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.121268,0.121268,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.121268,0,0,0,0,0,0,0.040423,0,0,-0.121268,0,0,0]', '2026-10-06 08:04:05.849368+00');
INSERT INTO public.discovered_jobs VALUES ('9bb69d87-70a4-469d-994b-16336979ebfd', 'StackAdapt', 'stackadapt.com', 'People Operations Intern - Winter 2027', 'Remote', 'REMOTE', 'ONSITE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://job-boards.greenhouse.io/stackadapt/jobs/4412772009', '<div class="content-intro"><p>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marketers choose StackAdapt to orchestrate high-impact campaigns across programmatic advertising and marketing channels.</p></div><p>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marketers choose StackAdapt to orchestrate high-impact campaigns across programmatic advertising and marketing channels.</p>
<p>We are looking for a <strong>People Operations Intern</strong> to provide administrative support across our Talent, People &amp; Office Operations team. Reporting to the <strong>Manager, People Operations &amp; Global Mobility</strong>, you will play a key role in keeping our team organized, our data accurate, and our hiring process running smoothly. This is a great opportunity for someone who enjoys the details—you’ll balance core coordination tasks with projects aimed at making our internal processes more efficient and user-friendly.</p>
<p>StackAdapt is a remote-first company. We are open to candidates located anywhere in the GTA for this position and encourage those from all backgrounds to apply.</p>
<h3><strong>What you’ll be doing:</strong></h3>
<ul>
<li>Provide broad administrative support across the employee lifecycle, including interview scheduling, managing talent workflows in the ATS (Greenhouse), onboarding &amp; offboarding in the HRIS, submitting internal support tickets and other administrative support.&nbsp;</li>
<li>Monitor the People Operations and Global Mobility mailboxes, responding to general employee questions and routing requests as needed.</li>
<li>Prepare standard employment documents, such as verification letters, and maintain organized digital files for the team.</li>
<li>Support the tracking of company policy updates and assist with the basic administrative tasks required for work authorizations.</li>
<li>Perform regular data entry and routine audits within the HRIS&nbsp; to ensure all employee information remains accurate and consistent.</li>
<li>System updates across the People Technology stack.</li>
<li>Provide hands-on People Ops back-up for our Toronto Hub Office Coordinator, helping maintain a great employee environment through WeWork access management, office inventory, leadership room bookings, and virtual mailbox administration.</li>
<li>Pitch in with other fun People Operations projects and general administrative tasks as assigned!&nbsp;</li>
</ul>
<p><strong><br></strong><strong>What You’ll Bring to the Table:</strong></p>
<ul>
<li>Must be currently enrolled in a post-secondary program, with a strong preference for Human Resources or a related field.</li>
<li>Strong written and verbal communication, ability to take meeting notes and help draft step-by-step guides for team tasks.</li>
<li>Proficiency in Excel/Google Sheets skills (pivots, VLOOKUPs) is advantageous, along with an interest in AI tools, learning how systems connect, and exploring automated forms and workflows.</li>
<li>Demonstrates a high degree of personal integrity and an understanding of the importance of keeping employee information confidential.</li>
<li>Strong attention to detail and accuracy for compliance-heavy tasks, data audits and reporting.</li>
<li>Comfortable working independently and taking initiative.</li>
</ul><div class="content-pay-transparency"><div class="pay-input"><div class="description"><p>The compensation range listed for this role reflects the expected base hourly pay for candidates located in the posting country based on a global rate. It is informed by market data and the approved budget for this position. StackAdapt maintains different compensation ranges for roles across other countries and regions, and final offers will be aligned to the candidate’s current location. <em>We do not ask c</em>andidates about current or prior compensation history, and we will not use such information, if volunteered, in setting an offer.</p>
<p>This range represents base hourly compensation only.&nbsp;</p>
<p><strong>Factors Influencing Final Compensation:</strong></p>
<ul>
<li>The final compensation offer will be determined by a variety of factors, which may include, but are not limited to: the candidate''s specific experience, technical skills, knowledge, abilities, and relevant education, licensure, and certifications.</li>
<li>Other business factors, such as organizational needs and budget alignment, may also be considered in the final offer.</li>
</ul></div><div class="title">Canada Hourly Rate Band</div><div class="pay-range"><span>$18</span><span class="divider">&mdash;</span><span>$22 CAD</span></div></div></div><div class="content-conclusion"><div class="section page-centered">
<h3>StackAdapter''s Enjoy:</h3>
<ul>
<li data-stringify-indent="0" data-stringify-border="0">Highly competitive salary</li>
<li data-stringify-indent="0" data-stringify-border="0">Retirement/ 401K/ Pension Savings globally</li>
<li data-stringify-indent="0" data-stringify-border="0">Competitive Paid time off packages including birthday''s off!</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to a comprehensive mental health care program</li>
<li data-stringify-indent="0" data-stringify-border="0">Health benefits from day one of employment</li>
<li data-stringify-indent="0" data-stringify-border="0">Work from home reimbursements</li>
<li data-stringify-indent="0" data-stringify-border="0">Optional global WeWork membership for those who want a change from their home office and hubs in London and Toronto</li>
<li data-stringify-indent="0" data-stringify-border="0">Robust training and onboarding program</li>
<li data-stringify-indent="0" data-stringify-border="0">Coverage and support of personal development initiatives (conferences, courses, books etc)</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to StackAdapt programmatic courses and certifications to support continuous learning</li>
<li data-stringify-indent="0" data-stringify-border="0">An awesome parental leave program</li>
<li data-stringify-indent="0" data-stringify-border="0">A friendly, welcoming, and supportive culture</li>
<li data-stringify-indent="0" data-stringify-border="0">Our social and team events!</li>
</ul>
<p><em>Please note: Benefits and perks may vary depending on your country of employment and the nature of your engagement. In locations where StackAdapt does not have a legal entity, employment and benefits are administered in accordance with local regulations and partner policies.</em></p>
</div>
<div class="section page-centered" data-qa="closing-description">
<div><em>StackAdapt is a diverse and inclusive team of collaborative, hardworking individuals trying to make a dent in the universe. No matter who you are, where you are from, who you love, follow in faith, disability, superpower status, ethnicity, or the gender you identify with (if you’re comfortable, let us know your pronouns), you are welcome at StackAdapt. </em></div>
<div>&nbsp;</div>
<div><em>StackAdapt is committed to providing an inclusive and accessible recruitment process. Accommodations are available upon request for candidates taking part in all aspects of the selection process. If you require an accommodation, please let us know.</em></div>
<div>&nbsp;</div>
<div><em data-stringify-type="italic">We use artificial intelligence (AI) to streamline the resume reviews of candidates and assess their fit based on the criteria outlined in the job posting. We do not use AI to make any final hiring or interview decisions.</em></div>
<div>&nbsp;</div>
<div><strong>About StackAdapt</strong></div>
<div>&nbsp;</div>
<div>We''ve been recognized for our diverse and supportive workplace, high performing campaigns, award-winning customer service, and innovation. We''ve been awarded:</div>
<div>&nbsp;</div>
<div><a href="https://www.stackadapt.com/resources/blog/g2-2026-best-software-awards" target="_blank">G2 Top Software for 2026</a><br><a href="https://www.greatplacetowork.ca/en/bestworkplaces/best-workplaces-for-young-talent/2026" target="_blank">2026 Best Workplaces™ for Young Talent</a> and <a href="https://www.stackadapt.com/resources/blog/great-place-to-work-best-workplaces-canada-2026" target="_blank">in Canada</a> by Great Place to Work®<br><a href="https://www.stackadapt.com/resources/blog/best-cross-channel-advertising-platform" target="_blank">#1 DSP on G2 and leader in a number of categories including Cross-Channel Advertising</a></div>
<div><a href="https://www.stackadapt.com/resources/blog/adweek-tech-stack-awards-2026">2026 Winner in the (CTV/OTT) Product/Platform category for the 2026 ADWEEK Tech Stack Awards</a></div>
<div>&nbsp;</div>
<div>To learn more about our privacy practices, please see our <a href="https://www.stackadapt.com/legal-document-centre/website-and-platform-user-privacy-policy">Privacy Policy</a>.</div>
<div>&nbsp;</div>
<div><span style="color: rgb(243, 243, 244);">#LI-REMOTE</span></div>
</div></div>', '["Experience with AI"]', '["AI"]', NULL, '[0.020708,0.020708,0,0,0,0,0,-0.020708,-0.020708,0,0,0.062124,0,0.062124,0.062124,0.020708,0,0.041416,0,-0.020708,0,0,0,0.062124,-0.144955,0,0,-0.041416,0,0,0.020708,0,0.020708,0,-0.020708,0,0.020708,0,0,0.062124,0,0,-0.041416,-0.020708,0.020708,0,0,0,0,-0.020708,0,-0.020708,0,-0.062124,-0.020708,0,0,-0.310618,-0.020708,0,0,0,0,0,0,0,0,0,0,0.062124,0.041416,0,0.124247,0,0,0,0,-0.020708,0,-0.062124,0,0,0,-0.020708,0,0.020708,0,0.020708,0,-0.041416,0,-0.062124,0,0,-0.041416,0,0,0,0.020708,0,0,0,0,-0.062124,0,0,0,0,0,0,0.186371,0,0,0,-0.020708,0,0,0,0,-0.020708,-0.103539,0.020708,-0.082832,0.020708,0,0.041416,0,0,0,0,0.020708,0.020708,0,0,0,0,-0.041416,0,0,0,-0.020708,0,-0.020708,-0.124247,0,0.062124,0,0,-0.020708,0,-0.020708,0,-0.020708,0,0,0,-0.062124,0.020708,0,0.041416,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020708,0.041416,0,0.041416,-0.020708,0,-0.062124,-0.020708,0,0,0,0,0.020708,-0.020708,0,0,0,0.041416,0,0.062124,0,0,0,-0.020708,0,0,0,0,0,0,0,0,0,0,0.186371,0,0,0,0,0,0.020708,0.041416,0,0,0,0,0,0,0,0,0,0.020708,0,0,0.041416,0.020708,0.020708,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.020708,0.020708,0.041416,0,0,0,-0.062124,0,0,0,0,0.020708,-0.020708,0.041416,-0.020708,0.020708,0,0,0.041416,0,0,0,0,0,0,0.124247,0,0,0,0,0,0.020708,0,0,0,0,0,0,-0.020708,0,0,0,0,0,0.041416,0,0,0,0,0.144955,0,0.041416,0,0,0,0,0,0,0,0,0,0,0,0,0.020708,-0.020708,0.041416,0,0.020708,0.020708,0,0,0.020708,0.062124,-0.020708,0,0.103539,-0.062124,0.144955,0,0,0,0,0,0,0,0,-0.041416,0.020708,-0.020708,0,0,0,0.020708,0,0,0,0.041416,0,0.062124,0,0.103539,0.020708,0.124247,0,0,-0.062124,0,0,0,0,0,0,0,0,0.062124,0,-0.020708,0,0,-0.020708,0,0,0.020708,0,0,0.020708,0.082832,0.020708,-0.124247,-0.020708,-0.020708,0,0,0,0,0.062124,0.041416,0.020708,0.020708,0,-0.020708,-0.020708,0.020708,0,0,0,0.020708,0,0,0.062124,0,0,0,-0.020708,0,-0.020708,0,0.020708,0,0,0.020708,0,0.124247,0,0,0,-0.020708,0.082832,0.041416,0,0,-0.020708,0,0.020708,0.020708,0,0,0,0,0,0.103539,0,0.041416,0,-0.020708,0,0,0,0.020708,0,0,0,0.062124,0.020708,0,0,-0.041416,-0.041416,0,0,0,0,0,0,0,0.020708,0.082832,0,0,0,0,0,0,-0.020708,0,0,0,-0.020708,0,-0.041416,0.041416,0,0,0,0,0,0,0,0,0.020708,-0.020708,0,0,0.062124,0,-0.020708,0,0,0,0,0.020708,0,-0.186371,-0.103539,0,0,-0.020708,0,-0.062124,0,0,0,0.041416,0.041416,0,0.020708,0,0,0,-0.020708,0.020708,0,0.062124,0,0,0.082832,0,0,0,-0.020708,0,0,0,0.062124,0,0,0.062124,0,0,0,-0.062124,0,0,0,0,0,0,0,0,0,0.020708,0,0,0.020708,0,0,0.020708,0,0.062124,0.020708,0,0,0.020708,0,0,0.020708,0,0,0.062124,0,0,-0.020708,0,0,-0.020708,0,0,0.041416,0,0,0,0,0,0.020708,0,-0.062124,0,0,0.041416,0,0,0.020708,0.020708,0,0.062124,0,0,0,0,0,-0.020708,0,-0.186371,0,0,0,0,0,0,0.103539,-0.020708,0.103539,0.020708,0,0,0,0,0,-0.062124,0,0,-0.062124,0,0,0,0,0.103539,0,0,0,0,0,0,0.041416,0,0.020708,0,0,0,0,0,0,-0.082832,0,0,0,0,0,0,0,0,0,0,0,0,-0.062124,0,0,0,0,-0.020708,0,0,0,0,0,-0.041416,0,0,0,0,0.020708,0.041416,0,0,0.041416,-0.020708,0,0.020708,0,-0.041416,0,0,0,0.020708,0,0,0,0.020708,0,-0.020708,0,0,0.103539,0,0,-0.020708,0,0.124247,0,0,0,-0.020708,0.041416,0,-0.020708,0.041416,0.020708,0,0,0,0,0,-0.124247,-0.186371,0,0,0,0.041416,0.041416,0.020708,0,0,0,0,-0.041416,-0.020708,0,0,0,0,0,0,0,0,0,-0.186371,-0.020708,0,0.020708,0.020708,-0.062124,-0.020708,0.062124,0.041416,-0.144955,-0.020708,0,0,0,0,0,0,0,0,0.041416,0.020708,-0.062124,0.041416,-0.041416,0,0,0,0,0,0,0.186371,0,0.165663,0,0,0,0,0,0.020708,0,0,0]', '2026-10-06 17:57:58.083169+00');
INSERT INTO public.discovered_jobs VALUES ('060dea8f-7354-4919-9b90-b5adba588d02', 'D-Wave Quantum', 'dwavesys.com', 'Quantum Software Developer Intern', 'Burnaby', 'BC', 'ONSITE', 'INTERNSHIP', '$44 - $52 CAD/hr', 'https://dwavesys.com/careers/quantum-software-intern', 'Work at the forefront of practical quantum computing in Burnaby, BC. Build Python-based hybrid quantum-classical solvers and Ocean SDK developer tools.', '["Pursuing Bachelor or Master degree in Computer Science, Physics, or Math", "Proficiency in Python and numerical libraries (NumPy, SciPy)", "Interest in combinatorial optimization and quantum algorithms", "Based in Greater Vancouver, BC"]', '["Python", "NumPy", "C++", "Quantum Computing", "Algorithms"]', NULL, '[0,0.07581,0,0,0,0.189525,-0.113715,0,0,0,-0.037905,0,0,0,0.113715,0,0,0,0,0,0,-0.037905,-0.07581,0,-0.07581,0,-0.113715,-0.037905,0,0,0.037905,0,0,-0.113715,0,0,0,0,0,-0.037905,0,0,0,-0.15162,0.189525,0,0.037905,0,0,0,0,-0.037905,0,-0.037905,-0.07581,0,0,0,0,0,0,0,0,0,0.037905,0,0,0,0,0,-0.037905,0,0,0,0,0,0.037905,0,0,0,0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07581,-0.037905,0,0,0.07581,0,0,0,0,-0.037905,0,0,0,0,0.07581,0,0,0,0,0,-0.037905,0,0,0,-0.037905,0,0,0,0.07581,0,0,0,0.037905,0,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0,0.113715,0,-0.037905,0,0,0,0,0.037905,-0.037905,0,-0.037905,0,0,0,0,-0.113715,0,0,0,-0.227429,0,0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037905,0,0,0,0,0,-0.113715,0,0,0,0,0,0,0,0,0,0,0.189525,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0,0,0,0.113715,0,0,0,0,0,0,0.037905,-0.037905,0,0,0,0,0.037905,0,0,0,0,0,0.037905,0,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037905,0,0,-0.07581,0,0,0,0,0,0,0,-0.037905,0,0,0,0,0,0.037905,0,0,0,0,-0.113715,0,0,0.113715,0,0,0,0,0,0.037905,0,0,0,0,0,0,0,0,0.037905,0,0,0,0.037905,0,0,0.037905,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0,0.07581,0,0.037905,0,-0.113715,0,0,0,0,0,-0.037905,-0.037905,0,0,0,0,0.037905,0,0,0,0,0,0,0,0,0,0,0,0,-0.07581,0,0,0,0,0.113715,0,0,-0.037905,0,0,0,0.037905,0.303239,0,0,0.113715,0,0,0,0,0,0,0,0,0,0.227429,0,0,0,0,0.189525,0,0,0,0,0.113715,0.037905,0,0,0.037905,0,0,0,0,0,-0.07581,0,0,0,0,0,0,0.113715,0.113715,0,0,0,0,0,0,0,-0.037905,0,-0.037905,0,0,0,0,0,-0.113715,-0.113715,0,0,0,-0.037905,0,0,0,0,0,0,0.07581,-0.037905,0,0,0,0,0,0.037905,0,0,0.037905,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.15162,0,0,0,0,0,0,0,0,0,0,0,0.113715,0,0,0,0,0.037905,0,0,0.037905,0,-0.07581,0,0,0.037905,0,-0.037905,0,0.037905,0,0,-0.07581,0,0,0,0,0,0,0.037905,0,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.113715,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07581,0,0.037905,0,0.037905,0,0.113715,0,0,0,-0.113715,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0.07581,0,0,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037905,0.037905,0,0.113715,0.113715,0,0,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0,0,0.037905,0,0,0.037905,0,0,0,0,0,-0.037905,0,0,0,0,0,0,0.037905,0,0,0,0.037905,0,0,0,-0.113715,0,0,0,0,0,0,0,0,0,0,0,0,-0.037905,0,0.113715,0,0,0,0,0,0,-0.189525,0.07581,0,0,0,0,0,0,0.113715,0,0,0,0.037905,0,0,0,0,0,0,0,0.037905,-0.037905,0,0,0,0,0,0,0,0,0,0,0,0.037905,0,-0.07581,0,0,0.037905,0,0,0]', '2026-10-06 17:57:55.002414+00');
INSERT INTO public.discovered_jobs VALUES ('1bb6dd4c-7ee1-4c5e-8c34-0435f9ded769', 'AltaML', 'altaml.com', 'Applied AI Developer Co-op', 'Edmonton', 'AB', 'HYBRID', 'INTERNSHIP', '$38 - $44 CAD/hr', 'https://altaml.com/careers/ai-developer-coop', 'AltaML Edmonton is building applied machine learning products for healthcare, energy, and finance. Help train and deploy ML models and REST microservices.', '["Enrolled in Computer Science, Data Science, or related co-op stream", "Strong foundation in Python, Pandas, and PyTorch or scikit-learn", "Familiarity with FastAPI and containerized deployments", "Based in Edmonton or Calgary, AB"]', '["Python", "PyTorch", "FastAPI", "Machine Learning", "Docker"]', NULL, '[0,0,0,0.119904,0,0,0,-0.039968,0,0.119904,0,0,0,0,0,-0.039968,0,0,0.039968,-0.039968,0,0,0,0,-0.119904,0,-0.119904,0,0,0,0,0,0,0,0,0,0.119904,0,0,-0.039968,-0.119904,0,0,0,0,0,0.039968,0,0,-0.039968,0,-0.079936,0,0,-0.039968,0,0,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0.039968,0,0,0,0,0,0.039968,0,0,0,0,0,0,0,0,0.039968,0,0,0,0,0,-0.039968,0,-0.039968,0,0,0,0,0,0,0.119904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0,0,0.039968,-0.039968,0,0,0.039968,0,0,0,0.039968,0,0,0,0,0,-0.079936,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039968,0,0,-0.119904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0,0,0,0,0,0,0,0,0,0,-0.039968,0.119904,0,0,0,0.079936,0,0,0,0,0,0,-0.239808,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.119904,0,0.119904,0.039968,0,0,0,0,0,0,0.039968,-0.079936,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0.119904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039968,0.039968,0,-0.039968,0,0,0,0,0,0,0,0,-0.039968,0,0,0.039968,0,0,0,0,-0.119904,0,0,0,0,0,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0,0,0.079936,0,0,0,0,0,0.079936,0,0,0,0,0,-0.039968,0,0,0.079936,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039968,0.159872,0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.239808,0,0,0.119904,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039968,-0.079936,0,0,0,0,0.039968,-0.039968,-0.039968,0.039968,-0.039968,0,-0.039968,0,0,0.039968,0,-0.039968,0,0,0,0,0.039968,-0.039968,0,0,0,0,0,0,0,0.079936,-0.039968,0.119904,0,0,0,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0.119904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.119904,0,-0.079936,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0,0.079936,0,-0.039968,0,0,0.079936,0.039968,0,0,-0.079936,0.039968,0,0,0,0,0,0,0,0,0,0,0.039968,0,0,0,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0.279776,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0,0.039968,0,0,0,0,0,0,0,0,0,0.039968,0,0,0,-0.159872,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.119904,0,-0.039968,-0.039968,0,0,-0.039968,0,0,0,-0.079936,0,0,-0.079936,0,0,0.079936,-0.039968,0,0,0,0,-0.039968,0,0,0,0,0.039968,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039968,0,0,-0.079936,0,0,0,0,0,0,0,0,0.039968,0,0,0,0,0,0,-0.119904,0,0,0,0,0,0,0,-0.119904,-0.039968,0.039968,0,0,0,0.039968,0,0,0,0,0,0,-0.039968,0,0,-0.039968,0,0,0.079936,0,0,0,0,0,0,0,0,0.039968,0,0,0,0.079936,0,-0.039968,0,0,0,0,0,-0.079936,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0,0,-0.119904,0,0,0,0,0,0.039968,0,0,-0.359712,0.159872,0,0,0,0,0.079936,-0.079936,0,0,0,0,0,0,0,0,0,0,0,0,0,0.039968,0,0,0,0,-0.039968,0.039968,-0.039968,0,0,0,0,0,0.039968,-0.079936,0,0,0,0.039968,0,0,0,-0.039968,0,0,0,0,0,0,0,0,0,0,0.119904,0,0,0,0,0,0,0,-0.079936,0]', '2026-10-06 17:57:55.007537+00');
INSERT INTO public.discovered_jobs VALUES ('6d32254f-48ab-49e0-a8eb-b92003e396cf', 'Wealthsimple', 'wealthsimple.com', 'Intern, Finance', 'Remote', 'REMOTE', 'HYBRID', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://jobs.ashbyhq.com/wealthsimple/50dcb3a5-b896-42c6-8173-0f6a95718ead', 'Build something people love
Wealthsimple is Canada’s leading financial innovator. The company offers a full suite of simple, sophisticated financial products across managed investing, do-it-yourself trading, cryptocurrency, tax filing, spending and saving. Wealthsimple currently serves more than 4 million Canadians and holds over $155 billion in assets under administration. The company was founded in 2014 by a team of financial experts and technology entrepreneurs, and is headquartered in Toronto, Canada.
We''re proud of what we''ve built — and we''re just getting started. Read our
Culture Manual
and learn more about
how we work
.
Intern, Finance (Winter 2027, 8 months)
Term: 8 months, beginning January 11, 2027. Six tracks, one application.
About Finance at Wealthsimple
The Finance team is where numbers become decisions. We partner closely with business leaders across the company to make sure Wealthsimple is allocating resources wisely, hitting its targets, and building toward long-term sustainability. We are a high-trust team embedded in the business rather than reporting from the sidelines, and we hold ourselves to a high bar for both rigour and clarity.
About this role
Finance Operations (Procure-to-Pay).
Most of what Wealthsimple spends with third parties runs through this team, from the moment someone asks for something to the moment the vendor gets paid, so it works with almost every team in the company. You would help people bring a purchase through Zip, our intake software, onboard new vendors, and move a request along when it needs a Legal, Security, Privacy, or vendor-risk review. On the payments side you would work alongside Accounts Payable to match invoices against the purchase order, code them to the right team and account, and route them for approval in Zip. You would also help more of our spend run through an approved purchase order before the invoice arrives, which is what makes spend visible before it is committed , and report on where requests slow down. High volume, high visibility, and a real seat in a process being rebuilt while it runs.
What you''ll do
Own real work from your first weeks, with a manager and a mentor who expect you to ask questions and form a view.
Learn one part of Finance deeply, and see how it connects to the rest of the company.
Bring AI into how the work gets done. Our teams already use tools like Claude in the monthly close and in automating repetitive steps, and we want you looking for the next place it helps.
Improve something.  Think about process that could run better, we would rather hear your idea than watch you work around it.
Learn how a fintech operates, and how to read financial and operational data in a business that moves quickly.
See the line from your work to the client. Everything these teams do ends up in a number someone trusts us with.
Skills you bring
Working toward a degree in accounting, business, finance, or a related field, or recently finished one.
A working understanding of accounting principles and concepts. You do not need to have seen the specific work in your track before.
Strong attention to detail, with the communication and collaboration skills to work across teams.
Comfort in a fast-moving environment with real deadlines.
Curiosity about technology, fintech, and how AI is changing the way a Finance team works.
Energy and intellectual curiosity, with a demonstrated interest in finance and analytics.
Application deadline is October 7th 11:59pm ET!
Why Wealthsimple?
🌸 Top-tier health benefits and life insurance
📈 Long-term group savings with employer match, through Wealthsimple for Business
🌴 20 vacation days, 4 wellness days, and unlimited sick and mental health days per year*
✈️ 90 days away: work outside Canada for up to 90 days per year*
👥 Employee resource groups, including Rainbow (2SLGBTQ), Women of WS, and Black at WS
🌎 We are a hybrid team with over 1,500 employees across North America. The people are one of the best parts of working here: you''ll collaborate with incredibly talented, curious, and driven teammates who are deeply committed to doing great work.
*Unlimited paid sick days, Wellness Days and the 90 day away program do not apply to certain roles.
ICYMI
Technology & Innovation at Wealthsimple:
We move quickly and build thoughtfully. That means we''re always looking for better ways to work — whether that''s new tools, AI, or rethinking how we approach a problem. We don''t expect you to have all the answers, but we do expect curiosity and a willingness to evolve alongside the products we''re building.
Inclusion Statement:
We''re building products for a diverse world, and we need a diverse team to do it well. We strongly encourage applications from everyone, regardless of race, religion, colour, national origin, gender, sexual orientation, age, marital status, or disability status.
Accessibility Statement:
We''re committed to an accessible hiring experience. If you need any accommodations throughout the interview process, please let us know — we''ll work with you to make sure you have what you need. We also welcome any feedback on how we can better accommodate candidates with accessibility needs.
AI in Hiring:
We may use artificial intelligence (AI) tools to support parts of our hiring process, such as reviewing applications, analyzing resumes, or assessing responses. These tools assist our team but don''t replace human judgment – all final hiring decisions are made by people. If you have questions about how your data is used, reach out to us.', '["Experience with Rest", "Experience with AI"]', '["Rest", "AI"]', NULL, '[0,0,0,0,0,0,0.068059,-0.090745,0,0,0,0.113431,0,0,0.022686,-0.022686,-0.022686,-0.045373,0,0,0,0,0,0.045373,-0.18149,0,0,-0.022686,0,0,0,0,-0.022686,0,0,0,0.068059,-0.068059,0,-0.022686,-0.090745,0,0,0,0,0,0,0,0,-0.045373,0,-0.022686,0,-0.045373,0.068059,-0.022686,0,0,0,0,-0.068059,0,0.068059,0.068059,-0.068059,0,0,0,0,0,0.022686,-0.022686,0.045373,0,0.022686,0,0,0,0,0,0,0,0,0.022686,-0.022686,-0.022686,0,-0.068059,0,0,0,0,0,0,0,0,0,0,0.045373,0,0,0,0,0,0,0,0.022686,0,-0.068059,0,0,0,0,0.068059,0,0,0.090745,0,0,0,-0.068059,0.045373,0,0,0,0,0,0.022686,-0.068059,0,0.022686,0,0,0.068059,-0.022686,0,0,-0.045373,0.068059,0,0,0,0,-0.068059,0,0.022686,0,-0.068059,-0.045373,0,-0.022686,0,-0.022686,0,0,-0.022686,-0.090745,0.068059,0,0.022686,0,0,0,0,0,0,-0.022686,0,0,-0.068059,0,0,0,-0.022686,0,-0.022686,0.022686,0.045373,0.045373,0.022686,0,-0.022686,0,0,0,0,0,-0.136118,0,0,-0.022686,0.068059,0,0,0,-0.045373,0.022686,0,0.022686,0,0,0,0,-0.045373,-0.022686,0,0,0,0.136118,0,0,0,0,0,0.022686,0,0,0,0,0,0,0,0,0,0,0,0,0.045373,0.022686,0,0,0,0,0,-0.022686,0,-0.022686,-0.022686,0,0,-0.045373,0,0,0,0,0,0,0,0.045373,0,0,0.022686,0,0,0,0,0,0,0,-0.022686,0,-0.022686,0.022686,0,-0.022686,0,0,-0.022686,0,0,0.068059,0,0,0,-0.045373,-0.068059,-0.068059,0,0,0,0,0,0,0.068059,0.022686,-0.068059,0.022686,0,0,0,-0.022686,0,0.272236,0.090745,0.022686,0.045373,0,0,-0.022686,0,0,0.022686,-0.022686,0.068059,0.022686,-0.022686,0.068059,0,0,0,0,0,0,0,-0.022686,0,-0.022686,0,0,0,0,0,0.045373,0,0,0.022686,-0.022686,0.068059,0,0,-0.022686,0,0,0,0,0.022686,0.022686,0,0,0,0.022686,0,-0.045373,0,-0.022686,0,0.068059,-0.090745,-0.022686,0,0.090745,0,0,0,0,-0.022686,0,0,0.090745,0,0,0,0,0,0.090745,0.045373,0,0,0,0,0,0,0,0,0,0.022686,0,0,-0.136118,0.022686,0,0,0,0,0,0,-0.045373,0,0,0,0,0,0,-0.022686,0,0,0,0.136118,-0.022686,0,0,0,0.18149,0.022686,0,0.022686,0,0.090745,0,0,0,0,0.068059,0.022686,0,0,0.068059,-0.045373,0,0,-0.022686,-0.022686,0,-0.022686,0,0,0,0,-0.068059,0,0,0,0.022686,0,0.022686,0,0,0,0,0.022686,0,0,0,0,0,0,-0.068059,-0.090745,0,-0.068059,0,0,0,0,0,0,0.045373,-0.022686,0,-0.068059,0,0,0.022686,0,0,0,0,0,0,-0.022686,-0.022686,0,-0.022686,0,0,0,-0.068059,0.022686,0,0,0,0.090745,0,0,-0.068059,-0.022686,0,0,-0.068059,0,0,0,0,-0.045373,0,0,0,0,0,0,-0.022686,0,0,0,0,0.090745,0,0,0,0,0.022686,0,0.022686,0,0,0.045373,0,0.068059,0.022686,-0.068059,0,-0.068059,-0.022686,0,0,0.045373,0.022686,0,0,0,0,-0.022686,0,0.022686,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.022686,0.022686,0,0,0,0,-0.068059,-0.18149,0.068059,0.068059,0,0,0,0,0,0,0.045373,0,0,0.022686,-0.022686,0,0.022686,0,-0.045373,0,0,-0.090745,0,0,0.022686,0,0,0.090745,0.045373,0,0.022686,0,0,0,-0.068059,0.022686,0,0,0,0,0,0,0.022686,0,0,0.045373,0.022686,0.045373,0.022686,0,0,-0.068059,0,0,0,0,0,0,0.022686,0,0,-0.022686,0,0,0,0,0,0,0,0,0,0,0,0.068059,0,0,0,0,-0.158804,0,0,0,0,0,0,0.022686,0,0,0,0,-0.068059,0.022686,0,0,-0.090745,0.022686,0,0.022686,0,0,0,-0.068059,-0.022686,0,0,-0.090745,0,0,0.045373,0.022686,0,0.068059,0,0,0,0,-0.022686,0,0,0,-0.090745,-0.022686,-0.068059,0.022686,0,-0.022686,0,0,0,0.068059,0,0.022686,0.022686,0,0,-0.022686,-0.022686,-0.113431,0,0,0,-0.045373,0.022686,0,0,0,0,-0.068059,-0.022686,-0.068059,-0.249549,0.022686,0,0,0.045373,0.045373,0,-0.022686,-0.068059,0,0,-0.068059,0,-0.022686,0,0.204177,0,0,0,0.022686,0,0,0,0,-0.022686,0,0,-0.045373,0,0,0,0,0,0,0,0,0.090745,0,0,0,0.022686,0,0,0.022686,0.045373,0.022686,-0.068059,0,0,0,0,0,0.022686,0.068059,0.158804,0,0,0,0,-0.022686,0,0,0,0.045373]', '2026-10-06 17:57:58.047668+00');
INSERT INTO public.discovered_jobs VALUES ('b810920d-3817-4ee2-b85e-81070f292b79', 'Cohere', 'cohere.com', 'Software Engineer Intern (Winter 2027)', 'Remote', 'REMOTE', 'REMOTE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://jobs.ashbyhq.com/cohere/8c035d3d-081d-4c8a-914a-72f4efaad254', 'Who are we?
Cohere is the leading security-first enterprise AI company.  We build cutting-edge foundation AI models and end-to-end products that are designed to solve real-world business problems.
We’re training and deploying frontier models for enterprises who are building AI systems. We believe that our work is instrumental to the widespread adoption of AI and we are looking for folks that want to be part of that.
We obsess over what we build. Each one of us is responsible for contributing to increasing the capabilities of our models and the value they drive for our customers. Cohere is a team of researchers, engineers, designers, and more, who are all passionate about their craft.
We are a global technology company headquartered in Toronto with key offices in London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul. Join us!
Why this role?
This role is for students who are excited about building the next generation of machine learning models and NLP products. Our SWE roles can cover creating datasets for machine learning, scaling the pods to serve our API, or even building out new security features on our platform. We don''t distinguish much between interns and full-time employees, and you’ll have plenty of opportunities to push code to production. You''ll have full autonomy and ownership over high-impact work, and will be backed by the support of an incredible team or leaders & mentors.
Join us at a pivotal moment, shape what we build, and wear multiple hats!
We''re currently hiring for multiple teams and roles, including Frontend, Backend, Full-stack, and Infrastructure roles. We''ll take your interests & experience into account throughout the application process.
Our recruitment process will begin in the upcoming weeks, and we will be carefully reviewing applications and assessing potential candidates for our internships. Should we find a suitable match with your qualifications and our requirements, we will be in touch to discuss the opportunity further and to advance your application to the next stage.
Please Note:
To be eligible for this position, you should be currently enrolled in a post-secondary program and available for a full-time 3-6 month internship, co-op, or research work term.
As a Software Engineering Intern, you will:
Ship delightful experiences for our user-facing products, meticulously crafting code for browsers or server code.
Build features for the API platform that directly impact users.
Design and implement robust data pipelines (crawlers, storage, filters).
Design and implement scalable services or infrastructure for machine learning development.
Build internal tooling (CI/CD, dev utilities) to move faster together.
Build tech writing skills through maintaining and contributing to technical documentation, both internal and external facing.
Keep up with the cutting edge and adopt new technologies to improve performance and reliability across Cohere.
Full-Time Employees at Cohere enjoy these Perks:
A weekly lunch stipend of $75/£75 or equivalent in your local currency for lunch.
Full health and dental benefits, including a separate budget for mental health.
RRSP matching, 401K, Pension Scheme.
100% Parental Leave top-up for up to 6 months, for either parent.
Annual enrichment benefits:
Arts & culture, fitness/wellness, quality time, and a workspace improvement credit.
Education & learning stipend for conferences, courses, and coaching.
6 weeks of paid vacation (30 working days!)
Budget for traveling to other offices if you are remote, plus an annual company offsite.
How and Where We Work:
Cohere is remote-friendly, but we also have offices in Toronto, London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul with more opening soon.
For those in the office: a daily lunch program, plenty of snacks, and regular community and social events.
For those not near an office: a co-working benefit so you can work alongside others in your city.
Everyone receives a $500 home office stipend to set up your workspace properly.
If any of the above doesn’t line up exactly with your experience, we still encourage you to apply.
We strive to create an inclusive work environment for all; we welcome applicants from all backgrounds and are committed to providing equal opportunities. Should you require any accommodations during the recruitment process, please submit an
Accommodations Request Form
, and we will work together to meet your needs.
We may use AI-enabled tools to screen and assess applicants against the criteria for this position. This helps our recruiters identify potentially qualified candidates, but it doesn''t limit the applications our recruiters may review or consider.
Beware of Scams: Cohere will never ask for payment or third-party services (e.g., CV writing) as part of our hiring process. All legitimate roles are listed on the Cohere careers page and LinkedIn only, with all communications from Cohere employees coming from an @cohere.com or @cw.cohere email alias. If jobs are viewed on other sites then please verify these through our
official careers
page.', '["Experience with CI/CD", "Experience with Machine Learning", "Experience with AI"]', '["CI/CD", "Machine Learning", "AI"]', NULL, '[0,0,0,0,0,0.018236,0.164125,0.018236,-0.018236,0,0,-0.054708,0,0,0.091181,-0.018236,0,0,-0.018236,0.072945,0,0,0,0,-0.164125,0,-0.145889,0,-0.018236,0,0,0,0.072945,0,0,0.054708,0,0,0,-0.054708,0,-0.018236,0,-0.054708,0,-0.018236,-0.018236,0,0,0,0,-0.036472,-0.018236,-0.054708,0,0,0,-0.164125,0,0,0,0,0,0,0,0,0,0,0,0,0.072945,0,0.018236,0,0,0.054708,0,0.054708,0,0,0,0,-0.018236,0,0,0,0,0,0,0,0,0,0,-0.054708,0,0,0.018236,0.018236,-0.018236,0,0,0,0.218834,0.018236,0,0.018236,0,0,-0.018236,0.018236,-0.018236,0,0,-0.018236,0,0,0,0,0,0,0,0,0,0.018236,0,0,0,-0.054708,0,0,0,0,0,-0.018236,0,0,-0.018236,0,0,0,0,0,-0.018236,0,0,0,0,0,0,-0.018236,-0.018236,0,-0.036472,0,0.018236,0,0.036472,0,0,0,0,0,0,0,0,-0.018236,0,0,0,0,0,0,0.036472,-0.018236,0,0,0,0.036472,0.036472,0,0,-0.036472,0,0,0,0.018236,0.018236,-0.072945,0,0,0,0.018236,0,0.018236,0,-0.018236,0.054708,0,0,0,0,0,0,-0.018236,0,0,0,0,0.218834,0,0,-0.018236,0,-0.036472,0,0,0,0.018236,0,0,0,-0.054708,0,0,0,-0.054708,0,-0.036472,0,0,0.072945,0,0.018236,0,0,0,0,-0.072945,0,0,0,0,0,0,-0.018236,0,0,0.018236,0.018236,0,0,0.036472,0,0,0.018236,-0.018236,0,0,0,-0.018236,0,-0.018236,0,-0.018236,0,0,0,0,0,0,-0.018236,0,0,0,-0.018236,0,0.218834,0,0,0,0,0,0,-0.054708,0,0,-0.018236,0,0,0,0,0,0.218834,0.091181,0.018236,0,0,0,0,0,0,0,0,0.036472,0,0,-0.054708,0,0,0,0,0,0.036472,0,0.018236,0,-0.054708,-0.072945,0.072945,0,0.036472,0,0,0,0,0.018236,0,0,0,0.054708,0,0,0,0,0,0,-0.072945,0,-0.018236,-0.054708,0,-0.018236,0,0,0,0,0.091181,0,0,0,0.072945,0,0,0,0,-0.054708,-0.018236,0,0.054708,-0.036472,0,0.018236,0,0,0.036472,-0.018236,-0.091181,0,0.054708,0,0,0.018236,-0.018236,0,0,-0.018236,-0.018236,0,-0.164125,0,-0.018236,0.018236,0,0,0,0,0.054708,-0.018236,0.054708,0,-0.018236,-0.091181,0.018236,0.018236,0,0,-0.018236,0,0,0,0,0.018236,-0.018236,0.018236,0,0,0.018236,0,0.054708,0,0.018236,0,0,0,0,0,0.054708,-0.018236,0,0,0.018236,0,0.018236,0,0,0,-0.054708,-0.018236,0,-0.054708,0,-0.018236,0.018236,-0.018236,0,0,-0.054708,0,0.036472,0,-0.054708,0.018236,0,0,0,0,0.018236,0.018236,0,0,0,-0.018236,0,-0.054708,0,0.036472,0.018236,-0.273542,0,0,0,0,0,0.018236,0,0,0,0.054708,0,0.018236,0,-0.036472,0,0,0,0,0.054708,0,0,0,-0.036472,0.018236,0,0.018236,0,-0.018236,0,-0.018236,-0.109417,0,0,0,0,-0.018236,0,0,0,-0.018236,-0.036472,0,0,0,0,0,0,0.273542,0,0,0,-0.018236,0.018236,-0.054708,0.018236,0,0,0.127653,0,0,0,-0.018236,0.018236,0,0,0.018236,0,0,0,0,-0.018236,0,0,-0.018236,0,0.018236,0,0,-0.036472,0.036472,0,0,0,0,0,0,0,0.054708,0.072945,-0.018236,0,0.072945,0,0.018236,0,-0.018236,0,0,0,0,0.018236,0,0.018236,0,-0.164125,0,-0.018236,0.054708,0,0.018236,-0.018236,0,-0.018236,0,0,0,0,0,0,0,0,0,0,0,0.054708,0,0.036472,0,0,0.018236,0,0,0,0,0,0,0,0,0,0,0,0.091181,-0.072945,0,-0.054708,0.054708,0,0,0,0,0,0,-0.018236,0,0,0,0,0,-0.036472,0,0,0,0,0,0,-0.018236,0,0.018236,-0.054708,0.018236,0,0,0.054708,0,-0.072945,0,0.054708,0,0,0,0,0,0,0,0.018236,0,-0.054708,0.036472,0,0,0,0.018236,-0.018236,0,0,0,0,0,0,0,0,0,0,0,0.036472,0,0,0.018236,0,0,0.018236,0,0,0,-0.054708,0,-0.018236,0,0,0,0,-0.018236,0,0,0,0,0,0,-0.018236,-0.018236,0.054708,0,0,0,-0.018236,0.036472,0,0.018236,0.054708,0,0,0,0,0,0,-0.036472,-0.200598,0.018236,0,0,0.054708,0.018236,0.036472,0,0.018236,0,0,0,0,-0.018236,0.018236,0,0,0.054708,0.054708,0.018236,0.018236,0,0.018236,0,-0.018236,0,-0.018236,-0.054708,-0.018236,0.018236,0,-0.145889,0.054708,0,0,0,-0.018236,0,0,0.018236,0,0,0,-0.054708,0.018236,0,0,0,-0.018236,0,0,0,0,0,0.218834,0,0,0.036472,0,0.054708,0,0,-0.018236,0]', '2026-10-06 17:57:58.056202+00');
INSERT INTO public.discovered_jobs VALUES ('330d045b-7b5b-4e5d-961e-a8c33636acd7', 'Cohere', 'cohere.com', 'Research Internship (Winter 2027)', 'Remote', 'REMOTE', 'REMOTE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://jobs.ashbyhq.com/cohere/73bd3e2b-6597-4124-b64b-1e5dbc32e785', 'Who are we?
Cohere is the leading security-first enterprise AI company.  We build cutting-edge foundation AI models and end-to-end products that are designed to solve real-world business problems.
We’re training and deploying frontier models for enterprises who are building AI systems. We believe that our work is instrumental to the widespread adoption of AI and we are looking for folks that want to be part of that.
We obsess over what we build. Each one of us is responsible for contributing to increasing the capabilities of our models and the value they drive for our customers. Cohere is a team of researchers, engineers, designers, and more, who are all passionate about their craft.
We are a global technology company headquartered in Toronto with key offices in London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul. Join us!
Why this role?
To have the opportunity to collaborate with Cohere researchers and tools on designing and implementing novel research ideas and shipping state-of-the-art models to production. We have openings in teams covering base model training, retrieval augmented generation, data and evaluation, safety, and finetuning, to name a few; and we are open to receiving intern applications in any research area relating to LLMs to broaden your research connections while obtaining deep experience in a growing AI startup.
Please Note:
To be eligible for a Research Internship, you must be currently pursuing a PhD in Machine Learning, NLP, or a related discipline. You need to be available for a full-time internship that lasts for 4-6 months.
As a Cohere Research Intern, you will:
Conduct cutting-edge machine learning research, building and training large language models.
Focus on research projects aimed at expanding the frontier of knowledge in language modelling and associate areas such as evaluation, multimodal models, optimisation etc.
Disseminate your research results through the production of publications, datasets, and code.
Contribute to research initiatives that have practical applications in Cohere’s product development.
You may be a good fit if you:
Are currently pursuing, or in the process of obtaining, a PhD in Machine Learning, NLP, Artificial Intelligence, or a related discipline. We will also consider exceptional non-PhD candidates.
Are eligible for work authorization in the country of employment at the time of hire and maintain ongoing work authorization throughout the internship period.
Have experience using large-scale distributed training strategies, data annotation and evaluation pipelines, or implementing state of the art ML models.
Are familiar with autoregressive sequence models, such as Transformers.
Have strong communication and problem-solving skills with the ability to convey complex research findings clearly and succinctly.
Have knowledge, or are knowledgeable, of programming languages such as Python, C, C++, Lua, or related languages.
Have knowledge of related ML frameworks such as JAX, Pytorch and Tensorflow.
Have previous experience in building systems based on machine learning and deep learning techniques.
Demonstrate passion for applied NLP models and products.
Preferred Qualifications:
Demonstrated expertise through publications in top tier venues in fields such as machine learning, NLP, artificial intelligence, computer vision, optimization, computer science, statistics, applied mathematics, or data science.
Proven ability to tackle analytical problems using quantitative methodologies.
Proficiency in handling and analysing complex, high-dimensional data from various sources.
Experience in applying theoretical and empirical research to real-world problem-solving.
Full-Time Employees at Cohere enjoy these Perks:
A weekly lunch stipend of $75/£75 or equivalent in your local currency for lunch.
Full health and dental benefits, including a separate budget for mental health.
RRSP matching, 401K, Pension Scheme.
100% Parental Leave top-up for up to 6 months, for either parent.
Annual enrichment benefits:
Arts & culture, fitness/wellness, quality time, and a workspace improvement credit.
Education & learning stipend for conferences, courses, and coaching.
6 weeks of paid vacation (30 working days!)
Budget for traveling to other offices if you are remote, plus an annual company offsite.
How and Where We Work:
Cohere is remote-friendly, but we also have offices in Toronto, London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul with more opening soon.
For those in the office: a daily lunch program, plenty of snacks, and regular community and social events.
For those not near an office: a co-working benefit so you can work alongside others in your city.
Everyone receives a $500 home office stipend to set up your workspace properly.
If any of the above doesn’t line up exactly with your experience, we still encourage you to apply.
We strive to create an inclusive work environment for all; we welcome applicants from all backgrounds and are committed to providing equal opportunities. Should you require any accommodations during the recruitment process, please submit an
Accommodations Request Form
, and we will work together to meet your needs.
We may use AI-enabled tools to screen and assess applicants against the criteria for this position. This helps our recruiters identify potentially qualified candidates, but it doesn''t limit the applications our recruiters may review or consider.
Beware of Scams: Cohere will never ask for payment or third-party services (e.g., CV writing) as part of our hiring process. All legitimate roles are listed on the Cohere careers page and LinkedIn only, with all communications from Cohere employees coming from an @cohere.com or @cw.cohere email alias. If jobs are viewed on other sites then please verify these through our
official careers
page.', '["Experience with Python", "Experience with Machine Learning", "Experience with Pytorch", "Experience with AI"]', '["Python", "Machine Learning", "Pytorch", "AI"]', NULL, '[0.01827,0,0,0,0,0.01827,0.164426,0.01827,0,0,0,-0.054809,0,0,0.091348,-0.01827,0,0,-0.073078,0.036539,0,0,0,0,-0.164426,0,-0.146157,0,-0.01827,0,0,0,0.073078,0,0,0.054809,0,0,0,-0.054809,0,-0.01827,0,0,0,-0.01827,-0.01827,0,0,0,0,-0.036539,-0.01827,-0.054809,-0.01827,0,0,-0.164426,0,0,0,0,0,0,0,0,0,0,0,0,0.073078,0,0.01827,0,0,0.054809,0,0.054809,0,0,0,0,-0.01827,0,0,0,0,0,0,0,0,0,0,-0.073078,0,0,0,0.01827,-0.01827,0,0,0,0.219235,0.01827,0.01827,0.01827,0,0,-0.01827,0.01827,-0.01827,0,0,-0.01827,0,0,0,0,0,0,0,0,0,0.01827,0,0,0,-0.054809,0,0,0,0,0,-0.01827,0,0,-0.01827,0,0,0,0,0,-0.01827,0,0,0,0,0,0,-0.01827,-0.01827,0,-0.036539,0,0.01827,0,0.036539,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.036539,-0.01827,0,0,0,0.036539,0.036539,0,0,-0.036539,0,0,0,0.01827,0.01827,-0.073078,0,0,0,0.073078,0,0.01827,0,-0.01827,0.054809,0,0,0,0,0,0,-0.01827,0,0,0,0,0.219235,0,0,-0.01827,0,-0.01827,0,0,0,0.01827,0,0,0,-0.054809,0,0,0,-0.054809,0,-0.036539,0,0,0.073078,0,0.01827,0,0,0,0,-0.073078,0,0,0,0,0,0,-0.01827,0,0,0.01827,0.01827,0,0,0.054809,0,0,0.01827,-0.01827,0,0,0,-0.01827,0,-0.01827,0,-0.01827,0,0,0,0,0,0,-0.01827,0,0,0,-0.036539,0,0.219235,0,0,0,0,0,0,-0.054809,0,0,-0.01827,0,0,0,0,0,0.219235,0.091348,0.01827,0,0,0,0.01827,0,0,0,0,0.036539,0,0,-0.054809,-0.01827,0,0,0,0,0.036539,0,0.01827,0,-0.054809,-0.073078,0.073078,0,0.036539,0,0,0,0,0.01827,0,0,0,0.036539,0,0,0,0,0,0,-0.073078,0,0,-0.054809,0,-0.01827,0,0,0,0.01827,0.091348,0,0,0,0.073078,0,0,0,0,0,-0.01827,0,0.054809,-0.036539,0,0.01827,0,0,0.036539,-0.01827,-0.091348,0,0.054809,0,0,0.01827,-0.01827,0,0,-0.01827,-0.01827,0,-0.164426,0,-0.01827,0.01827,0,0,0,0,0.054809,-0.01827,0.054809,0,-0.01827,-0.073078,0.01827,0.01827,0,0,-0.01827,0,0,0,0,0.01827,-0.01827,0.01827,0,0,0.01827,-0.01827,0.054809,0,0.01827,0,0,0,0,0,0.054809,-0.01827,0,0,0.01827,0,0.01827,0,0,0,-0.054809,0,0,-0.054809,0,-0.01827,0.01827,-0.01827,0,0,-0.054809,0,0.036539,0,-0.054809,0.01827,0,0,0,0,0.036539,0.01827,0,0,0,-0.01827,0,-0.054809,0,0.036539,0.01827,-0.274044,0,0,0,0,0,0.01827,0,0,0,0.054809,0.01827,0.01827,0,-0.036539,0,0,0,0,0.01827,0,0,0,0.01827,0.01827,0,0,0,-0.01827,0,0,-0.109618,0,0,0,0,-0.01827,0,0,0,-0.01827,-0.01827,0,0,0,0,0,0,0.274044,0,0,0,-0.01827,0.01827,-0.054809,0.01827,0,0.01827,0.127887,0,0,0,-0.01827,0.01827,0.01827,0,0.01827,0,0,0,0,-0.01827,0,0,0,0,0.01827,0,0,-0.036539,0.036539,0,0,0,0,0,0,0,0.054809,0.073078,-0.01827,0,0.073078,0,0,0,-0.01827,0,0,0,0,0.01827,0,0.01827,0,-0.164426,0,-0.01827,0,0,0.01827,-0.01827,0,-0.01827,0,0,0,0,0,0,0,0.036539,0,0,0,0.054809,0,0.036539,0,0,0,0,0,0,0,0,0,0,0,0.01827,0,0,0.091348,-0.073078,0,-0.054809,0.054809,0,0,0.01827,0,0,0,0,0,0,0,0,0,-0.036539,0,-0.01827,0,0,0,0,-0.01827,0,0.01827,-0.036539,0.01827,0,0,0.054809,0,-0.073078,0,0.054809,0,0,0,0,0,0,0,0.01827,0,-0.054809,0.036539,0,0,0,0.01827,-0.01827,0,0,0,0,0,0,0,0,0,0,0,0.036539,0,0,0.01827,0,0,0.036539,0,0,0,-0.054809,0,-0.01827,0,0,0,0,-0.01827,0,0,0,0,0,0,-0.01827,-0.01827,0.054809,0,0,0,-0.01827,0.036539,-0.036539,0.01827,0.054809,0,0,0,0,0,0,-0.036539,-0.200966,0.01827,0,0,0.054809,0.01827,0.036539,0,0.01827,0,0,0,0,-0.01827,0.01827,0,0,0.054809,0.054809,0.01827,0,0,0.01827,0,-0.01827,0,-0.01827,-0.036539,-0.01827,0.01827,0,-0.146157,0.054809,0,0,0,-0.01827,0,0,0.01827,0,0,0,-0.054809,0.01827,0,0,0,-0.01827,0,0,0,0,0,0.219235,0,0,0.036539,0,0.054809,0,-0.054809,-0.01827,0]', '2026-10-06 17:57:58.063495+00');
INSERT INTO public.discovered_jobs VALUES ('59375c6d-2e56-4454-b0c2-4d587577ef32', 'Cohere', 'cohere.com', 'Machine Learning Intern/Co-op  (Winter 2027)', 'Remote', 'REMOTE', 'REMOTE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://jobs.ashbyhq.com/cohere/36d1f52f-8270-4652-adf5-5303a0ff341b', 'Who are we?
Cohere is the leading security-first enterprise AI company.  We build cutting-edge foundation AI models and end-to-end products that are designed to solve real-world business problems.
We’re training and deploying frontier models for enterprises who are building AI systems. We believe that our work is instrumental to the widespread adoption of AI and we are looking for folks that want to be part of that.
We obsess over what we build. Each one of us is responsible for contributing to increasing the capabilities of our models and the value they drive for our customers. Cohere is a team of researchers, engineers, designers, and more, who are all passionate about their craft.
We are a global technology company headquartered in Toronto with key offices in London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul. Join us!
Why this role?
Ship state of the art models to production.
Design and implement novel research ideas.
Build elegant training/deployment pipelines.
Join us at a pivotal moment, shape what we build and wear multiple hats as an intern!
Our recruitment process will begin in the upcoming weeks, and we will be carefully reviewing applications and assessing potential candidates for our internships. Should we find a suitable match with your qualifications and our requirements, we will be in touch to discuss the opportunity further and to advance your application to the next stage
Please Note:
To be eligible for this position you should be a student currently enrolled in a post-secondary program, available for a full-time 3-6 month internship, co-op, or research work term.
As a Machine Learning Intern, you will:
Design, train and improve upon cutting-edge models.
Help us develop new techniques to train and serve models safer, better, and faster.
Train extremely large-scale models on massive datasets.
Explore continual and active learning strategies for streaming data.
Learn from experienced senior machine learning technical staff.
Work closely with product teams to develop solutions.
You may be a good fit if you have:
Proficiency in Python and related ML frameworks such as Tensorflow, TF-Serving, JAX, and XLA/MLIR.
Experience using large-scale distributed training strategies.
Familiarity with autoregressive sequence models, such as Transformers.
Strong communication and problem-solving skills.
A demonstrated passion for applied NLP models and products.
Bonus
: experience writing kernels for GPUs using CUDA.
Bonus
: experience training on TPUs.
Bonus
: papers at top-tier venues (such as NeurIPS, ICML, ICLR, AIStats, MLSys, JMLR, AAAI, Nature, COLING, ACL, EMNLP).
Full-Time Employees at Cohere enjoy these Perks:
A weekly lunch stipend of $75/£75 or equivalent in your local currency for lunch.
Full health and dental benefits, including a separate budget for mental health.
RRSP matching, 401K, Pension Scheme.
100% Parental Leave top-up for up to 6 months, for either parent.
Annual enrichment benefits:
Arts & culture, fitness/wellness, quality time, and a workspace improvement credit.
Education & learning stipend for conferences, courses, and coaching.
6 weeks of paid vacation (30 working days!)
Budget for traveling to other offices if you are remote, plus an annual company offsite.
How and Where We Work:
Cohere is remote-friendly, but we also have offices in Toronto, London, New York City, San Francisco, Montreal, Paris, Berlin and Seoul with more opening soon.
For those in the office: a daily lunch program, plenty of snacks, and regular community and social events.
For those not near an office: a co-working benefit so you can work alongside others in your city.
Everyone receives a $500 home office stipend to set up your workspace properly.
If any of the above doesn’t line up exactly with your experience, we still encourage you to apply.
We strive to create an inclusive work environment for all; we welcome applicants from all backgrounds and are committed to providing equal opportunities. Should you require any accommodations during the recruitment process, please submit an
Accommodations Request Form
, and we will work together to meet your needs.
We may use AI-enabled tools to screen and assess applicants against the criteria for this position. This helps our recruiters identify potentially qualified candidates, but it doesn''t limit the applications our recruiters may review or consider.
Beware of Scams: Cohere will never ask for payment or third-party services (e.g., CV writing) as part of our hiring process. All legitimate roles are listed on the Cohere careers page and LinkedIn only, with all communications from Cohere employees coming from an @cohere.com or @cw.cohere email alias. If jobs are viewed on other sites then please verify these through our
official careers
page.', '["Experience with Python", "Experience with Machine Learning", "Experience with AI"]', '["Python", "Machine Learning", "AI"]', NULL, '[0,0,0,0,0,0.01814,0.163259,0.01814,0,0,0,-0.05442,0,0,0.090699,-0.01814,0,0,-0.01814,0.05442,0,0,0,0,-0.181399,0,-0.145119,0.01814,-0.01814,0,0,0,0.07256,0,0,0.05442,0,0,0,-0.05442,0,-0.01814,0,0,0,-0.01814,-0.01814,0,0,0,0,-0.03628,-0.01814,-0.05442,-0.01814,0,0,-0.163259,0,0,0,0,0,0,0,0,0,0,0,0,0.07256,0,0.01814,0,0,0.05442,0,0.05442,0,0,0,0,-0.01814,0,0,0,0,0,0,0,0,0,0,-0.05442,0,0,0,0.01814,-0.01814,0,0,0,0.217679,0.01814,0,0.01814,0,0,-0.01814,0.01814,-0.01814,0,0,-0.01814,0,0,0,0,0,0,0,0,0,0.01814,0,0,0,-0.05442,0,0,0,0,0,-0.01814,0,0,-0.01814,0,0,0,0,0,-0.01814,0,0,0,0,0,0,-0.01814,-0.01814,0,-0.03628,0,0.01814,0,0.03628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03628,-0.01814,0,0,0,0.03628,0.03628,0,0,-0.03628,0,0,0,0.01814,0.01814,-0.07256,0,0,0,0.01814,0,0.03628,0,-0.01814,0.05442,0,0,0,0,0,0,-0.01814,0,0,0,0,0.217679,0,0,-0.01814,0,-0.03628,0,0,0,0.01814,0,0,0,-0.05442,0,0,0,-0.05442,0,-0.03628,0,0,0.07256,0.01814,0.01814,0,0,0,0,-0.07256,0,0,0,0,0,0,-0.01814,0,0,0.01814,0.01814,0,0,0.03628,0,0,0.01814,-0.01814,0,0,0,-0.01814,0,-0.01814,0,-0.01814,0,0,0,0,0,0,-0.01814,0,0,0,-0.01814,0,0.217679,0,0,0,0,0,0,-0.05442,0,0,-0.01814,0,0,0,0,0,0.217679,0.090699,0.01814,0,0,0,0,0,0,0,0,0.03628,0,0,-0.05442,0,0,0,0,0,0.03628,0,0.03628,0,-0.05442,-0.07256,0.07256,0,0.03628,0,0,0,0,0.01814,0,0,0,0.05442,0,0,0,0,0,0,-0.07256,0,0,-0.05442,0,-0.01814,0,0,0,0.01814,0.090699,0,0,0,0.07256,0,0,0,0,0,-0.01814,0,0.05442,-0.03628,0,0.01814,0,0,0.03628,-0.01814,-0.090699,0,0.05442,0,0,0.01814,-0.01814,0,0,-0.01814,-0.01814,0,-0.163259,-0.01814,-0.03628,0.01814,0,0,0,0,0.05442,-0.01814,0.05442,0,-0.01814,-0.07256,0.01814,0.01814,0,0,-0.01814,0,0,0,0,0.01814,-0.01814,0.01814,0,0,0.01814,0,0.05442,0,0.03628,0,0,0,0,0,0.05442,-0.01814,0,0,0.01814,0,0.01814,0,0,0,0,0,0,-0.05442,0,-0.01814,0.01814,-0.01814,0,0,-0.05442,0,0.03628,0,-0.05442,0.01814,0,0,0,0,0.03628,0,0,0,0,-0.01814,0,-0.05442,0,0.03628,0.01814,-0.272098,0,0,0,0,0,0.01814,0,0,0,0.05442,0,0.01814,0,-0.03628,0,0,0,0,0.01814,0,0,0,-0.03628,0.01814,0,0,0,-0.01814,0,0,-0.108839,0,0,0,0,-0.01814,0,0,0,-0.01814,-0.01814,0,0,0,0,0,0,0.272098,0,0,0,-0.01814,0.01814,-0.05442,0.01814,0,0,0.126979,0,0,0,-0.01814,0.01814,0.01814,0,0.01814,0,0,0,0,-0.01814,0,0,0,0,0.01814,0,0,-0.03628,0.03628,0,0,0,0,0,0,0,0.05442,0.07256,-0.01814,0,0.07256,0,0,0,-0.01814,0,0,0,-0.01814,0.01814,0,0.01814,0,-0.163259,0,-0.03628,0,0,0.03628,-0.01814,0,-0.01814,0,0,0,0,0,0,0,0,0,0,0,0.05442,0,0.03628,0,0,0,0,0,0,0,0,0,0,0,0.01814,0,0,0.090699,-0.126979,0,-0.05442,0.05442,0,0,0.01814,0,0.01814,0,0,0,0,0,0,0,-0.05442,0,0,0,0,0,0,-0.01814,0,0.01814,-0.03628,0.01814,0,0,0.05442,0,-0.07256,0,0.05442,0,0,0,0,0,0,0,0.01814,0,-0.05442,0.03628,0,0,0,0.01814,-0.01814,0,0,0,0,0,0,0,0,0,0,0,0.03628,0,0,0.01814,0,0,0.01814,0,0,0,-0.05442,0,-0.01814,0,0,0,0,-0.01814,0,0,0,0,0,0,-0.01814,-0.01814,0.05442,0,0,0,-0.01814,0.03628,-0.01814,0.01814,0.05442,0,0,0,0,0,0,-0.03628,-0.199539,0.07256,0,0,0.05442,0.01814,0.05442,0,0.01814,0,0,0,0,-0.01814,0.01814,0,0,0.05442,0.05442,0.01814,0,0,0.01814,0,-0.01814,0,-0.01814,-0.03628,-0.01814,0.01814,0,-0.145119,0.05442,0,0,0,-0.01814,0,0,0.01814,0,0,0,-0.05442,0.01814,0,0,0,-0.01814,0,0,0,0,0,0.217679,0,0,0.03628,0,0.05442,0,-0.05442,-0.01814,0]', '2026-10-06 17:57:58.069541+00');
INSERT INTO public.discovered_jobs VALUES ('bac64211-6f3e-4d9b-859e-1e67fc4d9495', 'StackAdapt', 'stackadapt.com', 'Product Design Intern - Winter 2027', 'Remote', 'REMOTE', 'ONSITE', 'INTERNSHIP', '$38 - $55 CAD/hr', 'https://job-boards.greenhouse.io/stackadapt/jobs/4398009009', '<div class="content-intro"><p>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marketers choose StackAdapt to orchestrate high-impact campaigns across programmatic advertising and marketing channels.</p></div><div class="section page-centered">
<div class="section page-centered">
<div class="section page-centered">
<div class="section page-centered">
<div class="section page-centered">
<div class="section page-centered">
<p data-qa="preview-description">&nbsp;</p>
<div>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marketers choose StackAdapt to orchestrate high-impact campaigns across programmatic advertising and marketing channels.</div>
<div>&nbsp;</div>
<div>StackAdapt is the no. 1 performing programmatic advertising platform helping brands accelerate customer engagement and acquisition. This state-of-the-art platform is where some of the most progressive work in machine learning meets cutting-edge user experience.</div>
<div>&nbsp;</div>
<div>Ranking the highest in performance by G2 Crowd for the fourth time, we''re one of the fastest growing companies in Canada and ranks 6th in Deloitte''s Technology Fast 50 ranking and 23rd in Fast 500 in North America.</div>
<div>&nbsp;</div>
<div>At StackAdapt, we’re helping clients deliver exceptional advertising outcomes by building the best omni-channel demand-side platform. As a Product Design Intern at StackAdapt, you will be contributing to products that help our customers thrive. You’ll work collaboratively with Product Designers and Engineers, to design and launch features for our platform, ultimately delivering a consistent and usable experience which enables clients to better plan, execute, and analyze their ad campaigns.</div>
<p>&nbsp;</p>
</div>
<div class="section page-centered" data-qa="preview-list-item-0">
<h3 data-qa="preview-list-item-0-text">What you''ll be doing:</h3>
<ul class="posting-requirements plain-list">
<ul data-qa="preview-list-item-0-content">
<ul>
<li>Collaborate with product managers, designers, and engineers to explore and define user-centered design solutions</li>
<li>Assist in creating wireframes, mockups, prototypes, and user flows for new and existing features.</li>
<li>Work within existing design patterns while identifying opportunities to improve usability and aesthetics</li>
<li>Contribute to design auditing, ensuring design consistency is aligned with our halo design system</li>
<li>Contribute to design reviews by sharing your work and providing feedback to peers.</li>
<li>Participate in team meetings and cross-functional collaboration sessions.</li>
</ul>
</ul>
</ul>
</div>
<div class="section page-centered" data-qa="preview-list-item-1">
<h3 data-qa="preview-list-item-1-text">What you''ll bring to the table:</h3>
<ul class="posting-requirements plain-list">
<ul data-qa="preview-list-item-1-content">
<ul>
<li>Previous experience (through coursework, internships, or personal projects) designing digital products or software solutions.</li>
<li>A portfolio that highlights your ability to understand user needs, explore ideas, and communicate your design process—from early concepts to final outcomes.</li>
<li>Must be currently enrolled in an HCI, User Experience, Computer Science, Software Engineering or similar program at a post-secondary institution</li>
<li>Knowledge of latest industry tools, trends, and processes Solid understanding of design thinking, usability principles, inclusive design, and visual design basics such as layout, typography, and color.</li>
<li>Your communication is crisp, clear, and effective both in written and verbal formats - and you always know your audience; you''ve delivered complex software designs before and can speak to their successes.</li>
</ul>
</ul>
</ul>
</div>
<div class="section page-centered">
<p data-qa="preview-closing">&nbsp;</p>
</div>
</div>
</div>
</div>
</div>
</div><div class="content-pay-transparency"><div class="pay-input"><div class="description"><p>The compensation range listed for this role reflects the expected base hourly pay for candidates located in the posting country based on a global rate. It is informed by market data and the approved budget for this position. StackAdapt maintains different compensation ranges for roles across other countries and regions, and final offers will be aligned to the candidate’s current location. <em>We do not ask c</em>andidates about current or prior compensation history, and we will not use such information, if volunteered, in setting an offer.</p>
<p>This range represents base hourly compensation only.&nbsp;</p>
<p><strong>Factors Influencing Final Compensation:</strong></p>
<ul>
<li>The final compensation offer will be determined by a variety of factors, which may include, but are not limited to: the candidate''s specific experience, technical skills, knowledge, abilities, and relevant education, licensure, and certifications.</li>
<li>Other business factors, such as organizational needs and budget alignment, may also be considered in the final offer.</li>
</ul></div><div class="title">Canada Hourly Rate Band</div><div class="pay-range"><span>$25</span><span class="divider">&mdash;</span><span>$35 CAD</span></div></div></div><div class="content-conclusion"><div class="section page-centered">
<h3>StackAdapter''s Enjoy:</h3>
<ul>
<li data-stringify-indent="0" data-stringify-border="0">Highly competitive salary</li>
<li data-stringify-indent="0" data-stringify-border="0">Retirement/ 401K/ Pension Savings globally</li>
<li data-stringify-indent="0" data-stringify-border="0">Competitive Paid time off packages including birthday''s off!</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to a comprehensive mental health care program</li>
<li data-stringify-indent="0" data-stringify-border="0">Health benefits from day one of employment</li>
<li data-stringify-indent="0" data-stringify-border="0">Work from home reimbursements</li>
<li data-stringify-indent="0" data-stringify-border="0">Optional global WeWork membership for those who want a change from their home office and hubs in London and Toronto</li>
<li data-stringify-indent="0" data-stringify-border="0">Robust training and onboarding program</li>
<li data-stringify-indent="0" data-stringify-border="0">Coverage and support of personal development initiatives (conferences, courses, books etc)</li>
<li data-stringify-indent="0" data-stringify-border="0">Access to StackAdapt programmatic courses and certifications to support continuous learning</li>
<li data-stringify-indent="0" data-stringify-border="0">An awesome parental leave program</li>
<li data-stringify-indent="0" data-stringify-border="0">A friendly, welcoming, and supportive culture</li>
<li data-stringify-indent="0" data-stringify-border="0">Our social and team events!</li>
</ul>
<p><em>Please note: Benefits and perks may vary depending on your country of employment and the nature of your engagement. In locations where StackAdapt does not have a legal entity, employment and benefits are administered in accordance with local regulations and partner policies.</em></p>
</div>
<div class="section page-centered" data-qa="closing-description">
<div><em>StackAdapt is a diverse and inclusive team of collaborative, hardworking individuals trying to make a dent in the universe. No matter who you are, where you are from, who you love, follow in faith, disability, superpower status, ethnicity, or the gender you identify with (if you’re comfortable, let us know your pronouns), you are welcome at StackAdapt. </em></div>
<div>&nbsp;</div>
<div><em>StackAdapt is committed to providing an inclusive and accessible recruitment process. Accommodations are available upon request for candidates taking part in all aspects of the selection process. If you require an accommodation, please let us know.</em></div>
<div>&nbsp;</div>
<div><em data-stringify-type="italic">We use artificial intelligence (AI) to streamline the resume reviews of candidates and assess their fit based on the criteria outlined in the job posting. We do not use AI to make any final hiring or interview decisions.</em></div>
<div>&nbsp;</div>
<div><strong>About StackAdapt</strong></div>
<div>&nbsp;</div>
<div>We''ve been recognized for our diverse and supportive workplace, high performing campaigns, award-winning customer service, and innovation. We''ve been awarded:</div>
<div>&nbsp;</div>
<div><a href="https://www.stackadapt.com/resources/blog/g2-2026-best-software-awards" target="_blank">G2 Top Software for 2026</a><br><a href="https://www.greatplacetowork.ca/en/bestworkplaces/best-workplaces-for-young-talent/2026" target="_blank">2026 Best Workplaces™ for Young Talent</a> and <a href="https://www.stackadapt.com/resources/blog/great-place-to-work-best-workplaces-canada-2026" target="_blank">in Canada</a> by Great Place to Work®<br><a href="https://www.stackadapt.com/resources/blog/best-cross-channel-advertising-platform" target="_blank">#1 DSP on G2 and leader in a number of categories including Cross-Channel Advertising</a></div>
<div><a href="https://www.stackadapt.com/resources/blog/adweek-tech-stack-awards-2026">2026 Winner in the (CTV/OTT) Product/Platform category for the 2026 ADWEEK Tech Stack Awards</a></div>
<div>&nbsp;</div>
<div>To learn more about our privacy practices, please see our <a href="https://www.stackadapt.com/legal-document-centre/website-and-platform-user-privacy-policy">Privacy Policy</a>.</div>
<div>&nbsp;</div>
<div><span style="color: rgb(243, 243, 244);">#LI-REMOTE</span></div>
</div></div>', '["Experience with Machine Learning", "Experience with AI"]', '["Machine Learning", "AI"]', NULL, '[0.020888,0.020888,0,-0.041776,0,0,0,-0.020888,-0.020888,0,0,0.041776,0,0.062663,0.062663,0,0,0.020888,-0.020888,-0.020888,0,0,0,0.062663,-0.146215,0,0,-0.020888,0,0,0.020888,0,0.020888,0,-0.020888,0,0.020888,0,0,0.062663,0.041776,0,-0.083551,-0.062663,0.020888,0,0,0,0,-0.020888,0,-0.020888,0,-0.083551,-0.020888,0,0,-0.250654,-0.020888,0,0,0,0,0,0.041776,0,0,0,0,0.062663,-0.020888,0,0.104439,0,0,0,0,-0.020888,0,-0.062663,0,0,0,-0.062663,0,0.020888,0,0.020888,0,-0.041776,0,-0.062663,0,-0.041776,-0.041776,0,0,0.020888,0,0,0,0,0,-0.125327,0,0,0,0,0,0,0.250654,0,0,0,-0.020888,0,0,0,0,-0.020888,-0.041776,0.020888,-0.062663,0.020888,0,0.041776,0,0,0,0,0.020888,0.020888,0,0,0,0,-0.062663,-0.020888,-0.125327,0,-0.020888,0,-0.020888,-0.062663,0,0.062663,0,0,-0.020888,0,-0.020888,0,-0.020888,0,0,0,-0.062663,0.020888,0,0.020888,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020888,0.041776,0,0.020888,-0.020888,0,-0.041776,-0.020888,0,0,0,0,0.020888,-0.020888,0,0,0,0.020888,0,0.062663,0,0,0,-0.020888,0,0,0,0,0,0,0,0,0,0,0.18799,0,0,0,0,-0.020888,0.020888,0.041776,0,0,0,0,0,0,0,0,0,0,0,0,0.041776,0.020888,0.020888,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062663,0,0.020888,0.020888,0.041776,0,0,0,-0.062663,0,0,0,0,0.083551,-0.020888,0.041776,-0.062663,0.062663,0,0,0.041776,0,0,0,0,0,0,0.125327,0,0,0,0,0,0.020888,0,0,0,0,0,0,-0.020888,0,0,0,0,0,0.020888,0,0,0,-0.062663,0.104439,0,0.041776,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.020888,0,0.020888,0.020888,0,0,0.020888,0.041776,-0.020888,0,0.083551,-0.062663,0.146215,0,0.020888,0,0,0,0,0,0,-0.020888,0.020888,-0.020888,0,0,0,0.062663,0,0,0,0.062663,0,0.062663,0,0.125327,0.020888,0.104439,0,0,-0.062663,-0.020888,0,0,0,0,0,0,0,0.083551,-0.020888,-0.020888,0,0,-0.020888,0,0,0.020888,0,0,0.020888,0.104439,0.020888,-0.125327,-0.020888,-0.041776,0,0,0,0,0,0.041776,0.062663,0.020888,0,-0.020888,-0.020888,-0.020888,0,0,0,0.020888,0,0,0.062663,0,0,-0.020888,0,0,-0.041776,0,0.020888,0,0,0.041776,0,0.104439,0,0,0,0.041776,0.062663,0.041776,0,0,-0.020888,0,0.020888,0.020888,0,0,0,0,0,0.083551,0,0.020888,0,-0.020888,0,0,0,0.020888,0.041776,0,0,0.062663,0.020888,0,0,-0.041776,0.020888,0,0,0,0,0,0,0,0.020888,0.062663,0,0,0,0,0,0,-0.020888,0,0,0,-0.020888,-0.062663,-0.020888,0.041776,0,0,0,0,0,-0.041776,0,0,0.020888,-0.020888,0,0,0.041776,0,-0.020888,0,0,0,0,0.020888,0,-0.18799,-0.104439,0,0,-0.020888,0,-0.062663,0,0,0,0.062663,0.020888,0,0,0,0,0,-0.020888,0.020888,-0.062663,0.062663,0,0,0.167102,0,0,0,-0.020888,0,0.020888,0,0.041776,0,0,0.062663,0,0,0,-0.062663,0,0,0,0,0,0,0,0,0,0.020888,0,0,0.020888,0,0,0.020888,0,0,0.020888,0,0,0.020888,0,0,0.020888,0,0,0.062663,0,0,-0.020888,0,0,-0.041776,0,0,0.041776,-0.020888,0,0,-0.041776,0,0.020888,0,-0.062663,0,0,0.041776,0,0,0.020888,0.020888,0,0.062663,0,0,0,0,0,-0.020888,0,-0.18799,0,0,0,0,0,0,0.083551,-0.020888,0.083551,0.020888,0,0,0,0,0,-0.062663,0,0,0,0,0,0,0,0.062663,0,0,0,0,0,0,0.020888,0,0.020888,0,0,0,0,0,0,-0.083551,0,0,0,0,0,0,0.062663,0,0,0,0,0,-0.062663,0,0,0,0,-0.020888,0,0,0,0,0,-0.041776,0,0,0,-0.125327,0.020888,0.041776,0,0,0.020888,-0.020888,0,0.020888,0,-0.041776,0,0,0,0.020888,0,0.062663,0,0.020888,0,0,0.041776,0,0.062663,0,0,-0.020888,0,0.104439,0,0,0,-0.020888,0.041776,0,-0.020888,0.062663,0.020888,0,0,0,0,0,-0.146215,-0.18799,0,0,0,0.083551,0.041776,0.041776,0,0,0,0,-0.041776,0,0,0,0,0,0,0,0,0,0,-0.146215,-0.020888,0,0.020888,0.020888,0.020888,-0.020888,0.062663,0.041776,-0.083551,-0.020888,0,0,0,0,0,0,0,0,0.041776,0.020888,-0.062663,0.020888,-0.020888,0.020888,0,0,0,0,0,0.167102,0,0.104439,0,0,0,0,0,0.062663,0,0,0]', '2026-10-06 17:57:58.089735+00');


--
-- Data for Name: inbound_email_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: resume_bullets; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.resume_bullets VALUES ('7adbdd2c-820d-4ff9-9864-806cc6e1f4ec', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.', '[0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,-0.068519,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0.068519,0,0,-0.068519,0,0.137038,0,0,-0.068519,0,0,0,-0.068519,0,0,0,0,0,0.137038,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,-0.068519,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0.274075,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,-0.205557,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0.205557,0,0,0,0,0,0,0,0.068519,0,0,-0.205557,0,0.068519,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,-0.068519,0,0,0.068519,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0.137038,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0.068519,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,-0.137038,0.205557,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.205557,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,-0.137038,0,0,0.205557,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,-0.205557,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.137038,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,-0.137038,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,-0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,-0.205557,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.068519,0,0,0,0,0,0,0,0,0,0,0,-0.137038,0.137038,0,0,0,0,0,0,0,0,0,0,0,0,0,0.205557,0,0,0.068519,0,-0.205557,0,0,0,0,0,0,0,-0.068519,0,0,0,0.205557,0,0,-0.068519,0,0,0,0,0,0,-0.205557,0,0,0,0,0,-0.068519,-0.068519,0,0,0,0,0.068519,0,0,0,0,0,0,0,0,0]', '2026-10-06 08:04:05.848652+00');
INSERT INTO public.resume_bullets VALUES ('00ab2983-45de-4d35-84b2-e76e6033d784', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 38%.', '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.13901,0,0,0,0,0,0,-0.13901,0,0.069505,-0.069505,0,0,-0.208514,0,0,0.208514,0,0,0,0,0,0,0,0,-0.13901,0,0,-0.069505,0,0,0,0,0,0,-0.069505,-0.069505,0,0,0,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208514,0,0,0,0,0,0,0,0,-0.208514,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.208514,0,0,0,0.208514,0,0,0,0,0,0,-0.208514,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0,0,-0.069505,-0.069505,0,0.069505,0,-0.069505,0,0,0,0.208514,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,-0.069505,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0,-0.069505,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,-0.069505,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,-0.069505,0,0.069505,0,0,0,0,0,0,0,0.069505,-0.069505,0,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,-0.069505,0.069505,0,0,0,0.069505,0,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,0.278019,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0.208514,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,-0.208514,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208514,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.13901,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0,-0.069505,0,0,0,-0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0.069505,0.13901,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069505,-0.208514,0,0,0,-0.13901,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0.069505,0,0,0,0,0,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,-0.069505,0,0,0,0,0,0,0,0.069505,0,0,0,0,0,0,0,0,0]', '2026-10-06 08:04:05.848652+00');
INSERT INTO public.resume_bullets VALUES ('b99845a0-cb86-4188-b689-8ad8eafdb03e', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 100K+ document embeddings in <60ms.', '[0.063119,0,0,0,0,0,0,0.063119,-0.063119,0,0,0,0,0,0.063119,-0.063119,0,0,0,0,0,0,0,0.189358,-0.441836,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.189358,0,0,0,0,0,-0.189358,0,0,0,0,-0.063119,-0.126239,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0.063119,0,0,0,0,0.063119,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.189358,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,-0.063119,0,0,0,0.063119,0,0.063119,0,0,0,0,0.126239,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.189358,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.126239,0,0,0,0,0,0,0,0,0,0,-0.189358,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.126239,0,0,0.063119,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0.063119,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0.189358,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.189358,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,-0.189358,0.063119,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.189358,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.126239,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0.063119,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,-0.063119,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,-0.063119,0.063119,-0.063119,0,0,0,-0.063119,0,0,0,0,0.126239,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.189358,0,0,0,0,0,0,-0.063119,-0.189358,0,0,0,0.063119,0.063119,0,0,-0.063119,0,0,0,0,0,0.063119,0.189358,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063119,0,0,0,0,0,0,0,0,0,0,0,0,-0.126239,0,0,0,0,0,-0.063119,0,0,0,0,0,0,0,0,0]', '2026-10-06 08:04:05.848652+00');
INSERT INTO public.resume_bullets VALUES ('c47f5b70-ef15-4c35-a88f-82a6477eac20', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference.', '[0,0,0,0,-0.066082,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.198246,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.198246,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,-0.066082,0.198246,0,0,0.198246,0,0,0,-0.066082,0,0.066082,0.198246,0,0.198246,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,-0.066082,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.198246,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0.132164,-0.066082,-0.066082,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0.132164,0,0.066082,0,0,-0.198246,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0.198246,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0.066082,0.198246,0,0,0,-0.066082,-0.066082,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,-0.066082,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.264327,0,0,0.066082,0,0,0,0,0.198246,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,-0.198246,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.132164,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0.198246,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0.066082,0.066082,0,0,-0.066082,0,0,0,0.066082,0,0,0,0,0,0,-0.066082,0,0,0,-0.066082,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0.198246,0,0,0,0,0,0,0,0,-0.198246,0,0,0,0.066082,0,0.066082,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,-0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0,0,0,0,0,0,0,0,0,0,0,0.066082,0,0,0.066082,0,0,0,0,0,0]', '2026-10-06 08:04:05.848652+00');
INSERT INTO public.resume_bullets VALUES ('6c4a2515-8f11-443e-91ce-7534f03ae4ea', '00000000-0000-0000-0000-000000000001', 'RESEARCH', 'Developed multi-threaded C/C++ memory allocator benchmarking performance improvements against jemalloc on Linux kernels.', '[0,0,0,0,0,0.211604,-0.070535,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.141069,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,-0.211604,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,-0.211604,0.070535,0,0,0,0.070535,0,0,0,0,0.070535,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.211604,0,0.070535,0,0,0.211604,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0.141069,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0.211604,0,0,0,0,0,0,0,0,0,-0.141069,0,0,0,0,0,0,0,0,0.141069,0,0,-0.141069,0,0,0.070535,0,0,-0.070535,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0.070535,0,-0.070535,0,0,0,0.070535,0,0,0,0,0,0.070535,0,0,0,0,0.070535,0,0.070535,0,0,0,0,0.070535,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,0,0,0,0,0,0,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0.070535,0,0,-0.070535,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,0,0.211604,0,0.211604,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.211604,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0.070535,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0.141069,0,0,0,0,0.070535,0,-0.070535,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 08:04:05.848652+00');
INSERT INTO public.resume_bullets VALUES ('8a4a5c3d-712d-4356-80fe-85d49f2719cb', '00000000-0000-0000-0000-000000000001', 'SKILLS', 'AI & Machine Learning:AI Agent Architectures, LLM Integration (Google Gemini API), Prompt Engineering, Tool Calling &', '[0.063758,0.063758,0,0,0,0,0,0,-0.063758,0,-0.063758,-0.063758,0,0,0,0,0,0.063758,0,0,0,0,0,0,-0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.191273,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0.191273,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,-0.191273,0,0,0,0,0,0,0,0,0.255031,0,0,0,0,0,0,0,0,0,0,-0.382546,0,0.063758,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0.127515,0,-0.191273,0,0,0,0,0,-0.063758,0,0,0,0,0.063758,0,0,0,0.063758,0,0,0,0,0,0,0,0,-0.063758,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0.191273,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,-0.063758,0,0,-0.063758,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,-0.063758,0,0,0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0.063758,0,-0.063758,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0.063758,0,0,0.063758,0,0,0.063758,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,-0.063758,-0.063758,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0.063758,0,0,0,0,0.191273,0,0,0,0,0,0.127515,0,0,0,0,0,0.063758,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0,-0.063758,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,-0.063758,0,0.191273,0,0,0.063758,0,0.063758,0,0,0,0,-0.063758,-0.063758,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,-0.191273,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.191273,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.846662+00');
INSERT INTO public.resume_bullets VALUES ('870d48b2-f9f9-42e6-ab1c-607a8b1fd242', '00000000-0000-0000-0000-000000000001', 'SKILLS', 'Orchestration, Heuristic Search & Planning, Combinatorial Optimization, Model Evaluation', '[0.080064,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0.080064,0,0,0,0.160128,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0.240192,0,-0.080064,0,0,0,-0.240192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0.240192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0.240192,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.240192,0,0.080064,0,0,0,0,0,0,0,0,-0.240192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,-0.080064,0,0,-0.080064,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.240192,0,0,0,-0.080064,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0.080064,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0.240192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,-0.240192,0,0,0,0,0,0,0,0,0,0,-0.080064,0,0,0,0,0,0.160128,0,0,0.080064,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.240192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,-0.080064,0,0.080064,0,0,0,0,0,-0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.240192,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0.160128,0,0,0,0,0,0,0,0,0,0,0,0.080064,0,0,0,0,0,0,0,0,0,0,0,0.080064,0.080064,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.854158+00');
INSERT INTO public.resume_bullets VALUES ('9ab1e7b4-0330-4706-a210-47d34902de7f', '00000000-0000-0000-0000-000000000001', 'SKILLS', 'Languages:Python, SQL, JavaScript, TypeScript, C++, C, Bash, HTML5, CSS3', '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,-0.086066,0,0,-0.172133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.258199,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.172133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.258199,0.086066,0,0,0,0,0.086066,0,0,0,0,-0.086066,0,0,0.086066,0,0,0,0,0,0,-0.258199,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.258199,0,0,0,-0.086066,0,-0.172133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0.258199,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.258199,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,-0.258199,0,0.172133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.258199,0,0,0,0,0,0,-0.086066,0,0,0,0,-0.172133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0.086066,0,0,0,0,0,0,0,0,0,0,-0.086066,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.258199,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.859217+00');
INSERT INTO public.resume_bullets VALUES ('e2529078-8654-4252-94b1-b8fe7c8a828a', '00000000-0000-0000-0000-000000000001', 'SKILLS', 'F rameworks & Libraries:FastAPI, Pydantic, SQLite, PostgreSQL, React, Vite, Node.js, ROS 2, Tailwind CSS, Uvicorn', '[0,0,0,0,0,0.069338,0,-0.138675,0,0,0,0,0,0,0,0,0,-0.208013,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.138675,0,0,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0.208013,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0.069338,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,-0.069338,0,0,0,-0.069338,0,0,0,0,0,0,0,0,-0.208013,0,0,0,0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.208013,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,-0.138675,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,-0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,-0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,-0.069338,0,0,0.069338,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,-0.069338,0,0,0,-0.069338,0,-0.069338,0,0,-0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,-0.069338,-0.208013,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.138675,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.27735,0,0,0,0,-0.069338,0.208013,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208013,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0.138675,0,0,0,0.208013,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,-0.208013,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,-0.069338,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0.069338,0,0,0.069338,0,0,0]', '2026-10-06 17:44:43.861277+00');
INSERT INTO public.resume_bullets VALUES ('1c36be6e-43c7-4b87-9a1c-07d8b6940ad4', '00000000-0000-0000-0000-000000000001', 'SKILLS', 'Developer T ools & Practices:Git, GitHub, GitLab, Docker, VS Code Dev Containers, Linux/Unix, RESTful APIs, Unit Testing,', '[0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,-0.191273,0,0.063758,0,-0.191273,0,-0.127515,0,-0.063758,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0.063758,-0.191273,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0.127515,0,0,0,0,-0.063758,0,0,0,0,0.063758,0,0,0.127515,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,-0.063758,0.127515,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0.191273,0,0,0,0.063758,0,0,0,0,0,0,-0.191273,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0,-0.063758,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0.063758,0,0,0,0,0,0,0.063758,0,0,0,-0.191273,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,-0.063758,0.063758,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0.191273,0,0,-0.063758,0,0,0,0,0,0.191273,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.255031,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0.191273,0,-0.063758,0,0,-0.063758,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0.063758,0,0,0,0,0,0,0,0.063758,0,0,0,0.191273,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,-0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0.063758,0,0,0,0.063758,0,0,0,0,-0.191273,0,-0.063758,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063758,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0,0,-0.191273,0,0,0,0,0,0.063758,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.191273,0,0,0.063758,0,0,0,0,0,0]', '2026-10-06 17:44:43.862923+00');
INSERT INTO public.resume_bullets VALUES ('c56e1e53-16d6-488a-8f4b-72f27a9bc1c0', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Completing structured software onboarding curriculum focusing on modular autonomy stacks, ROS 2, Python, and C++', '[0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,-0.070535,0,0,0,-0.070535,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,-0.211604,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,-0.211604,0,0.211604,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,-0.141069,0,0,0,0,0.211604,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,-0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.141069,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0.070535,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0,-0.070535,-0.070535,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.211604,0,0,0.070535,0,0,0,0,0,-0.070535,-0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0.211604,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,-0.070535,0,0.141069,0,0,-0.070535,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070535,0,0,-0.070535,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,0,0,0,0,0,0,0,0,0,0.070535,0,0,-0.070535,0.070535,0,0,0,0,0,0.070535,0,0,0,0,0,0.070535,0,0,0,0,-0.211604,0,0,-0.070535,0,0,0,0,0,0,0,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070535,-0.211604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.864198+00');
INSERT INTO public.resume_bullets VALUES ('92c47151-cf91-401d-bf71-533b9f8684b7', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Set up and maintain containerized development environments via Docker and VS Code Dev Containers to ensure cross-platform', '[0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.176777,0,0,0,0,0,0,0,-0.058926,0,0,-0.176777,0,0,0,0,0,0,0,-0.117851,0,0,0,0,0,-0.176777,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0.176777,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0.117851,0,-0.176777,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.176777,0.176777,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0.117851,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0.058926,0,0,-0.058926,0,0,0,-0.176777,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.176777,0,0,0,0,0,0,0,0,-0.058926,0,0,0.117851,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0.176777,0,-0.176777,0,-0.117851,0,0,0,0,-0.058926,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.176777,0,0,0,0,0,0,-0.058926,0,0,0,0,-0.176777,0,0,0,0,0,0,0,0.058926,0.176777,0,0,0,0,0,0.176777,0,0,0,0,0.058926,-0.176777,0,0,0,-0.058926,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.117851,0,0,0,0,0,0,0,0,0,0.058926,0,0,-0.058926,0.117851,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0,-0.058926,0,0,0,0,0,0.058926,0,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.353553,0,0,0,0.117851,0,0.058926,0,0,0,0,0,0,0,0,0,0.058926,0,0,0,0,0,0.058926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.235702,0,0,0,-0.235702,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.868482+00');
INSERT INTO public.resume_bullets VALUES ('ad892151-111f-455e-81a4-f66b33077431', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Collaborate using GitLab version control, Git LFS, feature branching workflows, and team code reviews.', '[0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0.072357,0.217072,0,0,0,0,0,-0.144715,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,-0.217072,0,0.217072,0,0,0,0,0,-0.072357,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.217072,0,0,0,0,0,0,0,0,0,0,0.072357,-0.072357,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,-0.072357,0,-0.217072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.217072,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.144715,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0.217072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.217072,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0.217072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0.072357,0,-0.217072,0,0,0,0,0,0,0,0,-0.217072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.144715,0,0,0.217072,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0.072357,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,-0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,-0.072357,0,0,0,0,-0.217072,0,0,0,0,0,0,0,0,0,-0.072357,-0.217072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,0,0,0,0,0,0.072357,0,0,0,0,0,0,-0.072357,0,0,0,0.072357,-0.072357,0,0.144715,0,0,0,0,0,0]', '2026-10-06 17:44:43.870062+00');
INSERT INTO public.resume_bullets VALUES ('6679d3d1-b8c1-4cf9-98ce-8b56a99fe5c8', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Manage team operating budget and project expenditures across engineering sub-teams, tracking hardware, microcontrollers, and', '[0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0.063628,0.063628,0,0,0,0,0,-0.190885,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,-0.254514,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0.127257,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0.127257,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.190885,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0.190885,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.190885,0,0,0,0,0,0.127257,0,0,-0.063628,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0.190885,0,0,0,0,0,0,0,0,0,0,0,0,0,0.127257,0,0,0,-0.254514,0,0,0,0,0,0,0,-0.063628,0,0.063628,0,0,0,0,0,0.063628,0,0,-0.127257,0,0,0,0,0,0.190885,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0.190885,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0.190885,0,0.127257,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0.063628,0,0,0,0.063628,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0.063628,0,0,-0.063628,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0.190885,0,-0.063628,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0.063628,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,-0.063628,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,-0.063628,0,0,0,0,-0.063628,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0,0,0,0,0,-0.127257,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.190885,0,0,0,0,0,0,0.063628,-0.063628,0,0,0,0.063628,0,0,-0.063628,0,0,0,-0.063628,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.381771,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0.063628,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.063628,0,0,0,0]', '2026-10-06 17:44:43.871841+00');
INSERT INTO public.resume_bullets VALUES ('0309c046-0d9b-4dcc-9b8e-74a73d2f5211', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Streamlined financial tracking workflows by establishing standardized digital templates and review procedures, eliminating manual', '[0,0.065938,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.197814,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0,0,0.065938,0,0,0,0,-0.065938,0,0,0,0,0.065938,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,-0.197814,0,0.131876,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0.065938,-0.065938,0,0,-0.065938,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.197814,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.197814,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0.065938,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0.065938,0,0.065938,0,0.065938,0,-0.065938,0,0,0,-0.065938,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0.197814,0,0,0,0,0,0.065938,-0.065938,0,0,0,0,-0.065938,0,0,0,0,0,0.065938,0,0,0,0.065938,0,0,0,0,-0.065938,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.131876,0,-0.065938,0,0,0,0,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0.131876,0,0,0,0,0,0.065938,0,0,0,0,0,0,0.065938,0,0.065938,0,-0.065938,0,-0.197814,0,0,0,0,-0.065938,0,0,-0.065938,0,-0.065938,0,0,0.065938,0,0,0,0,0.065938,-0.065938,0,0,0,0,0,0,0,0,0,-0.065938,0,0.065938,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,-0.197814,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0.065938,0,0,0,0,0,0.197814,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065938,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0.065938,-0.131876,0,0,0,0,0,-0.065938,0,0,-0.263752,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.197814,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,-0.065938,0,0,0,0,0,0,0,0,0,0,0,0,-0.131876,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.131876,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0.065938,0,0,0.263752,0,0,-0.131876,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.197814,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065938,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.197814,0,0,0,-0.065938,0,0,0,0.065938,-0.065938,0,0.065938,0,0,0,0,0,0]', '2026-10-06 17:44:43.872929+00');
INSERT INTO public.resume_bullets VALUES ('dfc636a0-81d1-4796-b721-0cc6de7c3f75', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Generate financial reports, expense forecasts, and audit documentation to maintain transparent fiscal governance for university', '[0,0.067116,0,0,0,0,0,-0.134231,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.134231,0,0,0,0,0,0,0,0.067116,0,0,0,0,-0.067116,0.067116,-0.067116,0,-0.201347,-0.067116,0,0,0,0,0.067116,0,0,0,0,0,0,-0.134231,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.201347,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0.067116,0,0,-0.067116,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0.134231,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.134231,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0.201347,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,-0.201347,0,0,0,0,-0.201347,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,-0.134231,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0.067116,0.134231,0,0,0,0,0,0,0,-0.201347,0,0,0,0,0,0,0,0.067116,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,-0.067116,0,0,0,0,-0.134231,0,0,-0.134231,-0.067116,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.201347,0,0,0,0,0,0,0.134231,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,-0.067116,-0.201347,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,-0.201347,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0.201347,0.067116,0,0,0,0,0,0.067116,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,-0.067116,0,0,-0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,-0.201347,0.067116,0,0,0.134231,0,0,0,0,0,0,0.134231,0,-0.067116,0,0,0,0,0,0,0,0,0,0.067116,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067116,0,0.134231,0,0,0,-0.134231,0,0,0,0,0,0,0,0,-0.067116,0.201347,0.067116,0,0,0,0,-0.067116,0,0,0,0]', '2026-10-06 17:44:43.874438+00');
INSERT INTO public.resume_bullets VALUES ('2e383e9e-ddf0-458b-a9c3-5ae03ab72fe8', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Delivered interactive technical instruction in Python, JavaScript, and foundational algorithmic logic to 50+ students aged 5-14', '[0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0.065372,0.196116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.130744,-0.065372,0,0,-0.196116,0,0,0,0,0.196116,0,0.130744,0,0,0,0,0,-0.065372,-0.261488,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,-0.130744,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.196116,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.196116,0,0,0,0,0,0,0.065372,0,0,-0.196116,0,0,0,-0.065372,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0.196116,0,-0.065372,0,0,0,0,-0.130744,0,0,0,0,0,0,0,0,0,0,0,0,0,0.196116,0.065372,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,-0.065372,-0.196116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0.065372,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0.065372,0,0,0,0.065372,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,-0.065372,0,0,-0.065372,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0.065372,0,0,0,0.065372,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0.065372,0,0,0.130744,0,0,0,0,0,-0.065372,0,0.065372,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.196116,0,0,0,0,-0.065372,0.065372,0,0,0.196116,0,0,-0.065372,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,-0.196116,0,0,0,0,0,0,0,0.065372,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,-0.065372,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.130744,-0.196116,0,0,0,0.065372,0,0,0,0,0,0,0,-0.065372,0,0,0.196116,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.196116,0,0,-0.065372,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.875288+00');
INSERT INTO public.resume_bullets VALUES ('b20095b7-3bf8-4483-98cd-af1354f7f42e', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Guided students in diagnosing algorithmic misconceptions, debugging logic errors, and mastering fundamental programming', '[0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0.069338,0,0,0.069338,0,-0.27735,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.138675,0,-0.069338,0,0,-0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,-0.069338,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,-0.069338,0,0,0,0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.208013,0.069338,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.138675,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0.069338,0,0,0,0,0,0.069338,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0.208013,0,0,-0.208013,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0.138675,0,0,0,0,0,0,0,-0.069338,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0.069338,0,0,0,0,0.069338,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.208013,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0.208013,0,0,0,0,-0.069338,0,0,0,0.208013,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,0,0,0,0,0,0,-0.069338,0,0,0,0,0.069338,0,0,0,0,0,0.069338,0,0,-0.069338,0,0,0,0,0,-0.069338,0,0,0,-0.069338,0,-0.138675,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.069338,-0.208013,0,0,0,0.138675,0,-0.069338,0,0,0,-0.069338,0,0,0,0,0.208013,0,0,-0.069338,0,0,0,0,0,0,0,0,0.069338,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.069338,0,0,0,-0.208013,0,0,0,0,0,0,0,0,0.069338,0,0,0,0]', '2026-10-06 17:44:43.877052+00');
INSERT INTO public.resume_bullets VALUES ('3af3fd1c-de72-413b-9d2c-52a567ea50be', '00000000-0000-0000-0000-000000000001', 'EXPERIENCE', 'Communicated student progress and technical development milestones to parents, breaking down complex software concepts into', '[0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.19696,0,0,0,0.065653,0,-0.065653,0,0,0,0,0.19696,0,0,0,0,0.065653,0.19696,0,0,0,0,-0.065653,0,0,-0.19696,0,-0.065653,0,0,0,-0.065653,0,0,0,0,0,0,0,-0.19696,0,0,0,0,0,0.065653,0,0,0,0,0,0,-0.131306,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,-0.065653,0,0,0,0,0,0,0,0,0,0,-0.065653,0,0,0,0,-0.065653,0,0,0,0,0.19696,0,0,0,0,0,0,0,0.065653,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0.065653,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0.19696,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065653,0.065653,0,0,0,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,-0.19696,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.131306,0,0,0,0,0,0,0,0,-0.19696,0.131306,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,-0.131306,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,-0.065653,0.065653,-0.131306,0,0,0,0,0,0,0,0,0,0,0,-0.065653,0,0,0.065653,0,0,0,0,0.19696,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0.131306,0,0,0,0.19696,0,-0.065653,0,0,0,0,0,-0.065653,0,0,0,0,-0.065653,0,0,0,0.065653,0,0,0,0,0,0,-0.065653,0,0,0,0,0,0,0,0,0,-0.065653,0,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.19696,0,0,0,0,0,0,0,0,0,0.065653,0,0,0.131306,0,0,0,0,0,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.131306,0,0,0,0,0,0,0,0,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065653,0,-0.19696,0,0.065653,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0.065653,0,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.19696,0,0,0,0,0,0,0,0,-0.19696,0.065653,0,0,0.19696,0,0,0,0,0,0,0,-0.065653,0,0,0,0,0,0,-0.065653,0,0,0,-0.065653,-0.065653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065653,0,0.065653,0,0,0.065653,0,0,0,0,0,0]', '2026-10-06 17:44:43.878066+00');
INSERT INTO public.resume_bullets VALUES ('31e1c488-342a-48ee-a465-ecd6e1c65a53', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Engineered an AI Chrome Extension (MV3) that scrapes and processes customer reviews in real time to generate automated product', '[0,0,0,0,0,0,0,0,-0.061663,0,0,0.123325,0,0,0,-0.061663,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.369976,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0.061663,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.184988,0,0,0,0,0,0,0,0.184988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.184988,0.184988,0,0,0,0,0,0,0,0.184988,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,-0.184988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0.061663,0,-0.061663,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,-0.061663,0.184988,0,0.061663,0,0,0,0,-0.061663,0,0,0,0,0,-0.061663,0,0,0,0,0,0.184988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.184988,0,0,0,0,0,0,0,0.184988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,-0.061663,0,0.061663,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0.061663,0.061663,0,0,0,0,0,0,-0.123325,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,-0.061663,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0.061663,0,0,0,0,0,-0.061663,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,-0.184988,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,-0.123325,0,0,0,0,0,0,0,0,0,0.061663,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061663,-0.061663,0,0,0,0,0.184988,0,0,0,0,0,-0.061663,-0.184988,0,0,0,0,0.123325,0,0,0,0,0,0.123325,0,0,0.061663,0.184988,0,0,0,0,0,0,0,0,0,0,0,0.061663,0,0.184988,0,-0.123325,0,0,0,0,0,0,0,0.184988,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.123325,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.879354+00');
INSERT INTO public.resume_bullets VALUES ('e92fab80-5d5f-4ab0-8bdb-0fe1dc4183b0', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Built a FastAPI backend integrating Google Gemini via structured prompt engineering and schema validation, calculating a 0-10', '[0.06455,0.06455,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,-0.193649,-0.193649,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0.193649,0,0,0.193649,0,0,0.06455,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.193649,0,0,0.193649,0,0,0,0,0,0,0,0,0,0,0,0.193649,-0.193649,0,0,0,0,0,0,-0.387298,0.129099,0,0,0.129099,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0.06455,0,0,0,0,-0.193649,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0.06455,0,0,-0.06455,0,-0.193649,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0.06455,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0.129099,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0.06455,0,0,0,0,0,0,0,0.193649,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,-0.06455,0,0,0,0,0.06455,0,0,0,0,0,0.06455,0,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.129099,-0.06455,0,0,0,0,0,0,0,0,0,0,-0.193649,0,0.06455,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0.193649,0,0,-0.06455,0,-0.06455,0,0,0,0,0,0,-0.06455,-0.193649,0,0,0,0,0.06455,0,0,0,0,0,0,0,0,0,0,0,0,0.06455,0.06455,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0,0,0,0,-0.06455,0,0,0,0,0,0,0,0.193649,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.880288+00');
INSERT INTO public.resume_bullets VALUES ('e488eaf3-8b9b-486f-bfdc-1b58cb171e9f', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Designed an interactive natural language Q&A engine, leveraging SQLite caching to reduce redundant LLM calls and achieve', '[0,0.064957,0,0,0,0.064957,0,0,-0.064957,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,-0.129914,0,0.064957,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,-0.194871,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,-0.194871,0,0,0,0.194871,0,0,0.064957,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,-0.194871,0,0,0,0,0.194871,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,-0.194871,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0.194871,0,0,0.194871,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0.194871,0,0,0,0,0,0,0,0,0,0,0,0,0.194871,0,0,0,-0.194871,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0.064957,0,0,0,0,0,0,0,0.064957,0,0,0,0,0.064957,-0.064957,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,-0.129914,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.194871,0,-0.129914,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.194871,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,-0.064957,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0.064957,0,0,0.064957,0,0,0.064957,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.129914,0,0,0,0.064957,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0.194871,0,0,0.064957,0,0,-0.064957,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.129914,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0.129914,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,0.129914,0,0,0,0,0.129914,0,0,0,0,0,0,-0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0.064957,0,0,-0.194871,0,0,0,-0.194871,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0.194871,0,0.064957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.881522+00');
INSERT INTO public.resume_bullets VALUES ('ffcf9b27-7ce1-4d77-bd1d-9859836a2027', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Constructed resilient API endpoints with Pydantic data validation and exception handling, ensuring deterministic tool execution', '[0,0,0,0,0,0.065372,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.130744,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.196116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0.065372,0,0,0,0,0,0,0.196116,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.130744,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.196116,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,-0.196116,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,-0.130744,0,0.065372,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0.065372,0.065372,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0.065372,-0.065372,0,0,0,0,0,-0.065372,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0.065372,0,0,0,0,0.065372,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,-0.196116,0,0,0,0,0,0,-0.130744,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0.261488,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,-0.261488,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0.065372,0.130744,0.196116,0,0,0.065372,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,-0.130744,0,0,0,0,0,0,0,0,0,0,-0.196116,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0.065372,0,0,-0.065372,0,0,0,0,0,0,0,0,-0.130744,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,-0.065372,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0.065372,0,0,0,0,0,-0.196116,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.130744,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.196116,0,0,0,-0.196116,-0.196116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.065372,-0.196116,-0.196116,0,0,0,0.065372,0,0,0,0.065372,0,0,0,0,0,0,0,0.065372,0,0,0.065372,0,0,0,0,0,0,0,-0.065372,0,0.065372,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.065372,0]', '2026-10-06 17:44:43.882626+00');
INSERT INTO public.resume_bullets VALUES ('e229471d-e2be-4bda-bfbd-0598ea56a916', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Developed an algorithmic multi-store basket optimizer solving the grocery purchasing problem across 6 supermarket chains, parsing', '[0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0.062869,0,0,0,-0.188608,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0.062869,0,0,0,0,0,0.062869,0,0,0,0,0.062869,0,0,0,0.062869,0,0,0,-0.062869,0,0,0,0,0,0.062869,0,0.188608,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0.188608,0,0,0,0.062869,0,0,0.188608,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0.062869,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0.062869,0,0,0,0,0.062869,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,-0.125739,0,0,0,-0.062869,0,0,-0.188608,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0.062869,-0.062869,0,0,0,0,-0.062869,0.062869,-0.062869,0.188608,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0.188608,0.062869,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0.062869,0,0.062869,0,0,0,0,0,-0.062869,0,0,0,0,0,0.125739,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.125739,0,0,0,0,0.062869,0,0,0.062869,0,0,0,-0.062869,0.062869,-0.062869,0,-0.062869,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.188608,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,-0.188608,0,0,0,0,0,0,0,0,0,0.188608,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0.125739,0,0,0,0,0,0.062869,0,0,0,0,0.188608,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0.062869,0.188608,0,0,0,0,0,0,0,0,0,0,0,-0.188608,0,0,0,0,0,0,0,0,0,0,-0.062869,0,-0.188608,0,-0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0.188608,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,-0.062869,0,0,0,0,0,0,0,0,-0.251478,0,0.062869,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.251478,0,0,0,0,0,0,0,0,0,0,0,0,0.062869,0,0,0,0,0,0,0,0.062869,0,0,0]', '2026-10-06 17:44:43.883969+00');
INSERT INTO public.resume_bullets VALUES ('558a1d6d-d4ca-428d-89a4-50245867e0fe', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Engineered a regex unit-price normalizer (per 100g, per 100ml) and a combinatorial branch solver evaluating 120+ weekly flyer deals', '[0,0,0,0,0,0,0,-0.059549,-0.059549,0,0,0,0,0,-0.178647,0,-0.178647,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.178647,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,-0.119098,0,0,0,0,-0.059549,0,0,-0.059549,0,0,0,0,0,0,0,-0.178647,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.238197,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0.119098,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,-0.119098,-0.059549,0,0,0,0,0,0.119098,0,0,0,0,0,0,0,0,0,0,0.178647,0.059549,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,-0.059549,0,0,-0.357295,0.059549,0,0,0.059549,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.178647,0.059549,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.178647,0.059549,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0.059549,-0.059549,0,-0.059549,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.178647,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,-0.059549,-0.059549,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,-0.059549,0,-0.119098,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0.059549,0,0.178647,0,0,0,-0.059549,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.178647,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.178647,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0.059549,0,0,0,0,0,0.059549,0,0,0,0,0,-0.059549,0,0.059549,0,0,0,-0.238197,-0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.178647,0,0,-0.178647,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0,0,0,0,0,0,0.059549,0,0,0,0,0,0,0.178647,0.059549,0.178647,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.884907+00');
INSERT INTO public.resume_bullets VALUES ('94ddfea4-4fb1-4622-8118-bd8aa425d1e7', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Integrated live Edmonton gas price feeds and a Haversine distance engine to compute round-trip travel economics, preventing', '[0.067884,0,0,0,0,0,0,-0.067884,-0.067884,0,0,-0.067884,0,-0.067884,0,0,0,0.067884,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0.203653,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,-0.271538,0,0,0,0,0,0,0,0,0,-0.067884,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0.203653,0,0,0,0,0,-0.203653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.203653,0,0,0,0,0,-0.067884,0,0,0,0.135769,0,-0.203653,0,0,-0.271538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0.203653,0,0,0,0,0,0,0,0,0,0.067884,-0.203653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.135769,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,-0.203653,0,0,0,0,0,0,0,0,0.203653,0,0.067884,0,0,0,0,0,0,0,0,0.135769,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0.067884,0,-0.067884,0,0,-0.203653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,-0.067884,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.203653,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0.067884,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0.067884,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,-0.067884,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,-0.067884,0.067884,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,-0.203653,0,0,0,-0.135769,0,0,0,0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067884,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.067884,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.886561+00');
INSERT INTO public.resume_bullets VALUES ('31af820d-ba17-4368-9168-31ad0ab3e5ec', '00000000-0000-0000-0000-000000000001', 'PROJECT', 'Containerized application architecture with Docker, establishing consistent deployment across local testing and production', '[0,0.071611,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,-0.071611,0,0,0,0,0,0,0,0,-0.143223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,-0.071611,0,0,-0.143223,0,-0.071611,0,-0.143223,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,0.071611,0,0,0,0,-0.071611,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.214834,0,0,0,0,0,0,0.071611,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,-0.071611,0,0,0,0,0,0,0,0,-0.071611,0.214834,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,-0.071611,0,0,0,0,0,-0.071611,0,0,0,0,0,0.071611,0,0,0,0,0,0,0,0.143223,0,0,-0.214834,0,0,0,0.143223,0,0,0,-0.071611,0,0,0,0.071611,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,-0.214834,0.071611,-0.071611,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,-0.214834,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.143223,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.214834,0,-0.143223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0.071611,0,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,-0.071611,0,0,0,-0.071611,-0.071611,0,0.214834,0,0,0.143223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,-0.214834,0,-0.071611,0,0,0,0,0,0,0,0,0.071611,-0.071611,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071611,0,0,0,0,0,0,0,0,0,0,-0.143223,-0.214834,0,0,0,0.143223,0,0.071611,-0.071611,0,0,0,0,-0.071611,0,0.071611,0,0,0,0,0,0,0,0,0,-0.071611,0,-0.071611,0.071611,0,0,0,0,0,0,0,0,0,0,0,0.071611,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.214834,0,0,0,0,0,0,0,0,0]', '2026-10-06 17:44:43.887982+00');


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_profiles VALUES ('cf03677a-2497-4ba1-a30a-94f49e8bf56e', '00000000-0000-0000-0000-000000000001', 'Divyesh Challa', 'divyesh.challa@alumni.ubc.ca', '+1 (604) 555-0199', 'Vancouver, BC', 'British Columbia', 'https://linkedin.com/in/divyeshchalla', 'https://github.com/divyeshchalla', 'https://divyesh.dev', '{"gpa": "3.85 / 4.00", "major": "Computer Science", "degree": "Bachelor of Science", "school": "University of British Columbia (UBC)", "grad_term": "Spring 2027", "start_year": "2023", "is_coop_enrolled": true}', '{"coop_work_permit": true, "work_auth_status": "CITIZEN_OR_PR", "target_term_length": "4 or 8 Months (Fall 2026 / Winter 2027)", "preferred_locations": ["Vancouver, BC", "Burnaby, BC", "Calgary, AB", "Edmonton, AB", "Canada Remote"], "requires_sponsorship": false, "canadian_work_eligible": true}', '["Go", "Python", "TypeScript", "React", "Next.js", "PostgreSQL", "pgvector", "Redis", "Docker", "AWS", "Tailwind CSS", "FastAPI", "C++"]', '[{"role": "Software Engineering Intern", "bullets": ["Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.", "Implemented PostgreSQL schema migrations and Redis caching strategies, reducing database I/O bottlenecks by 38%."], "company": "Tech Internship Inc", "end_date": "Aug 2025", "location": "Vancouver, BC", "start_date": "May 2025"}]', '[{"link": "https://github.com/divyeshchalla/trackr", "name": "Trackr Career Hub", "bullets": ["Built high-dimensional vector search engine using pgvector and HNSW indexing, querying 100K+ document embeddings in <60ms.", "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference."]}]', '2026-10-06 08:04:05.850477+00', '2026-10-06 08:04:12.49368+00');


--
-- Name: application_contacts application_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_contacts
    ADD CONSTRAINT application_contacts_pkey PRIMARY KEY (id);


--
-- Name: application_milestones application_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_milestones
    ADD CONSTRAINT application_milestones_pkey PRIMARY KEY (id);


--
-- Name: application_notes application_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_notes
    ADD CONSTRAINT application_notes_pkey PRIMARY KEY (id);


--
-- Name: application_state_transitions application_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_state_transitions
    ADD CONSTRAINT application_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: application_tasks application_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_tasks
    ADD CONSTRAINT application_tasks_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: discovered_jobs discovered_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovered_jobs
    ADD CONSTRAINT discovered_jobs_pkey PRIMARY KEY (id);


--
-- Name: inbound_email_logs inbound_email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_email_logs
    ADD CONSTRAINT inbound_email_logs_pkey PRIMARY KEY (id);


--
-- Name: resume_bullets resume_bullets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_bullets
    ADD CONSTRAINT resume_bullets_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: idx_applications_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_applications_company ON public.applications USING btree (company_name);


--
-- Name: idx_applications_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications USING btree (user_id, status);


--
-- Name: idx_contacts_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON public.application_contacts USING btree (application_id);


--
-- Name: idx_discovered_jobs_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_hnsw ON public.discovered_jobs USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_discovered_jobs_job_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_discovered_jobs_job_url ON public.discovered_jobs USING btree (job_url);


--
-- Name: idx_discovered_jobs_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_province ON public.discovered_jobs USING btree (province);


--
-- Name: idx_discovered_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_type ON public.discovered_jobs USING btree (job_type);


--
-- Name: idx_discovered_jobs_work_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_work_model ON public.discovered_jobs USING btree (work_model);


--
-- Name: idx_inbound_emails_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inbound_emails_sender ON public.inbound_email_logs USING btree (sender);


--
-- Name: idx_milestones_active_deadlines; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_milestones_active_deadlines ON public.application_milestones USING btree (deadline_at) WHERE (is_completed = false);


--
-- Name: idx_notes_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notes_application_id ON public.application_notes USING btree (application_id);


--
-- Name: idx_resume_bullets_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_bullets_hnsw ON public.resume_bullets USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_state_transitions_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_state_transitions_app_id ON public.application_state_transitions USING btree (application_id);


--
-- Name: idx_tasks_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tasks_application_id ON public.application_tasks USING btree (application_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: application_contacts application_contacts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_contacts
    ADD CONSTRAINT application_contacts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_milestones application_milestones_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_milestones
    ADD CONSTRAINT application_milestones_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_notes application_notes_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_notes
    ADD CONSTRAINT application_notes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_state_transitions application_state_transitions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_state_transitions
    ADD CONSTRAINT application_state_transitions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_tasks application_tasks_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_tasks
    ADD CONSTRAINT application_tasks_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: inbound_email_logs inbound_email_logs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_email_logs
    ADD CONSTRAINT inbound_email_logs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


