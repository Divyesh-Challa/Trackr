-- Run with: supabase test db
-- Verifies that user B can never read, change, or attach to user A's rows.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

select is(
  (select count(*)::int from public.profiles
    where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')),
  2, 'sign-up creates a profile per user');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.applications (id, company_name, role_title)
values ('10000000-0000-0000-0000-00000000000a', 'Acme', 'SWE Intern');
insert into public.application_notes (application_id, content)
values ('10000000-0000-0000-0000-00000000000a', 'private note');

update public.applications set status = 'applied' where id = '10000000-0000-0000-0000-00000000000a';
update public.applications set company_name = 'Acme Inc' where id = '10000000-0000-0000-0000-00000000000a';

select is(
  (select count(*)::int from public.application_state_transitions
    where application_id = '10000000-0000-0000-0000-00000000000a'),
  2, 'one transition for create, one for the status change, none for other edits');

select throws_ok(
  $$ insert into public.application_state_transitions (user_id, application_id, to_status)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'offer') $$,
  '42501', null, 'users cannot forge status history');

-- Act as user B.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::int from public.applications), 0, 'B sees no applications of A');
select is((select count(*)::int from public.application_notes), 0, 'B sees no notes of A');
select is((select count(*)::int from public.application_state_transitions), 0, 'B sees no history of A');
select is((select count(*)::int from public.profiles), 1, 'B sees only own profile');

update public.applications set status = 'rejected' where id = '10000000-0000-0000-0000-00000000000a';
delete from public.applications where id = '10000000-0000-0000-0000-00000000000a';

select throws_ok(
  $$ insert into public.applications (user_id, company_name, role_title)
     values ('00000000-0000-0000-0000-00000000000a', 'Spoof', 'Spoof') $$,
  '42501', null, 'B cannot create rows owned by A');

select throws_ok(
  $$ insert into public.application_notes (application_id, content)
     values ('10000000-0000-0000-0000-00000000000a', 'injected') $$,
  '23503', null, 'B cannot attach a note to A''s application');

select throws_ok(
  $$ insert into public.jobs (source, company_name, title, job_url, job_url_canonical)
     values ('x', 'x', 'x', 'https://x', 'https://x') $$,
  '42501', null, 'users cannot write to the jobs feed');

-- Back to A: B's update and delete must have had no effect.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  (select status::text from public.applications where id = '10000000-0000-0000-0000-00000000000a'),
  'applied', 'B''s update did not touch A''s application');
select is((select count(*)::int from public.application_notes), 1, 'A still has exactly one note');

-- Anonymous visitors can read the feed but nothing private.
reset role;
set local role anon;
select is((select count(*)::int from public.applications), 0, 'anon sees no applications');
select lives_ok($$ select count(*) from public.jobs $$, 'anon can read jobs');

select * from finish();
rollback;
