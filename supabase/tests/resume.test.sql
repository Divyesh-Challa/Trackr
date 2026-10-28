-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'f2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

insert into public.resume_entries (id, section, title, organization)
values ('20000000-0000-0000-0000-0000000000f1', 'experience', 'Software Intern', 'Acme');
insert into public.resume_bullets (entry_id, section, content)
values ('20000000-0000-0000-0000-0000000000f1', 'experience', 'Built a thing');
select is((select count(*)::int from public.resume_bullets where entry_id = '20000000-0000-0000-0000-0000000000f1'), 1,
  'bullets attach to their entry');

select throws_ok(
  $$ update public.profiles set linkedin_url = 'javascript:alert(1)' $$,
  '23514', null, 'profile links must be http(s)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
select is((select count(*)::int from public.resume_entries), 0, 'entries are private');
select throws_ok(
  $$ insert into public.resume_bullets (entry_id, content) values ('20000000-0000-0000-0000-0000000000f1', 'injected') $$,
  '23503', null, 'cannot attach bullets to another user''s entry');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
delete from public.resume_entries where id = '20000000-0000-0000-0000-0000000000f1';
select is((select count(*)::int from public.resume_bullets), 0, 'deleting an entry removes its bullets');

select * from finish();
rollback;
