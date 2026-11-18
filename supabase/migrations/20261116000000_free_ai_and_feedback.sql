-- Early access: AI tools can be opened to free accounts, two new AI features, and a feedback inbox.

alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check check (
  feature in ('tailor', 'cover_letter', 'interview_question', 'interview_feedback', 'job_match', 'job_question')
);

-- Same checks as before; p_require_pro = false skips the Pro gate while AI runs on a free
-- model tier. The server decides that (env flag), and passes each plan's own monthly limit.
drop function public.ai_check(text, integer, numeric);

create function public.ai_check(
  p_feature text, p_monthly_limit integer, p_daily_budget_usd numeric, p_require_pro boolean default true
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or (p_require_pro and not public.is_pro(v_user)) then
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

revoke execute on function public.ai_check(text, integer, numeric, boolean) from public, anon;
grant execute on function public.ai_check(text, integer, numeric, boolean) to authenticated;

-- Feedback from signed-in users. Read it in the Supabase dashboard.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'feature', 'job_data', 'design', 'other')),
  message text not null check (char_length(message) between 5 and 4000),
  wants_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create index feedback_user_idx on public.feedback (user_id, created_at);

alter table public.feedback enable row level security;

create policy "feedback: owner can read" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));
create policy "feedback: owner can insert" on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));

-- At most 10 a day per account, so one user can't flood the inbox. A trigger, because a
-- policy can't count rows of its own table.
create function public.feedback_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'feedback_daily_limit';
  end if;
  return new;
end;
$$;

revoke execute on function public.feedback_daily_cap() from public, anon, authenticated;

create trigger feedback_daily_cap
  before insert on public.feedback
  for each row execute function public.feedback_daily_cap();
