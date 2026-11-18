-- Feed signals: eligibility flags and reposts on jobs, hiding and reporting listings,
-- and the ranking/trending columns the Discover sorts use.

alter table public.jobs
  add column is_repost boolean not null default false,
  add column citizenship_required boolean not null default false,
  add column clearance_required boolean not null default false,
  add column min_gpa numeric(3,2) check (min_gpa between 2 and 4.33);

create index jobs_company_title_idx on public.jobs (lower(company_name), lower(title));

-- A repost is the same company and title first seen at least a week before, under another URL.
update public.jobs j set is_repost = true
where exists (
  select 1 from public.jobs o
  where lower(o.company_name) = lower(j.company_name) and lower(o.title) = lower(j.title)
    and o.id <> j.id and o.first_seen_at < j.first_seen_at - interval '7 days'
);

create or replace function public.ingest_upsert_jobs(p_jobs jsonb)
returns table (inserted integer, updated integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
  v_total integer;
begin
  with incoming as (
    select * from jsonb_to_recordset(p_jobs) as j (
      source text, source_id text, company_name text, company_domain text, company_size text,
      title text, locations text[], city text, province text,
      work_model public.work_model, job_type public.job_type,
      term text, terms text[], disciplines text[],
      job_url text, job_url_canonical text, description_md text,
      salary_min integer, salary_max integer, salary_currency text, salary_period text,
      salary_source text, posted_at timestamptz, deadline_at timestamptz,
      citizenship_required boolean, clearance_required boolean, min_gpa numeric
    )
  ),
  upserted as (
    insert into public.jobs as t (
      source, source_id, company_name, company_domain, company_size, title, locations,
      city, province, work_model, job_type, term, terms, disciplines, job_url,
      job_url_canonical, description_md, salary_min, salary_max, salary_currency,
      salary_period, salary_source, posted_at, deadline_at,
      citizenship_required, clearance_required, min_gpa, is_repost,
      last_seen_at, missed_runs, is_active
    )
    select
      i.source, i.source_id, i.company_name, i.company_domain, i.company_size, i.title,
      coalesce(i.locations, '{}'), i.city, i.province, i.work_model, i.job_type, i.term,
      coalesce(i.terms, '{}'), coalesce(i.disciplines, '{}'), i.job_url, i.job_url_canonical,
      i.description_md, i.salary_min, i.salary_max, coalesce(i.salary_currency, 'CAD'),
      i.salary_period, i.salary_source, i.posted_at, i.deadline_at,
      coalesce(i.citizenship_required, false), coalesce(i.clearance_required, false), i.min_gpa,
      exists (
        select 1 from public.jobs o
        where lower(o.company_name) = lower(i.company_name) and lower(o.title) = lower(i.title)
          and o.job_url_canonical <> i.job_url_canonical and o.first_seen_at < now() - interval '7 days'
      ),
      now(), 0, true
    from incoming i
    on conflict (job_url_canonical) do update set
      source = excluded.source,
      source_id = excluded.source_id,
      company_name = excluded.company_name,
      company_domain = coalesce(excluded.company_domain, t.company_domain),
      company_size = excluded.company_size,  -- recomputed every run; a stale estimate must clear
      title = excluded.title,
      locations = excluded.locations,
      city = excluded.city,
      province = excluded.province,
      work_model = coalesce(excluded.work_model, t.work_model),
      job_type = coalesce(excluded.job_type, t.job_type),
      term = coalesce(excluded.term, t.term),
      terms = case when cardinality(excluded.terms) > 0 then excluded.terms else t.terms end,
      disciplines = excluded.disciplines,
      job_url = excluded.job_url,
      description_md = coalesce(excluded.description_md, t.description_md),
      salary_min = case when excluded.salary_source = 'posted' then excluded.salary_min else t.salary_min end,
      salary_max = case when excluded.salary_source = 'posted' then excluded.salary_max else t.salary_max end,
      salary_currency = case when excluded.salary_source = 'posted' then excluded.salary_currency else t.salary_currency end,
      salary_period = case when excluded.salary_source = 'posted' then excluded.salary_period else t.salary_period end,
      salary_source = coalesce(excluded.salary_source, t.salary_source),
      posted_at = coalesce(t.posted_at, excluded.posted_at),
      deadline_at = coalesce(excluded.deadline_at, t.deadline_at),
      -- Flags follow the description, so only recompute them when this run brought one.
      citizenship_required = case when excluded.description_md is not null then excluded.citizenship_required else t.citizenship_required end,
      clearance_required = case when excluded.description_md is not null then excluded.clearance_required else t.clearance_required end,
      min_gpa = case when excluded.description_md is not null then excluded.min_gpa else t.min_gpa end,
      last_seen_at = now(),
      missed_runs = 0,
      is_active = true
    returning (xmax = 0) as was_inserted
  )
  select count(*) filter (where was_inserted), count(*) into v_inserted, v_total from upserted;

  return query select v_inserted, v_total - v_inserted;
end;
$$;

-- Listings a user doesn't want to see again. They stay restorable from the Hidden view.
create table public.job_hides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

alter table public.job_hides enable row level security;

create policy "job_hides: owner can read" on public.job_hides for select to authenticated
  using (user_id = (select auth.uid()));
create policy "job_hides: owner can insert" on public.job_hides for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "job_hides: owner can delete" on public.job_hides for delete to authenticated
  using (user_id = (select auth.uid()));

-- Bad-listing reports from signed-in users, one per user and job. Read them in the dashboard.
create table public.job_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  reason text not null check (reason in ('expired', 'wrong_info', 'not_canada', 'not_student', 'duplicate', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index job_reports_job_idx on public.job_reports (job_id, reason);

alter table public.job_reports enable row level security;

create policy "job_reports: owner can read" on public.job_reports for select to authenticated
  using (user_id = (select auth.uid()));
create policy "job_reports: owner can insert" on public.job_reports for insert to authenticated
  with check (user_id = (select auth.uid()));

create index applications_job_created_idx on public.applications (job_id, created_at) where job_id is not null;

-- How many people added a feed job to their tracker this week. Applications are private, so
-- only the count leaves this function.
create function public.job_trackers_week(p_job_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.applications
  where job_id = p_job_id and created_at > now() - interval '7 days';
$$;

revoke execute on function public.job_trackers_week(uuid) from public;
grant execute on function public.job_trackers_week(uuid) to anon, authenticated;

-- The Discover feed: jobs plus this week's trackers, whether the viewer hid it, and the
-- Recommended score (fresh postings, larger companies, stated pay and what others track rank higher).
-- shortcut: trackers are counted per row at query time; move to a table refreshed by ingest once the feed passes ~10k active jobs.
create view public.job_feed with (security_invoker = true) as
select
  j.*,
  t.trackers_week,
  coalesce(j.posted_at, j.first_seen_at) as posted_sort,
  exists (select 1 from public.job_hides h where h.job_id = j.id and h.user_id = (select auth.uid())) as hidden,
  (
    greatest(0, 20 - extract(epoch from now() - coalesce(j.posted_at, j.first_seen_at)) / 86400 * (20.0 / 30))
    + case j.company_size when 'large' then 10 when 'mid' then 5 else 0 end
    + least(15, t.trackers_week * 3)
    + case when j.salary_source = 'posted' then 5 else 0 end
    - case when j.is_repost then 3 else 0 end
  )::real as rank_score
from public.jobs j
cross join lateral (select public.job_trackers_week(j.id) as trackers_week) t;

grant select on public.job_feed to anon, authenticated;

-- The live line above the feed: when listings last refreshed, how many arrived today, and
-- how many students tracked a feed job this week.
create function public.feed_pulse()
returns table (last_refresh timestamptz, new_today integer, trackers_week integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select max(finished_at) from public.ingest_runs where status in ('succeeded', 'partial')),
    (select count(*)::integer from public.jobs where is_active and first_seen_at > now() - interval '24 hours'),
    (select count(distinct user_id)::integer from public.applications
      where job_id is not null and created_at > now() - interval '7 days');
$$;

revoke execute on function public.feed_pulse() from public;
grant execute on function public.feed_pulse() to anon, authenticated;
