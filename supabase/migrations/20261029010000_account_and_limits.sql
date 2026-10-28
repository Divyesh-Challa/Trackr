-- Per-user rate limits and self-service account deletion.

-- Fixed-window counters, one row per (user, bucket, window).
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: only the functions below touch it.

-- Counts one use of `bucket` for the signed-in user and reports whether it's allowed.
-- Usage beyond the limit is not counted, so a blocked user isn't pushed further out.
create function public.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
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
  if v_user is null then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (user_id, bucket, window_start, count)
  values (v_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
    do update set count = r.count + 1 where r.count < p_limit
  returning count into v_count;

  -- Old windows are useless; trim this user's opportunistically.
  delete from public.rate_limits
  where user_id = v_user and bucket = p_bucket and window_start < v_window;

  return v_count is not null;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

-- Deletes the signed-in user. Everything they own cascades from auth.users
-- (profile, applications, tasks, contacts, notes, history, rate limits).
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
