-- Create BSK holding ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bsk_holding_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bsk_holding_ledger_user_id ON public.bsk_holding_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_bsk_holding_ledger_created_at ON public.bsk_holding_ledger(created_at DESC);

-- Enable RLS on holding ledger
ALTER TABLE public.bsk_holding_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for holding ledger
CREATE POLICY "Users can view their own holding ledger"
  ON public.bsk_holding_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all holding ledgers"
  ON public.bsk_holding_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Drop and recreate the admin_adjust_user_balance function with subtype support
DROP FUNCTION IF EXISTS public.admin_adjust_user_balance(uuid, text, text, numeric, text);

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_target_user_id UUID,
  p_balance_type TEXT,
  p_operation TEXT,
  p_amount NUMERIC,
  p_reason TEXT,
  p_subtype TEXT DEFAULT 'withdrawable'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
  v_adjustment_amount NUMERIC;
  v_result JSONB;
BEGIN
  -- Security check: only admins can adjust balances
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Only admins can adjust user balances';
  END IF;

  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_operation NOT IN ('add', 'deduct') THEN
    RAISE EXCEPTION 'Operation must be add or deduct';
  END IF;

  -- Calculate adjustment amount
  v_adjustment_amount := CASE 
    WHEN p_operation = 'add' THEN p_amount
    WHEN p_operation = 'deduct' THEN -p_amount
  END;

  -- Handle BSK balance adjustments
  IF p_balance_type = 'bsk' THEN
    IF p_subtype = 'withdrawable' THEN
      -- Atomic update for withdrawable balance
      INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
      VALUES (p_target_user_id, v_adjustment_amount, GREATEST(0, v_adjustment_amount))
      ON CONFLICT (user_id) DO UPDATE SET
        withdrawable_balance = GREATEST(0, user_bsk_balances.withdrawable_balance + v_adjustment_amount),
        total_earned_withdrawable = CASE 
          WHEN v_adjustment_amount > 0 THEN user_bsk_balances.total_earned_withdrawable + v_adjustment_amount
          ELSE user_bsk_balances.total_earned_withdrawable
        END,
        updated_at = now()
      RETURNING withdrawable_balance INTO v_new_balance;

      -- Check for negative balance after deduction
      IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient withdrawable balance';
      END IF;

      -- Create ledger entry
      INSERT INTO public.bsk_withdrawable_ledger (user_id, type, amount, balance_after, description)
      VALUES (
        p_target_user_id,
        CASE WHEN p_operation = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
        v_adjustment_amount,
        v_new_balance,
        p_reason
      );

    ELSIF p_subtype = 'holding' THEN
      -- Atomic update for holding balance
      INSERT INTO public.user_bsk_balances (user_id, holding_balance, total_earned_holding)
      VALUES (p_target_user_id, v_adjustment_amount, GREATEST(0, v_adjustment_amount))
      ON CONFLICT (user_id) DO UPDATE SET
        holding_balance = GREATEST(0, user_bsk_balances.holding_balance + v_adjustment_amount),
        total_earned_holding = CASE 
          WHEN v_adjustment_amount > 0 THEN user_bsk_balances.total_earned_holding + v_adjustment_amount
          ELSE user_bsk_balances.total_earned_holding
        END,
        updated_at = now()
      RETURNING holding_balance INTO v_new_balance;

      -- Check for negative balance after deduction
      IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient holding balance';
      END IF;

      -- Create ledger entry
      INSERT INTO public.bsk_holding_ledger (user_id, type, amount, balance_after, description)
      VALUES (
        p_target_user_id,
        CASE WHEN p_operation = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
        v_adjustment_amount,
        v_new_balance,
        p_reason
      );
    ELSE
      RAISE EXCEPTION 'Invalid subtype for BSK balance. Must be withdrawable or holding';
    END IF;

  ELSIF p_balance_type = 'inr' THEN
    -- Atomic update for INR balance
    INSERT INTO public.user_inr_balances (user_id, balance)
    VALUES (p_target_user_id, v_adjustment_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = GREATEST(0, user_inr_balances.balance + v_adjustment_amount),
      updated_at = now()
    RETURNING balance INTO v_new_balance;

    -- Check for negative balance after deduction
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient INR balance';
    END IF;

    -- Create ledger entry
    INSERT INTO public.inr_ledger (user_id, type, amount, balance_after, description)
    VALUES (
      p_target_user_id,
      CASE WHEN p_operation = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
      v_adjustment_amount,
      v_new_balance,
      p_reason
    );
  ELSE
    RAISE EXCEPTION 'Invalid balance type. Must be bsk or inr';
  END IF;

  -- Create audit log
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, new_values)
  VALUES (
    auth.uid(),
    'balance_adjustment',
    'user_balances',
    p_target_user_id::text,
    jsonb_build_object(
      'balance_type', p_balance_type,
      'subtype', p_subtype,
      'operation', p_operation,
      'amount', p_amount,
      'new_balance', v_new_balance,
      'reason', p_reason
    )
  );

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'balance_type', p_balance_type,
    'subtype', p_subtype,
    'operation', p_operation,
    'amount', p_amount,
    'new_balance', v_new_balance
  );

  RETURN v_result;
END;
$$;