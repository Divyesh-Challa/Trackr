-- GitHub drops about half of its scheduled runs, so Postgres starts the ingest workflow instead.
-- Needs a Vault secret named github_ingest_token (fine-grained PAT on this repo, Actions: read and write).
-- Until it exists the job selects no rows and sends nothing. Check results in net._http_response (204 = started).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule('ingest-jobs', '17 */6 * * *', $$
  select net.http_post(
    url := 'https://api.github.com/repos/Divyesh-Challa/Trackr/actions/workflows/ingest.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.decrypted_secret,
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'trackr-supabase-cron',
      'X-GitHub-Api-Version', '2022-11-28'
    ),
    body := '{"ref":"main"}'::jsonb
  )
  from vault.decrypted_secrets s
  where s.name = 'github_ingest_token'
$$);
