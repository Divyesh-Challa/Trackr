-- AI tools (Pro): the user's own resume bullets, plus monthly quotas and a cost log.

create table public.resume_bullets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section text not null default 'experience'
    check (section in ('experience', 'project', 'education', 'skills', 'other')),
  heading text not null default '' check (char_length(heading) <= 200),  -- e.g. "Software Intern, Acme (Summer 2026)"
  content text not null check (char_length(content) between 1 and 600),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resume_bullets_user_idx on public.resume_bullets (user_id, section, position);

create trigger resume_bullets_set_updated_at
  before update on public.resume_bullets
  for each row execute function public.set_updated_at();

alter table public.resume_bullets enable row level security;

create policy "resume_bullets: owner can read" on public.resume_bullets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "resume_bullets: owner can insert" on public.resume_bullets for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "resume_bullets: owner can update" on public.resume_bullets for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resume_bullets: owner can delete" on public.resume_bullets for delete to authenticated
  using (user_id = (select auth.uid()));

-- One row per AI call, for quotas and cost tracking.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('tailor', 'cover_letter', 'interview_question', 'interview_feedback')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_user_month_idx on public.ai_usage (user_id, feature, created_at);
create index ai_usage_created_idx on public.ai_usage (created_at);

alter table public.ai_usage enable row level security;
create policy "ai_usage: owner can read" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));
-- Writes only through ai_record().

-- Checks whether the signed-in user may make one more call to `p_feature` right now.
-- Returns 'ok', 'not_pro', 'quota' (monthly limit reached) or 'budget' (the whole app's
-- AI spend today has hit p_daily_budget_usd, a circuit breaker against runaway cost).
create function public.ai_check(p_feature text, p_monthly_limit integer, p_daily_budget_usd numeric)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_pro(v_user) then
    return 'not_pro';
  end if;
  if (select count(*) from public.ai_usage
      where user_id = v_user and feature = p_feature
        and created_at >= date_trunc('month', now())) >= p_monthly_limit then
    return 'quota';
  end if;
  if (select coalesce(sum(cost_usd), 0) from public.ai_usage
      where created_at >= date_trunc('day', now())) >= p_daily_budget_usd then
    return 'budget';
  end if;
  return 'ok';
end;
$$;

create function public.ai_record(
  p_feature text, p_model text, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage (user_id, feature, model, input_tokens, output_tokens, cost_usd)
  select auth.uid(), p_feature, p_model, p_input_tokens, p_output_tokens, p_cost_usd
  where auth.uid() is not null;
$$;

-- This month's usage per feature, for the "N left" counters.
create function public.ai_usage_this_month()
returns table (feature text, used integer)
language sql
stable
security definer
set search_path = ''
as $$
  select feature, count(*)::integer from public.ai_usage
  where user_id = auth.uid() and created_at >= date_trunc('month', now())
  group by feature;
$$;

revoke execute on function public.ai_check(text, integer, numeric) from public, anon;
revoke execute on function public.ai_record(text, text, integer, integer, numeric) from public, anon;
revoke execute on function public.ai_usage_this_month() from public, anon;
grant execute on function public.ai_check(text, integer, numeric) to authenticated;
grant execute on function public.ai_record(text, text, integer, integer, numeric) to authenticated;
grant execute on function public.ai_usage_this_month() to authenticated;
