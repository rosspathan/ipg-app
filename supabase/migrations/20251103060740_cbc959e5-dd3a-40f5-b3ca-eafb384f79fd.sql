-- Fix admin_adjust_user_balance to support BSK (withdrawable/holding) AND INR
-- Ensures atomic operations, proper locking, and ledger tracking

-- Create INR ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inr_balance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  operation TEXT NOT NULL CHECK (operation IN ('add', 'deduct')),
  type TEXT NOT NULL,
  reason TEXT,
  admin_id UUID,
  balance_before NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inr_balance_ledger_user_id_idx ON public.inr_balance_ledger(user_id, created_at DESC);

ALTER TABLE public.inr_balance_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_rw_inr_balance_ledger ON public.inr_balance_ledger;
CREATE POLICY admin_rw_inr_balance_ledger ON public.inr_balance_ledger
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ensure user_inr_balances has defaults
ALTER TABLE IF EXISTS public.user_inr_balances
  ALTER COLUMN balance SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS user_inr_balances_user_id_key ON public.user_inr_balances(user_id);

-- Drop old function and create new comprehensive version
DROP FUNCTION IF EXISTS public.admin_adjust_user_balance(uuid, text, text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_target_user_id UUID,
  p_balance_type TEXT,     -- 'bsk' or 'inr'
  p_operation TEXT,         -- 'add' or 'deduct'
  p_amount NUMERIC,
  p_reason TEXT,
  p_subtype TEXT DEFAULT 'withdrawable'  -- 'withdrawable' or 'holding' (only for BSK)
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_bsk_row public.user_bsk_balances%ROWTYPE;
  v_inr_balance NUMERIC;
  v_before NUMERIC;
  v_after NUMERIC;
BEGIN
  -- Authorization check
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'message', 'Amount must be positive');
  END IF;

  IF p_operation NOT IN ('add', 'deduct') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid operation');
  END IF;

  -- Handle BSK balance adjustments
  IF p_balance_type = 'bsk' THEN
    IF p_subtype NOT IN ('withdrawable', 'holding') THEN
      RETURN json_build_object('ok', false, 'message', 'Invalid BSK subtype');
    END IF;

    -- Ensure row exists and lock it
    INSERT INTO public.user_bsk_balances (user_id)
    VALUES (p_target_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_bsk_row
    FROM public.user_bsk_balances
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    -- Get current balance
    IF p_subtype = 'withdrawable' THEN
      v_before := COALESCE(v_bsk_row.withdrawable_balance, 0);
    ELSE
      v_before := COALESCE(v_bsk_row.holding_balance, 0);
    END IF;

    -- Calculate new balance
    IF p_operation = 'add' THEN
      v_after := v_before + p_amount;
    ELSE -- deduct
      v_after := GREATEST(0, v_before - p_amount);
    END IF;

    -- Update balance atomically
    IF p_subtype = 'withdrawable' THEN
      UPDATE public.user_bsk_balances
      SET 
        withdrawable_balance = v_after,
        total_earned_withdrawable = CASE WHEN p_operation = 'add' THEN COALESCE(total_earned_withdrawable, 0) + p_amount ELSE total_earned_withdrawable END,
        updated_at = now()
      WHERE user_id = p_target_user_id;

      -- Log to withdrawable ledger
      INSERT INTO public.bsk_withdrawable_ledger(user_id, amount, operation, type, reason, admin_id, balance_before, balance_after)
      VALUES (p_target_user_id, p_amount, p_operation, 'admin_adjust', p_reason, auth.uid(), v_before, v_after);
    ELSE
      UPDATE public.user_bsk_balances
      SET 
        holding_balance = v_after,
        total_earned_holding = CASE WHEN p_operation = 'add' THEN COALESCE(total_earned_holding, 0) + p_amount ELSE total_earned_holding END,
        updated_at = now()
      WHERE user_id = p_target_user_id;

      -- Log to holding ledger
      INSERT INTO public.bsk_holding_ledger(user_id, amount, operation, type, reason, admin_id, balance_before, balance_after)
      VALUES (p_target_user_id, p_amount, p_operation, 'admin_adjust', p_reason, auth.uid(), v_before, v_after);
    END IF;

    -- Get fresh data
    SELECT * INTO v_bsk_row FROM public.user_bsk_balances WHERE user_id = p_target_user_id;

    RETURN json_build_object(
      'ok', true,
      'balance_type', 'bsk',
      'subtype', p_subtype,
      'operation', p_operation,
      'amount', p_amount,
      'balances', json_build_object(
        'withdrawable_balance', COALESCE(v_bsk_row.withdrawable_balance, 0),
        'holding_balance', COALESCE(v_bsk_row.holding_balance, 0),
        'total_earned_withdrawable', COALESCE(v_bsk_row.total_earned_withdrawable, 0),
        'total_earned_holding', COALESCE(v_bsk_row.total_earned_holding, 0)
      )
    );

  -- Handle INR balance adjustments
  ELSIF p_balance_type = 'inr' THEN
    -- Ensure row exists and lock it
    INSERT INTO public.user_inr_balances (user_id, balance)
    VALUES (p_target_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT balance INTO v_before
    FROM public.user_inr_balances
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    v_before := COALESCE(v_before, 0);

    -- Calculate new balance
    IF p_operation = 'add' THEN
      v_after := v_before + p_amount;
    ELSE -- deduct
      v_after := GREATEST(0, v_before - p_amount);
    END IF;

    -- Update balance atomically
    UPDATE public.user_inr_balances
    SET 
      balance = v_after,
      updated_at = now()
    WHERE user_id = p_target_user_id;

    -- Log to INR ledger
    INSERT INTO public.inr_balance_ledger(user_id, amount, operation, type, reason, admin_id, balance_before, balance_after)
    VALUES (p_target_user_id, p_amount, p_operation, 'admin_adjust', p_reason, auth.uid(), v_before, v_after);

    RETURN json_build_object(
      'ok', true,
      'balance_type', 'inr',
      'operation', p_operation,
      'amount', p_amount,
      'balance', v_after
    );

  ELSE
    RETURN json_build_object('ok', false, 'message', 'Invalid balance type. Use "bsk" or "inr"');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(uuid, text, text, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_adjust_user_balance IS 'Admin-only RPC to adjust user BSK (withdrawable/holding) or INR balances atomically with full ledger tracking and row-level locking to prevent race conditions';