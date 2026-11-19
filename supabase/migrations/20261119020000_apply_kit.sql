-- Receipts: what the user actually sent with an application (tailored resume, cover letter,
-- every form answer), written when they mark it applied or the extension sees the submit.
-- Receipts are a record, so owners can read, add and delete them but not edit them.

create table public.application_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  application_id uuid not null,
  -- {"bullets": [{"bullet_id", "text"}]} when tailored; null = the resume as written.
  resume_snapshot jsonb check (resume_snapshot is null or pg_column_size(resume_snapshot) <= 100000),
  cover_letter text check (char_length(cover_letter) <= 20000),
  -- [{"section", "label", "value", "options": [text]?}], the form as it was filled.
  answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(answers) = 'array' and pg_column_size(answers) <= 200000),
  job_url text check (char_length(job_url) <= 2048),
  ats text check (char_length(ats) <= 40),
  source text not null default 'manual' check (source in ('manual', 'extension')),
  submitted_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade
);

create index application_submissions_app_idx on public.application_submissions (application_id, submitted_at desc);

alter table public.application_submissions enable row level security;

create policy "application_submissions: owner can read" on public.application_submissions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "application_submissions: owner can insert" on public.application_submissions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "application_submissions: owner can delete" on public.application_submissions for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check check (
  feature in ('tailor', 'cover_letter', 'interview_question', 'interview_feedback', 'job_match', 'job_question', 'assistant',
              'resume_parse', 'screener_answers')
);
