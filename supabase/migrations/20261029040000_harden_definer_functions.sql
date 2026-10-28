-- Tightens security-definer functions flagged by the Supabase security advisor.

-- 1. Users could call ai_record directly and log fake spend, tripping the app-wide daily
--    AI budget for everyone. Usage is now recorded only by the server (service role).
drop function public.ai_record(text, text, integer, integer, numeric);

create function public.ai_record(
  p_user uuid, p_feature text, p_model text, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage (user_id, feature, model, input_tokens, output_tokens, cost_usd)
  values (p_user, p_feature, p_model, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0),
          least(greatest(p_cost_usd, 0), 5));
$$;

revoke execute on function public.ai_record(uuid, text, text, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.ai_record(uuid, text, text, integer, integer, numeric) to service_role;

-- 2. is_pro(uuid) let any signed-in user check whether another account pays.
--    Users get am_i_pro(); is_pro(uuid) stays internal (triggers, ai_check, webhook).
revoke execute on function public.is_pro(uuid) from authenticated;

create function public.am_i_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_pro(auth.uid());
$$;

revoke execute on function public.am_i_pro() from public, anon;
grant execute on function public.am_i_pro() to authenticated;

-- 3. Only known rate-limit buckets, so callers can't fill the table with arbitrary names.
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
  if v_user is null or p_bucket not in ('job_url_lookup') or p_window_seconds < 60 then
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
