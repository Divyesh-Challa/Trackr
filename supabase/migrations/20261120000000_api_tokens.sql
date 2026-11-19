-- Personal API tokens for the browser extension (and later the MCP server). Only the sha-256
-- of a token is stored; the token itself is shown to the user once, when it's created.

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index api_tokens_user_idx on public.api_tokens (user_id, created_at desc);

alter table public.api_tokens enable row level security;

create policy "api_tokens: owner can read" on public.api_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "api_tokens: owner can insert" on public.api_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "api_tokens: owner can delete" on public.api_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- The latest apply kit for an application ({"answers": [...], "cover_letter": text}), so the
-- extension can fill the posting with what the user reviewed in Trackr.
alter table public.applications add column kit jsonb
  check (kit is null or (jsonb_typeof(kit) = 'object' and pg_column_size(kit) <= 200000));

-- 'api' joins the known rate-limit buckets.
create or replace function public.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz;
  v_count integer;
begin
  if v_user is null or p_bucket not in ('job_url_lookup', 'api') or p_window_seconds < 60 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (user_id, bucket, window_start, count)
  values (v_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
    do update set count = r.count + 1 where r.count < p_limit
  returning count into v_count;

  delete from public.rate_limits
  where user_id = v_user and bucket = p_bucket and window_start < v_window;

  return v_count is not null;
end;
$$;

-- Resolves a token hash to its owner, stamps last_used_at and spends one 'api' request.
-- No row = unknown token. Server-only: the API routes call it with the service role.
create function public.api_authenticate(p_token_hash text)
returns table (uid uuid, allowed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  update public.api_tokens t set last_used_at = now() where t.token_hash = p_token_hash returning t.user_id into v_user;
  if v_user is null then
    return;
  end if;
  -- consume_rate_limit reads auth.uid(); act as the token's owner for this transaction only.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  return query select v_user, public.consume_rate_limit('api', 300, 3600);
end;
$$;

revoke execute on function public.api_authenticate(text) from public, anon, authenticated;
grant execute on function public.api_authenticate(text) to service_role;
