-- Admin-only RPC to adjust user balances safely
-- Creates a SECURITY DEFINER function that checks admin role and updates balances atomically

create or replace function public.admin_adjust_user_balance(
  p_target_user_id uuid,
  p_balance_type text,         -- 'bsk' | 'inr'
  p_operation text,            -- 'add' | 'deduct'
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  adj_amount numeric;
  new_balance numeric;
  current_balance numeric;
begin
  -- Ensure only admins can use this function
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Only admins can adjust balances';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  if p_operation not in ('add', 'deduct') then
    raise exception 'Invalid operation: %', p_operation;
  end if;

  adj_amount := case when p_operation = 'add' then p_amount else -p_amount end;

  if p_balance_type = 'bsk' then
    -- BSK withdrawable balance
    select withdrawable_balance into current_balance
    from public.user_bsk_balances
    where user_id = p_target_user_id;

    current_balance := coalesce(current_balance, 0);
    new_balance := current_balance + adj_amount;

    insert into public.user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    values (p_target_user_id, new_balance, greatest(new_balance, 0))
    on conflict (user_id) do update set
      withdrawable_balance = excluded.withdrawable_balance,
      total_earned_withdrawable = greatest(excluded.withdrawable_balance, 0),
      updated_at = now();

    -- Audit log
    insert into public.audit_logs (
      user_id, action, resource_type, resource_id, new_values, created_at
    ) values (
      p_target_user_id, 'balance_adjustment', 'user_bsk_balances', p_target_user_id::text,
      jsonb_build_object('delta', adj_amount, 'reason', p_reason, 'operator', auth.uid()), now()
    );

    return jsonb_build_object('success', true, 'new_balance', new_balance, 'balance_type', 'bsk');

  elsif p_balance_type = 'inr' then
    -- INR balance
    select balance into current_balance
    from public.user_inr_balances
    where user_id = p_target_user_id;

    current_balance := coalesce(current_balance, 0);
    new_balance := current_balance + adj_amount;

    insert into public.user_inr_balances (user_id, balance)
    values (p_target_user_id, new_balance)
    on conflict (user_id) do update set
      balance = excluded.balance;

    -- Audit log
    insert into public.audit_logs (
      user_id, action, resource_type, resource_id, new_values, created_at
    ) values (
      p_target_user_id, 'balance_adjustment', 'user_inr_balances', p_target_user_id::text,
      jsonb_build_object('delta', adj_amount, 'reason', p_reason, 'operator', auth.uid()), now()
    );

    return jsonb_build_object('success', true, 'new_balance', new_balance, 'balance_type', 'inr');
  else
    raise exception 'Invalid balance type: %', p_balance_type;
  end if;
end;
$$;

-- Optional: Comment for documentation
comment on function public.admin_adjust_user_balance(uuid, text, text, numeric, text)
  is 'Admin-only RPC to adjust user BSK/INR balances and write audit logs.';