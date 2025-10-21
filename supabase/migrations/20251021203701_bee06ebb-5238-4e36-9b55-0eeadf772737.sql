-- Prereqs
create extension if not exists pgcrypto;

-- user_bsk_balances safety
alter table if exists public.user_bsk_balances
  alter column withdrawable_balance set default 0,
  alter column holding_balance set default 0,
  alter column total_earned_withdrawable set default 0,
  alter column total_earned_holding set default 0;

create unique index if not exists user_bsk_balances_user_id_key on public.user_bsk_balances(user_id);

-- Ledgers (create if missing)
create table if not exists public.bsk_withdrawable_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null check (amount > 0),
  operation text not null check (operation in ('add','deduct')),
  type text,
  reason text,
  admin_id uuid,
  balance_before numeric not null default 0,
  balance_after numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bsk_holding_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null check (amount > 0),
  operation text not null check (operation in ('add','deduct')),
  type text,
  reason text,
  admin_id uuid,
  balance_before numeric not null default 0,
  balance_after numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Add missing 'type' column if tables already existed
alter table if exists public.bsk_withdrawable_ledger add column if not exists type text;
alter table if exists public.bsk_holding_ledger add column if not exists type text;

-- Indexes
create index if not exists bsk_withdrawable_ledger_user_id_idx on public.bsk_withdrawable_ledger(user_id, created_at desc);
create index if not exists bsk_holding_ledger_user_id_idx on public.bsk_holding_ledger(user_id, created_at desc);

-- RLS
alter table public.bsk_withdrawable_ledger enable row level security;
alter table public.bsk_holding_ledger enable row level security;
alter table public.user_bsk_balances enable row level security;

-- Policies: allow admin full access
drop policy if exists admin_rw_user_bsk_balances on public.user_bsk_balances;
create policy admin_rw_user_bsk_balances on public.user_bsk_balances
  for all
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

drop policy if exists admin_rw_bsk_withdrawable_ledger on public.bsk_withdrawable_ledger;
create policy admin_rw_bsk_withdrawable_ledger on public.bsk_withdrawable_ledger
  for all
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

drop policy if exists admin_rw_bsk_holding_ledger on public.bsk_holding_ledger;
create policy admin_rw_bsk_holding_ledger on public.bsk_holding_ledger
  for all
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

-- Drop all versions of old function
drop function if exists public.admin_adjust_user_balance cascade;

-- RPC: adjust BSK balance (atomic, with ledger, supports subtype)
create function public.admin_adjust_user_balance(
  p_target_user_id uuid,
  p_balance_type text,
  p_operation text,
  p_amount numeric,
  p_reason text,
  p_subtype text default 'withdrawable'
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
  v_row public.user_bsk_balances%rowtype;
  v_before numeric;
  v_after numeric;
  v_target_col text;
  v_earned_col text;
begin
  -- AuthZ
  select public.has_role(auth.uid(), 'admin') into v_is_admin;
  if not v_is_admin then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_balance_type <> 'bsk' then
    return json_build_object('ok', false, 'message', 'Only BSK supported');
  end if;

  if p_subtype not in ('withdrawable','holding') then
    return json_build_object('ok', false, 'message', 'Invalid subtype');
  end if;

  v_target_col := case when p_subtype = 'withdrawable' then 'withdrawable_balance' else 'holding_balance' end;
  v_earned_col := case when p_subtype = 'withdrawable' then 'total_earned_withdrawable' else 'total_earned_holding' end;

  -- Ensure row exists; lock row for update
  insert into public.user_bsk_balances (user_id)
  values (p_target_user_id)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.user_bsk_balances
  where user_id = p_target_user_id
  for update;

  v_before := (case v_target_col
                 when 'withdrawable_balance' then v_row.withdrawable_balance
                 else v_row.holding_balance
               end);

  if p_operation = 'add' then
    v_after := v_before + p_amount;
  elsif p_operation = 'deduct' then
    v_after := greatest(0, v_before - p_amount);
  else
    return json_build_object('ok', false, 'message', 'Invalid operation');
  end if;

  -- Update balances
  if v_target_col = 'withdrawable_balance' then
    update public.user_bsk_balances
      set withdrawable_balance = v_after,
          total_earned_withdrawable = case when p_operation='add' then total_earned_withdrawable + p_amount else total_earned_withdrawable end,
          updated_at = now()
      where user_id = p_target_user_id;
  else
    update public.user_bsk_balances
      set holding_balance = v_after,
          total_earned_holding = case when p_operation='add' then total_earned_holding + p_amount else total_earned_holding end,
          updated_at = now()
      where user_id = p_target_user_id;
  end if;

  -- Ledger
  if p_subtype = 'withdrawable' then
    insert into public.bsk_withdrawable_ledger(user_id, amount, operation, type, reason, admin_id, balance_before, balance_after)
    values (p_target_user_id, p_amount, p_operation, 'admin_adjust', p_reason, auth.uid(), v_before, v_after);
  else
    insert into public.bsk_holding_ledger(user_id, amount, operation, type, reason, admin_id, balance_before, balance_after)
    values (p_target_user_id, p_amount, p_operation, 'admin_adjust', p_reason, auth.uid(), v_before, v_after);
  end if;

  -- Return fresh row
  select * into v_row from public.user_bsk_balances where user_id = p_target_user_id;

  return json_build_object(
    'ok', true,
    'subtype', p_subtype,
    'operation', p_operation,
    'amount', p_amount,
    'balances', json_build_object(
      'withdrawable_balance', v_row.withdrawable_balance,
      'holding_balance', v_row.holding_balance,
      'total_earned_withdrawable', v_row.total_earned_withdrawable,
      'total_earned_holding', v_row.total_earned_holding
    )
  );
end;
$$;

grant execute on function public.admin_adjust_user_balance(uuid, text, text, numeric, text, text) to authenticated;