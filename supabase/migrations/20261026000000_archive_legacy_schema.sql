-- Moves the retired Go gateway's tables out of `public` into a `legacy` schema before the
-- v1 schema is created, so names like `applications` are free and the old data is kept.
-- `legacy` is not exposed through the API (only `public` is) and no client role can use it.
-- On a fresh database (local, CI) none of these tables exist and this is a no-op.

create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'application_contacts', 'application_milestones', 'application_notes',
    'application_state_transitions', 'application_tasks', 'applications',
    'discovered_jobs', 'inbound_email_logs', 'resume_bullets', 'user_profiles'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I set schema legacy', t);
      execute format('revoke all on legacy.%I from public, anon, authenticated', t);
    end if;
  end loop;
end;
$$;
