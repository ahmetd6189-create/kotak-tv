-- Account/demo data only. No IPTV credentials or video content.
create schema if not exists kotak_private;
revoke all on schema kotak_private from public, anon, authenticated;

create table kotak_private.trials (
  user_id uuid primary key,
  id uuid not null unique default gen_random_uuid(),
  started_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  constraint trial_exactly_24_hours check (expires_at = started_at + interval '24 hours')
);
create table kotak_private.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null check (platform in ('google','apple')),
  transaction_hash text not null,
  product_id text not null,
  expires_at timestamptz not null,
  verified_at timestamptz not null,
  status text not null check (status in ('active','expired','revoked')),
  unique(platform, transaction_hash)
);
create index subscriptions_user_expiry on kotak_private.subscriptions(user_id, expires_at desc);
create table kotak_private.request_limits (
  user_id uuid primary key,
  window_start timestamptz not null,
  requests integer not null check (requests > 0)
);
alter table kotak_private.trials enable row level security;
alter table kotak_private.subscriptions enable row level security;
alter table kotak_private.request_limits enable row level security;
revoke all on all tables in schema kotak_private from public, anon, authenticated;

create or replace function kotak_private.check_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null or not exists (
    select 1 from auth.users where id = p_user_id
      and coalesce(is_anonymous, false) = false
      and (email_confirmed_at is not null or phone_confirmed_at is not null)
  ) then raise exception 'VERIFIED_ACCOUNT_REQUIRED' using errcode = '28000'; end if;
end; $$;
create or replace function kotak_private.consume_request(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_window timestamptz := date_trunc('minute', statement_timestamp());
begin
  insert into kotak_private.request_limits(user_id, window_start, requests) values(p_user_id, v_window, 1)
  on conflict(user_id) do update set
    requests = case when kotak_private.request_limits.window_start = excluded.window_start then kotak_private.request_limits.requests + 1 else 1 end,
    window_start = excluded.window_start
  returning requests into v_count;
  if v_count > 30 then raise exception 'RATE_LIMITED'; end if;
end; $$;

create or replace function public.kotak_entitlement(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_trial kotak_private.trials; v_sub kotak_private.subscriptions; v_now timestamptz := statement_timestamp();
begin
  perform kotak_private.check_account(p_user_id);
  perform kotak_private.consume_request(p_user_id);
  select * into v_sub from kotak_private.subscriptions where user_id = p_user_id and status = 'active' and expires_at > v_now order by expires_at desc limit 1;
  if found then return jsonb_build_object('verified',true,'id',v_sub.id,'kind','subscription','expiresAt',floor(extract(epoch from v_sub.expires_at)*1000),'verifiedAt',floor(extract(epoch from v_sub.verified_at)*1000),'serverTime',floor(extract(epoch from v_now)*1000),'active',true); end if;
  select * into v_trial from kotak_private.trials where user_id = p_user_id;
  if not found then return null; end if;
  return jsonb_build_object('verified',true,'id',v_trial.id,'kind','trial','expiresAt',floor(extract(epoch from v_trial.expires_at)*1000),'verifiedAt',floor(extract(epoch from v_now)*1000),'serverTime',floor(extract(epoch from v_now)*1000),'active',v_trial.expires_at > v_now);
end; $$;

create or replace function public.kotak_start_trial(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := statement_timestamp();
begin
  perform kotak_private.check_account(p_user_id);
  insert into kotak_private.trials(user_id, started_at, expires_at) values(p_user_id, v_now, v_now + interval '24 hours') on conflict(user_id) do nothing;
  return public.kotak_entitlement(p_user_id);
end; $$;

-- Only the server may supply user IDs. Mobile clients cannot call these RPCs directly.
revoke all on function kotak_private.check_account(uuid) from public, anon, authenticated;
revoke all on function kotak_private.consume_request(uuid) from public, anon, authenticated;
revoke all on function public.kotak_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.kotak_start_trial(uuid) from public, anon, authenticated;
grant execute on function public.kotak_entitlement(uuid) to service_role;
grant execute on function public.kotak_start_trial(uuid) to service_role;
