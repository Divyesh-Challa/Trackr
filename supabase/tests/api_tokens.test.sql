-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

insert into public.api_tokens (name, token_hash) values ('Laptop', repeat('a', 64));
select is((select count(*)::int from public.api_tokens), 1, 'owner can create a token');
select throws_ok(
  $$ insert into public.api_tokens (name, token_hash) values ('Bad', 'not-a-hash') $$,
  '23514', null, 'only sha-256 hex is stored');
select throws_ok(
  $$ select * from public.api_authenticate(repeat('a', 64)) $$,
  '42501', null, 'signed-in users cannot resolve tokens');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is((select count(*)::int from public.api_tokens), 0, 'tokens are private');
delete from public.api_tokens;

reset role;
set local role service_role;
select is((select uid from public.api_authenticate(repeat('a', 64))), '00000000-0000-0000-0000-0000000000c1'::uuid, 'a token resolves to its owner');
select is((select count(*)::int from public.api_authenticate(repeat('b', 64))), 0, 'an unknown token resolves to nobody');

reset role;
select isnt((select last_used_at from public.api_tokens where token_hash = repeat('a', 64)), null, 'use is stamped; the other user could not delete it');

select * from finish();
rollback;
