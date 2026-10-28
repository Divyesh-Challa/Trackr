-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Start from an empty feed so counts below only see this test's rows.
delete from public.jobs;

select is(
  (select inserted from public.ingest_upsert_jobs('[
    {"source":"greenhouse","source_id":"1","company_name":"Acme","title":"SWE Intern","job_url":"https://x/1",
     "job_url_canonical":"greenhouse:1","description_md":"Real description","terms":["S2027"],"term":"S2027"},
    {"source":"simplify","source_id":"a","company_name":"Beta","title":"Data Intern","job_url":"https://x/2",
     "job_url_canonical":"x/2","terms":[]},
    {"source":"lever","source_id":"z","company_name":"Gamma","title":"HW Intern","job_url":"https://x/3",
     "job_url_canonical":"lever:z","terms":["F2026"]}
  ]'::jsonb)),
  3, 'first upsert inserts all rows');

-- Same posting seen again from a list without a description: nothing is blanked out.
select is(
  (select updated from public.ingest_upsert_jobs('[{"source":"simplify","source_id":"s1","company_name":"Acme",
    "title":"SWE Intern","job_url":"https://x/1","job_url_canonical":"greenhouse:1","terms":[]}]'::jsonb)),
  1, 'repeat posting updates instead of duplicating');
select is((select description_md from public.jobs where job_url_canonical = 'greenhouse:1'),
  'Real description', 'description from an earlier run is kept');
select is((select terms from public.jobs where job_url_canonical = 'greenhouse:1'),
  array['S2027'], 'terms from an earlier run are kept');

select throws_ok(
  $$ select public.ingest_upsert_jobs('[{"source":"x","company_name":"A","title":"T","job_url":"u",
       "job_url_canonical":"k","salary_min":30,"salary_max":40}]'::jsonb) $$,
  '23514', null, 'pay without salary_source=posted is rejected');

-- Pretend a later run started now and found nothing; simplify ran, lever failed.
update public.jobs set last_seen_at = now() - interval '1 hour';
select is(public.ingest_mark_missing(now(), array['simplify', 'greenhouse'], array['Acme']), 0,
  'first miss is only a strike');
select is((select missed_runs from public.jobs where job_url_canonical = 'x/2'), 1, 'missing posting gets a strike');
select is((select missed_runs from public.jobs where job_url_canonical = 'greenhouse:1'), 0,
  'company whose board failed this run is skipped');
select is((select missed_runs from public.jobs where job_url_canonical = 'lever:z'), 0,
  'postings from a failed source are untouched');
select is(public.ingest_mark_missing(now(), array['simplify'], '{}'), 1, 'second miss deactivates');

select is(public.ingest_expire(), 1, 'posting whose only term has started is expired');

set local role anon;
select throws_ok($$ select public.ingest_expire() $$, '42501', null, 'anon cannot call ingest functions');

select * from finish();
rollback;
