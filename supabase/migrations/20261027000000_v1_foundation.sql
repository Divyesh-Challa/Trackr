-- Trackr v1 foundation: accounts, per-user tracker tables with RLS, public jobs feed.
-- Replaces db/migrations/00{1,2,3}_*.sql (legacy gateway schema).

-- ---------------------------------------------------------------------------
-- Types & helpers
-- ---------------------------------------------------------------------------
create type public.application_status as enum (
  'wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'
);

create type public.work_model as enum ('remote', 'hybrid', 'onsite');

create type public.job_type as enum ('internship', 'coop', 'new_grad', 'full_time');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, created on sign-up)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  school text not null default '' check (char_length(school) <= 160),
  grad_term text check (grad_term ~ '^(S|F|W)[0-9]{4}$'),
  target_roles text[] not null default '{}',
  target_provinces text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Jobs feed (public read; written only by the ingestion job via service role)
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- 'greenhouse' | 'lever' | 'ashby' | 'jobbank' | ...
  source_id text,                       -- the source's own posting id
  company_name text not null,
  company_domain text,
  title text not null,
  locations text[] not null default '{}',
  city text,
  province text check (province ~ '^[A-Z]{2}$'),
  work_model public.work_model,
  job_type public.job_type,
  term text check (term ~ '^(S|F|W)[0-9]{4}$'),
  disciplines text[] not null default '{}',
  job_url text not null,
  job_url_canonical text not null unique,
  description_md text,
  -- Pay is only ever stored when the posting states it; never estimated.
  salary_min integer check (salary_min >= 0),
  salary_max integer check (salary_max >= salary_min),
  salary_currency text not null default 'CAD',
  salary_period text check (salary_period in ('hour', 'month', 'year')),
  salary_source text check (salary_source = 'posted'),
  posted_at timestamptz,
  deadline_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missed_runs integer not null default 0,
  is_active boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description_md, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id),
  check ((salary_min is null and salary_max is null) or salary_source = 'posted')
);

create index jobs_search_idx on public.jobs using gin (search);
create index jobs_active_posted_idx on public.jobs (posted_at desc) where is_active;
create index jobs_province_idx on public.jobs (province) where is_active;
create index jobs_disciplines_idx on public.jobs using gin (disciplines);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

create policy "jobs: anyone can read"
  on public.jobs for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  company_name text not null check (char_length(company_name) between 1 and 200),
  role_title text not null check (char_length(role_title) between 1 and 200),
  location text check (char_length(location) <= 200),
  work_model public.work_model,
  status public.application_status not null default 'wishlist',
  position double precision not null default 0,  -- order within a board column
  job_url text check (char_length(job_url) <= 2048),
  salary_text text check (char_length(salary_text) <= 120),
  description text check (char_length(description) <= 100000),
  applied_at date,
  deadline_at date,
  follow_up_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),       -- target for child-table composite FKs
  unique (user_id, job_id)    -- one tracker entry per feed job
);

create index applications_user_status_idx on public.applications (user_id, status, position);
create index applications_user_updated_idx on public.applications (user_id, updated_at desc);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

create policy "applications: owner can read"
  on public.applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "applications: owner can insert"
  on public.applications for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "applications: owner can update"
  on public.applications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "applications: owner can delete"
  on public.applications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Status history (written only by trigger, so one row per real change)
-- ---------------------------------------------------------------------------
create table public.application_state_transitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid not null,
  from_status public.application_status,
  to_status public.application_status not null,
  transitioned_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade
);

create index application_state_transitions_app_idx
  on public.application_state_transitions (application_id, transitioned_at);
create index application_state_transitions_user_idx
  on public.application_state_transitions (user_id, transitioned_at);

create function public.log_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_state_transitions (user_id, application_id, from_status, to_status)
    values (new.user_id, new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.application_state_transitions (user_id, application_id, from_status, to_status)
    values (new.user_id, new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger applications_log_status
  after insert or update of status on public.applications
  for each row execute function public.log_application_status();

alter table public.application_state_transitions enable row level security;

create policy "transitions: owner can read"
  on public.application_state_transitions for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Tasks, contacts, notes. The composite FK on (application_id, user_id)
-- guarantees a child row can only attach to an application its owner owns.
-- ---------------------------------------------------------------------------
create table public.application_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  application_id uuid not null,
  title text not null check (char_length(title) between 1 and 300),
  is_completed boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade
);

create index application_tasks_app_idx on public.application_tasks (application_id);
create index application_tasks_user_due_idx on public.application_tasks (user_id, due_date)
  where not is_completed;

create table public.application_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  application_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  role_title text check (char_length(role_title) <= 120),
  email text check (char_length(email) <= 255),
  phone text check (char_length(phone) <= 50),
  linkedin_url text check (char_length(linkedin_url) <= 2048),
  notes text check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade
);

create index application_contacts_app_idx on public.application_contacts (application_id);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  application_id uuid not null,
  title text check (char_length(title) <= 120),
  content text not null check (char_length(content) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade
);

create index application_notes_app_idx on public.application_notes (application_id);

create trigger application_notes_set_updated_at
  before update on public.application_notes
  for each row execute function public.set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['application_tasks', 'application_contacts', 'application_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%s: owner can read" on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: owner can insert" on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: owner can update" on public.%I for update to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s: owner can delete" on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))', t, t);
  end loop;
end;
$$;

-- Trigger functions are not meant to be called directly through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_application_status() from public, anon, authenticated;
