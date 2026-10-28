-- Pro subscriptions (Stripe) and the free-plan limit.

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none',   -- Stripe subscription status, or 'none'
  price_lookup_key text,                 -- trackr_pro_monthly | trackr_pro_yearly
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions: owner can read"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
-- No write policies: only the Stripe webhook (service role) writes here.

-- Pro while the subscription is active or trialing, and also through a short grace
-- window when a renewal payment is retried (past_due).
create function public.is_pro(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
  );
$$;

revoke execute on function public.is_pro(uuid) from public, anon;
grant execute on function public.is_pro(uuid) to authenticated, service_role;

-- Free plan: up to 50 active applications (rejected and withdrawn ones don't count).
create function public.enforce_free_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active integer;
begin
  if new.status in ('rejected', 'withdrawn') or public.is_pro(new.user_id) then
    return new;
  end if;
  select count(*) into v_active
  from public.applications
  where user_id = new.user_id and status not in ('rejected', 'withdrawn');
  if v_active >= 50 then
    raise exception 'free_plan_limit: the free plan tracks up to 50 active applications'
      using errcode = 'P0001', hint = 'Upgrade to Pro, or move finished applications to Rejected or Withdrawn.';
  end if;
  return new;
end;
$$;

create trigger applications_free_plan_limit
  before insert on public.applications
  for each row execute function public.enforce_free_plan_limit();

-- Re-activating a rejected/withdrawn application also counts against the limit.
create trigger applications_free_plan_limit_reactivate
  before update of status on public.applications
  for each row
  when (old.status in ('rejected', 'withdrawn') and new.status not in ('rejected', 'withdrawn'))
  execute function public.enforce_free_plan_limit();

revoke execute on function public.enforce_free_plan_limit() from public, anon, authenticated;
