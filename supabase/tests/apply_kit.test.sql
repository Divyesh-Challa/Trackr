-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

insert into public.applications (id, company_name, role_title) values ('30000000-0000-0000-0000-0000000000b1', 'Acme', 'Intern');
insert into public.application_submissions (application_id, answers)
values ('30000000-0000-0000-0000-0000000000b1', '[{"section": "Personal", "label": "Phone", "value": "555"}]');
select is((select count(*)::int from public.application_submissions), 1, 'owner can record a receipt');

update public.application_submissions set cover_letter = 'edited';
select is((select count(*)::int from public.application_submissions where cover_letter = 'edited'), 0, 'receipts cannot be edited');

select throws_ok(
  $$ insert into public.application_submissions (application_id, answers) values ('30000000-0000-0000-0000-0000000000b1', '{}') $$,
  '23514', null, 'answers must be an array');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.application_submissions), 0, 'receipts are private');
select throws_ok(
  $$ insert into public.application_submissions (application_id) values ('30000000-0000-0000-0000-0000000000b1') $$,
  '23503', null, 'cannot attach a receipt to another user''s application');

select * from finish();
rollback;
