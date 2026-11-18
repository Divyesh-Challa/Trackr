-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(public.extract_skills('Python, C++, Node.js and k8s. Go above and beyond; react to feedback.'),
  array['C++', 'Kubernetes', 'Node.js', 'Python'], 'skills are tagged without English false positives');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'p1@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'p2@test.local');
insert into public.jobs (source, source_id, company_name, title, job_url, job_url_canonical, province, description_md)
values ('greenhouse', 'p-1', 'Personal Co', 'Backend Intern', 'https://x.test/p-1', 'test:p-1', 'QC',
        'You will use Python, PostgreSQL and Docker.');
select is((select skills from public.jobs where job_url_canonical = 'test:p-1'),
  array['Docker', 'PostgreSQL', 'Python'], 'ingest tags job skills');
insert into public.resume_bullets (user_id, section, heading, content)
values ('00000000-0000-0000-0000-0000000000c1', 'skills', 'Languages', 'Python, Docker');
update public.profiles set target_provinces = '{QC}' where id = '00000000-0000-0000-0000-0000000000c1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select match_percent from public.job_feed where job_url_canonical = 'test:p-1'), 66, 'match is the share of job skills on the resume');
create temp table mine as select rank_score from public.job_feed where job_url_canonical = 'test:p-1';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is((select match_percent from public.job_feed where job_url_canonical = 'test:p-1'), null, 'another user sees no match from my resume');
select ok((select rank_score from mine) > (select rank_score from public.job_feed where job_url_canonical = 'test:p-1'),
  'target province and skills raise my ranking only');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(match_percent)::int from public.job_feed), 0, 'signed-out visitors get no match scores');

select * from finish();
rollback;
