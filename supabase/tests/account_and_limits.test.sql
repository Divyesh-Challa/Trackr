-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select ok(public.consume_rate_limit('test', 2, 3600), 'first use allowed');
select ok(public.consume_rate_limit('test', 2, 3600), 'second use allowed');
select ok(not public.consume_rate_limit('test', 2, 3600), 'third use blocked');
select ok(public.consume_rate_limit('other', 2, 3600), 'buckets are independent');

insert into public.applications (company_name, role_title) values ('Acme', 'Intern');

-- User 2 has their own budget and can't see user 1's counters.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select ok(public.consume_rate_limit('test', 2, 3600), 'limits are per user');
select is((select count(*)::int from public.rate_limits), 0, 'counters are not readable');

-- User 1 deletes their account; their data goes with it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$ select public.delete_my_account() $$, 'user can delete their own account');

reset role;
select is(
  (select count(*)::int from public.applications where user_id = '00000000-0000-0000-0000-0000000000c1')
    + (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'account and its applications are gone');

select * from finish();
rollback;
