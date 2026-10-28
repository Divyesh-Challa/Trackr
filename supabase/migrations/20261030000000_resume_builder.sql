-- Structured resume data for the Jake's Resume builder: contact details on the profile,
-- entries (education / experience / projects) that bullets belong to.

alter table public.profiles
  add column email text check (char_length(email) <= 255),
  add column phone text check (char_length(phone) <= 40),
  add column location text check (char_length(location) <= 120),
  add column linkedin_url text check (linkedin_url ~ '^https?://' and char_length(linkedin_url) <= 300),
  add column github_url text check (github_url ~ '^https?://' and char_length(github_url) <= 300),
  add column website_url text check (website_url ~ '^https?://' and char_length(website_url) <= 300);

create table public.resume_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section text not null check (section in ('education', 'experience', 'project')),
  title text not null check (char_length(title) between 1 and 200),        -- role, degree or project name
  organization text not null default '' check (char_length(organization) <= 200),  -- company or school
  location text not null default '' check (char_length(location) <= 120),
  start_date text not null default '' check (char_length(start_date) <= 40),       -- free text, e.g. "Sep 2024"
  end_date text not null default '' check (char_length(end_date) <= 40),           -- e.g. "Present"
  tech text not null default '' check (char_length(tech) <= 300),                  -- projects: stack used
  details text not null default '' check (char_length(details) <= 300),            -- education: GPA, coursework
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index resume_entries_user_idx on public.resume_entries (user_id, section, position);

create trigger resume_entries_set_updated_at
  before update on public.resume_entries
  for each row execute function public.set_updated_at();

alter table public.resume_entries enable row level security;

create policy "resume_entries: owner can read" on public.resume_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "resume_entries: owner can insert" on public.resume_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "resume_entries: owner can update" on public.resume_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resume_entries: owner can delete" on public.resume_entries for delete to authenticated
  using (user_id = (select auth.uid()));

-- Bullets belong to an entry (skills rows have none: heading = category, content = list).
-- The composite FK means a bullet can only attach to its owner's entry.
alter table public.resume_bullets
  add column entry_id uuid,
  add constraint resume_bullets_entry_fk foreign key (entry_id, user_id)
    references public.resume_entries (id, user_id) on delete cascade;

create index resume_bullets_entry_idx on public.resume_bullets (entry_id, position);
