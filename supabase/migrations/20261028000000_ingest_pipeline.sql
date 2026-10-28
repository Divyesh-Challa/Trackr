-- Ingestion support: multi-term postings, company size, run log, and the two
-- functions the scheduled ingest job calls (service role only).

-- A posting can cover several terms (e.g. Winter or Summer 2027); `term` stays the earliest.
alter table public.jobs
  add column terms text[] not null default '{}'
    check (array_to_string(terms, ',') ~ '^((S|F|W)[0-9]{4}(,(S|F|W)[0-9]{4})*)?$'),
  add column company_size text check (company_size in ('startup', 'mid', 'large'));

-- The v1 check let pay through when salary_source was null (NULL passes a CHECK).
alter table public.jobs drop constraint jobs_check1;
alter table public.jobs add constraint jobs_salary_posted_only
  check ((salary_min is null and salary_max is null) or coalesce(salary_source = 'posted', false));

create index jobs_terms_idx on public.jobs using gin (terms);
create index jobs_company_size_idx on public.jobs (company_size) where is_active;

-- job_url_canonical is the cross-source identity (e.g. "greenhouse:4012345"), so the same
-- posting found by an ATS API and a GitHub list collapses to one row. (source, source_id)
-- is provenance only and may change when a better source takes over.
alter table public.jobs drop constraint jobs_source_source_id_key;
create index jobs_source_idx on public.jobs (source, source_id);

create table public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  inserted integer not null default 0,
  updated integer not null default 0,
  deactivated integer not null default 0,
  stats jsonb not null default '{}'::jsonb   -- per-source fetched/kept counts and errors
);

alter table public.ingest_runs enable row level security;
-- No policies: only the service role reads or writes run logs.

-- Upsert a batch of normalized postings. Never blanks out a description or pay that an
-- earlier run stored when this run's winning source lacks it.
create function public.ingest_upsert_jobs(p_jobs jsonb)
returns table (inserted integer, updated integer)
language plpgsql
security invoker
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
      salary_source text, posted_at timestamptz, deadline_at timestamptz
    )
  ),
  upserted as (
    insert into public.jobs as t (
      source, source_id, company_name, company_domain, company_size, title, locations,
      city, province, work_model, job_type, term, terms, disciplines, job_url,
      job_url_canonical, description_md, salary_min, salary_max, salary_currency,
      salary_period, salary_source, posted_at, deadline_at,
      last_seen_at, missed_runs, is_active
    )
    select
      source, source_id, company_name, company_domain, company_size, title,
      coalesce(locations, '{}'), city, province, work_model, job_type, term,
      coalesce(terms, '{}'), coalesce(disciplines, '{}'), job_url, job_url_canonical,
      description_md, salary_min, salary_max, coalesce(salary_currency, 'CAD'),
      salary_period, salary_source, posted_at, deadline_at,
      now(), 0, true
    from incoming
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
      last_seen_at = now(),
      missed_runs = 0,
      is_active = true
    returning (xmax = 0) as was_inserted
  )
  select count(*) filter (where was_inserted), count(*) into v_inserted, v_total from upserted;

  return query select v_inserted, v_total - v_inserted;
end;
$$;

-- After a run: postings from sources that ran successfully but weren't seen this run get a
-- strike; two strikes in a row deactivates them. Failed sources (and companies whose board
-- failed this run) are left alone, so an outage never empties the feed.
-- Returns the number deactivated.
create function public.ingest_mark_missing(
  p_run_started timestamptz,
  p_sources text[],
  p_skip_companies text[] default '{}'
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deactivated integer;
begin
  with struck as (
    update public.jobs
    set missed_runs = missed_runs + 1,
        is_active = missed_runs + 1 < 2
    where is_active
      and source = any (p_sources)
      and not (company_name = any (p_skip_companies))
      and last_seen_at < p_run_started
    returning is_active
  )
  select count(*) filter (where not is_active) into v_deactivated from struck;
  return v_deactivated;
end;
$$;

-- Co-op terms: Winter starts Jan, Summer May, Fall Sep.
create function public.term_start(p_term text)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    substr(p_term, 2)::integer,
    case left(p_term, 1) when 'W' then 1 when 'S' then 5 else 9 end,
    1
  );
$$;

-- Deactivate postings whose every term has already started, and term-less postings
-- older than p_max_age_days. Returns the number deactivated.
create function public.ingest_expire(p_max_age_days integer default 120)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with d as (
    update public.jobs j set is_active = false
    where j.is_active and (
      (cardinality(j.terms) > 0
        and not exists (select 1 from unnest(j.terms) t where public.term_start(t) > current_date))
      or (cardinality(j.terms) = 0
        and coalesce(j.posted_at, j.first_seen_at) < now() - make_interval(days => p_max_age_days))
    )
    returning 1
  )
  select count(*)::integer from d;
$$;

-- Explicit deactivation (a source says the posting closed, or its term has passed).
create function public.ingest_deactivate(p_canonical text[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with d as (
    update public.jobs set is_active = false
    where is_active and job_url_canonical = any (p_canonical)
    returning 1
  )
  select count(*)::integer from d;
$$;

revoke execute on function public.ingest_upsert_jobs(jsonb) from public, anon, authenticated;
revoke execute on function public.ingest_mark_missing(timestamptz, text[], text[]) from public, anon, authenticated;
revoke execute on function public.ingest_expire(integer) from public, anon, authenticated;
revoke execute on function public.ingest_deactivate(text[]) from public, anon, authenticated;
grant execute on function public.ingest_upsert_jobs(jsonb) to service_role;
grant execute on function public.ingest_mark_missing(timestamptz, text[], text[]) to service_role;
grant execute on function public.ingest_expire(integer) to service_role;
grant execute on function public.ingest_deactivate(text[]) to service_role;
