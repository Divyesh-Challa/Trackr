-- Least-privilege database roles for automation, so CI never holds the service-role key
-- or the postgres password.
--   trackr_ingest: may only call the ingest_* functions below.
--   trackr_backup: read-only, for the nightly pg_dump.
-- Both are created without LOGIN; a password is set per environment (outside migrations)
-- with: alter role trackr_ingest login password '<scram verifier>';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'trackr_ingest') then
    create role trackr_ingest nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'trackr_backup') then
    create role trackr_backup nologin bypassrls;
  end if;
end;
$$;

grant pg_read_all_data to trackr_backup;
alter role trackr_ingest set statement_timeout = '120s';
alter role trackr_backup set statement_timeout = '0';

-- The ingest functions run as their owner so the ingest role needs no table privileges.
alter function public.ingest_upsert_jobs(jsonb) security definer;
alter function public.ingest_mark_missing(timestamptz, text[], text[]) security definer;
alter function public.ingest_expire(integer) security definer;
alter function public.ingest_deactivate(text[]) security definer;

create function public.ingest_start_run()
returns table (id uuid, started_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  insert into public.ingest_runs default values returning id, started_at;
$$;

create function public.ingest_finish_run(
  p_id uuid,
  p_status text,
  p_inserted integer default 0,
  p_updated integer default 0,
  p_deactivated integer default 0,
  p_stats jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ingest_runs
  set finished_at = now(), status = p_status, inserted = p_inserted, updated = p_updated,
      deactivated = p_deactivated, stats = p_stats
  where id = p_id;
$$;

-- Active postings from company job boards, so their boards keep being scanned.
create function public.ingest_active_ats_postings()
returns table (job_url text, company_name text, company_size text)
language sql
stable
security definer
set search_path = ''
as $$
  select job_url, company_name, company_size from public.jobs
  where is_active
    and source in ('greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'recruitee');
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.ingest_upsert_jobs(jsonb)',
    'public.ingest_mark_missing(timestamptz, text[], text[])',
    'public.ingest_expire(integer)',
    'public.ingest_deactivate(text[])',
    'public.ingest_start_run()',
    'public.ingest_finish_run(uuid, text, integer, integer, integer, jsonb)',
    'public.ingest_active_ats_postings()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to trackr_ingest, service_role', fn);
  end loop;
end;
$$;

grant usage on schema public to trackr_ingest;
