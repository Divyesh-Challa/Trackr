-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'f2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.feedback (kind, message) select 'bug', 'Something broke ' || n from generate_series(1, 10) n $$,
  'a user can send feedback');
select throws_ok(
  $$ insert into public.feedback (kind, message) values ('bug', 'one too many') $$,
  'P0001', 'feedback_daily_limit', 'the 11th message in a day is refused');
select throws_ok(
  $$ insert into public.feedback (user_id, kind, message) values ('00000000-0000-0000-0000-0000000000f2', 'bug', 'not mine') $$,
  '42501', null, 'feedback cannot be filed as someone else');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
select is((select count(*)::int from public.feedback), 0, 'feedback is private');

select * from finish();
rollback;
