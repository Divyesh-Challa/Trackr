-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'd1@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

select ok(not public.am_i_pro(), 'new users are on the free plan');

insert into public.applications (company_name, role_title, status)
select 'Co ' || g, 'Intern', 'applied' from generate_series(1, 50) g;
select is((select count(*)::int from public.applications), 50, 'free plan allows 50 active applications');

select throws_ok(
  $$ insert into public.applications (company_name, role_title) values ('One', 'Too many') $$,
  'P0001', null, 'the 51st active application is refused');

select lives_ok(
  $$ insert into public.applications (company_name, role_title, status) values ('Old', 'Done', 'rejected') $$,
  'finished applications do not count');

select throws_ok(
  $$ update public.applications set status = 'applied' where company_name = 'Old' $$,
  'P0001', null, 'reactivating past the limit is refused');

select throws_ok(
  $$ insert into public.subscriptions (user_id, status) values ('00000000-0000-0000-0000-0000000000d1', 'active') $$,
  '42501', null, 'users cannot grant themselves Pro');

-- The webhook (service role) records an active subscription; the limit lifts.
reset role;
insert into public.subscriptions (user_id, status, current_period_end)
values ('00000000-0000-0000-0000-0000000000d1', 'active', now() + interval '30 days');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.applications (company_name, role_title) values ('Pro', 'Unlimited') $$,
  'Pro users are not limited');

select * from finish();
rollback;
