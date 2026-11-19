-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into public.application_profiles (city, work_auth)
values ('Edmonton', '{"Canada": {"authorized": true, "needs_sponsorship": false}}');
select is((select tailoring from public.application_profiles), 'honest', 'tailoring defaults to honest');

insert into public.resume_entries (section, title) values ('experience', 'Old job');
select is(
  public.import_resume('{"entries": [
      {"section": "experience", "title": "Software Intern", "organization": "Acme", "bullets": ["Built a thing", " "]},
      {"section": "education", "title": "BSc Computing Science", "organization": "U of A"}],
    "skills": [{"heading": "Languages", "content": "Python, Go"}]}'::jsonb, true),
  2, 'import_resume returns the entries written');
select is((select count(*)::int from public.resume_entries where title = 'Old job'), 0, 'replace removes old entries');
select is((select count(*)::int from public.resume_bullets where section = 'experience'), 1, 'blank bullets are skipped');
select is((select count(*)::int from public.resume_bullets where section = 'skills'), 1, 'skills become heading rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.application_profiles), 0, 'application profiles are private');
select is((select count(*)::int from public.resume_entries), 0, 'imported entries are private');

select * from finish();
rollback;
