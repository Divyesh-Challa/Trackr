-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

select is(public.ai_check('tailor', 2, 5), 'not_pro', 'free users cannot use AI');

reset role;
insert into public.subscriptions (user_id, status, current_period_end)
values ('00000000-0000-0000-0000-0000000000e1', 'active', now() + interval '30 days');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

select is(public.ai_check('tailor', 2, 5), 'ok', 'Pro users can');
select public.ai_record('tailor', 'claude-sonnet-5-5', 1000, 500, 0.007);
select public.ai_record('tailor', 'claude-sonnet-5-5', 1000, 500, 0.007);
select is(public.ai_check('tailor', 2, 5), 'quota', 'monthly quota is enforced per feature');
select is(public.ai_check('cover_letter', 2, 5), 'ok', 'other features have their own quota');
select is(public.ai_check('cover_letter', 2, 0.01), 'budget', 'the daily budget breaker trips');

insert into public.resume_bullets (heading, content) values ('Intern, Acme', 'Built a thing');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is((select count(*)::int from public.resume_bullets), 0, 'bullets are private');
select is((select count(*)::int from public.ai_usage), 0, 'usage is private');

select * from finish();
rollback;
