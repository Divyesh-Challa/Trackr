-- The answers every application form asks for, given once (onboarding) and reused by the
-- apply kit and the autofill extension. Contact details stay on profiles.

create table public.application_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  street text not null default '' check (char_length(street) <= 200),
  city text not null default '' check (char_length(city) <= 120),
  region text not null default '' check (char_length(region) <= 120),      -- province or state
  postal_code text not null default '' check (char_length(postal_code) <= 20),
  country text not null default 'Canada' check (char_length(country) <= 80),
  -- Per country the user would work in: {"Canada": {"authorized": true, "needs_sponsorship": false, "basis": "citizen"}}
  work_auth jsonb not null default '{}'::jsonb check (jsonb_typeof(work_auth) = 'object' and pg_column_size(work_auth) <= 4000),
  willing_to_relocate boolean,
  in_person_ok boolean,
  earliest_start text not null default '' check (char_length(earliest_start) <= 40),
  -- Voluntary self-identification. Null = not answered; the kit then answers "Prefer not to say".
  gender text check (char_length(gender) <= 60),
  race_ethnicity text check (char_length(race_ethnicity) <= 120),
  indigenous text check (char_length(indigenous) <= 60),
  veteran text check (char_length(veteran) <= 60),
  disability text check (char_length(disability) <= 60),
  notes text not null default '' check (char_length(notes) <= 2000),
  tailoring text not null default 'honest' check (tailoring in ('off', 'honest', 'bold')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger application_profiles_set_updated_at
  before update on public.application_profiles
  for each row execute function public.set_updated_at();

alter table public.application_profiles enable row level security;

create policy "application_profiles: owner can read" on public.application_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "application_profiles: owner can insert" on public.application_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "application_profiles: owner can update" on public.application_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "application_profiles: owner can delete" on public.application_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

-- Reading an uploaded resume PDF counts against the AI allowance.
alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check check (
  feature in ('tailor', 'cover_letter', 'interview_question', 'interview_feedback', 'job_match', 'job_question', 'assistant',
              'resume_parse')
);

-- Writes a parsed resume in one transaction, so a failed import never leaves half a resume.
-- p_resume: {"entries": [{"section", "title", "organization", "location", "start_date", "end_date",
--   "tech", "details", "bullets": [text]}], "skills": [{"heading", "content"}]}
-- With p_replace the caller's existing entries and bullets are deleted first.
create function public.import_resume(p_resume jsonb, p_replace boolean)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_entry jsonb;
  v_skill jsonb;
  v_id uuid;
  v_base double precision;
  v_count integer := 0;
  v_i integer := 0;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_replace then
    delete from public.resume_bullets where user_id = v_uid;
    delete from public.resume_entries where user_id = v_uid;
  end if;
  select coalesce(max(position), 0) + 1 into v_base from public.resume_entries where user_id = v_uid;

  for v_entry in select * from jsonb_array_elements(coalesce(p_resume -> 'entries', '[]'::jsonb)) loop
    v_i := v_i + 1;
    insert into public.resume_entries (user_id, section, title, organization, location, start_date, end_date, tech, details, position)
    values (
      v_uid, v_entry ->> 'section', left(v_entry ->> 'title', 200), left(coalesce(v_entry ->> 'organization', ''), 200),
      left(coalesce(v_entry ->> 'location', ''), 120), left(coalesce(v_entry ->> 'start_date', ''), 40),
      left(coalesce(v_entry ->> 'end_date', ''), 40), left(coalesce(v_entry ->> 'tech', ''), 300),
      left(coalesce(v_entry ->> 'details', ''), 300), v_base + v_i
    )
    returning id into v_id;
    insert into public.resume_bullets (user_id, entry_id, section, content, position)
    select v_uid, v_id, v_entry ->> 'section', left(b.content, 600), b.ord
    from jsonb_array_elements_text(coalesce(v_entry -> 'bullets', '[]'::jsonb)) with ordinality as b (content, ord)
    where length(trim(b.content)) > 0;
    v_count := v_count + 1;
  end loop;

  for v_skill in select * from jsonb_array_elements(coalesce(p_resume -> 'skills', '[]'::jsonb)) loop
    if length(trim(coalesce(v_skill ->> 'content', ''))) > 0 then
      v_i := v_i + 1;
      insert into public.resume_bullets (user_id, entry_id, section, heading, content, position)
      values (v_uid, null, 'skills', left(coalesce(v_skill ->> 'heading', ''), 200), left(v_skill ->> 'content', 600), v_base + v_i);
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.import_resume(jsonb, boolean) from public, anon;
grant execute on function public.import_resume(jsonb, boolean) to authenticated;
