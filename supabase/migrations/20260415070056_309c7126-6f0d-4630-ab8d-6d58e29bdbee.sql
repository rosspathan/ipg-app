CREATE TABLE IF NOT EXISTS public.bsk_balance_integrity_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  repaired_by UUID,
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  old_withdrawable_balance NUMERIC NOT NULL DEFAULT 0,
  old_holding_balance NUMERIC NOT NULL DEFAULT 0,
  new_withdrawable_balance NUMERIC NOT NULL DEFAULT 0,
  new_holding_balance NUMERIC NOT NULL DEFAULT 0,
  ledger_withdrawable_balance NUMERIC NOT NULL DEFAULT 0,
  ledger_holding_balance NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  likely_cause TEXT,
  diagnostic_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bsk_balance_integrity_repairs_status_check CHECK (status IN ('completed', 'blocked', 'pending_review'))
);

ALTER TABLE public.bsk_balance_integrity_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view BSK integrity repairs"
ON public.bsk_balance_integrity_repairs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create BSK integrity repairs"
ON public.bsk_balance_integrity_repairs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update BSK integrity repairs"
ON public.bsk_balance_integrity_repairs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.user_bsk_balances
  ALTER COLUMN withdrawable_balance SET DEFAULT 0,
  ALTER COLUMN holding_balance SET DEFAULT 0,
  ALTER COLUMN total_earned_withdrawable SET DEFAULT 0,
  ALTER COLUMN total_earned_holding SET DEFAULT 0;

UPDATE public.user_bsk_balances
SET withdrawable_balance = COALESCE(withdrawable_balance, 0),
    holding_balance = COALESCE(holding_balance, 0),
    total_earned_withdrawable = COALESCE(total_earned_withdrawable, 0),
    total_earned_holding = COALESCE(total_earned_holding, 0)
WHERE withdrawable_balance IS NULL
   OR holding_balance IS NULL
   OR total_earned_withdrawable IS NULL
   OR total_earned_holding IS NULL;

ALTER TABLE public.user_bsk_balances
  ALTER COLUMN withdrawable_balance SET NOT NULL,
  ALTER COLUMN holding_balance SET NOT NULL,
  ALTER COLUMN total_earned_withdrawable SET NOT NULL,
  ALTER COLUMN total_earned_holding SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bsk_balances_user_id_unique
ON public.user_bsk_balances(user_id);

CREATE OR REPLACE FUNCTION public.normalize_user_bsk_balance_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.withdrawable_balance := COALESCE(NEW.withdrawable_balance, 0);
  NEW.holding_balance := COALESCE(NEW.holding_balance, 0);
  NEW.total_earned_withdrawable := COALESCE(NEW.total_earned_withdrawable, 0);
  NEW.total_earned_holding := COALESCE(NEW.total_earned_holding, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_user_bsk_balance_row ON public.user_bsk_balances;
CREATE TRIGGER trg_normalize_user_bsk_balance_row
BEFORE INSERT OR UPDATE ON public.user_bsk_balances
FOR EACH ROW
EXECUTE FUNCTION public.normalize_user_bsk_balance_row();

CREATE OR REPLACE FUNCTION public.validate_user_bsk_balance_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.withdrawable_balance < 0 THEN
    RAISE EXCEPTION 'Invalid withdrawable_balance for user %: %', NEW.user_id, NEW.withdrawable_balance;
  END IF;

  IF NEW.holding_balance < 0 THEN
    RAISE EXCEPTION 'Invalid holding_balance for user %: %', NEW.user_id, NEW.holding_balance;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_bsk_balance_row ON public.user_bsk_balances;
CREATE TRIGGER trg_validate_user_bsk_balance_row
BEFORE INSERT OR UPDATE ON public.user_bsk_balances
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_bsk_balance_row();

CREATE OR REPLACE FUNCTION public.get_bsk_balance_integrity_report(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  email TEXT,
  current_withdrawable_balance NUMERIC,
  current_holding_balance NUMERIC,
  ledger_withdrawable_balance NUMERIC,
  ledger_holding_balance NUMERIC,
  withdrawable_diff NUMERIC,
  holding_diff NUMERIC,
  missing_balance_row BOOLEAN,
  has_negative_withdrawable BOOLEAN,
  has_negative_holding BOOLEAN,
  severity TEXT,
  likely_cause TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH withdrawable_ledger AS (
  SELECT
    user_id,
    COALESCE(SUM(
      CASE
        WHEN tx_type = 'debit' THEN -ABS(amount_bsk)
        WHEN tx_type = 'credit' THEN ABS(amount_bsk)
        ELSE amount_bsk
      END
    ), 0) AS ledger_withdrawable_balance
  FROM public.unified_bsk_ledger
  WHERE balance_type = 'withdrawable'
  GROUP BY user_id
),
holding_ledger AS (
  SELECT
    user_id,
    COALESCE(SUM(
      CASE
        WHEN tx_type = 'debit' THEN -ABS(amount_bsk)
        WHEN tx_type = 'credit' THEN ABS(amount_bsk)
        ELSE amount_bsk
      END
    ), 0) AS ledger_holding_balance
  FROM public.bsk_holding_ledger
  GROUP BY user_id
),
base AS (
  SELECT
    p.user_id,
    p.username,
    p.full_name,
    p.email,
    b.withdrawable_balance AS current_withdrawable_balance,
    b.holding_balance AS current_holding_balance,
    COALESCE(w.ledger_withdrawable_balance, 0) AS ledger_withdrawable_balance,
    COALESCE(h.ledger_holding_balance, 0) AS ledger_holding_balance,
    (b.user_id IS NULL) AS missing_balance_row
  FROM public.profiles p
  LEFT JOIN public.user_bsk_balances b ON b.user_id = p.user_id
  LEFT JOIN withdrawable_ledger w ON w.user_id = p.user_id
  LEFT JOIN holding_ledger h ON h.user_id = p.user_id
  WHERE p_user_id IS NULL OR p.user_id = p_user_id
)
SELECT
  user_id,
  username,
  full_name,
  email,
  COALESCE(current_withdrawable_balance, 0) AS current_withdrawable_balance,
  COALESCE(current_holding_balance, 0) AS current_holding_balance,
  ledger_withdrawable_balance,
  ledger_holding_balance,
  ROUND((COALESCE(current_withdrawable_balance, 0) - ledger_withdrawable_balance)::numeric, 8) AS withdrawable_diff,
  ROUND((COALESCE(current_holding_balance, 0) - ledger_holding_balance)::numeric, 8) AS holding_diff,
  missing_balance_row,
  (COALESCE(current_withdrawable_balance, 0) < 0) AS has_negative_withdrawable,
  (COALESCE(current_holding_balance, 0) < 0) AS has_negative_holding,
  CASE
    WHEN missing_balance_row THEN 'high'
    WHEN COALESCE(current_withdrawable_balance, 0) < 0 OR COALESCE(current_holding_balance, 0) < 0 THEN 'critical'
    WHEN ROUND((COALESCE(current_withdrawable_balance, 0) - ledger_withdrawable_balance)::numeric, 8) <> 0
      OR ROUND((COALESCE(current_holding_balance, 0) - ledger_holding_balance)::numeric, 8) <> 0 THEN 'medium'
    ELSE 'ok'
  END AS severity,
  CASE
    WHEN missing_balance_row THEN 'missing_balance_row'
    WHEN COALESCE(current_holding_balance, 0) = 0 AND ledger_holding_balance > 0 THEN 'legacy_holding_logic_or_global_unlock_review'
    WHEN COALESCE(current_withdrawable_balance, 0) <> ledger_withdrawable_balance THEN 'withdrawable_ledger_mismatch'
    WHEN COALESCE(current_holding_balance, 0) <> ledger_holding_balance THEN 'holding_ledger_mismatch'
    ELSE 'aligned'
  END AS likely_cause
FROM base;
$$;

CREATE OR REPLACE FUNCTION public.repair_bsk_balance_from_ledger(
  p_target_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT := auth.role();
  v_existing public.user_bsk_balances%ROWTYPE;
  v_report RECORD;
  v_status TEXT := 'completed';
  v_new_total_earned_withdrawable NUMERIC := 0;
  v_new_total_earned_holding NUMERIC := 0;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required';
  END IF;

  IF COALESCE(v_role, '') <> 'service_role' AND NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_report
  FROM public.get_bsk_balance_integrity_report(p_target_user_id)
  LIMIT 1;

  IF v_report.user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in integrity report';
  END IF;

  IF v_report.ledger_withdrawable_balance < 0 OR v_report.ledger_holding_balance < 0 THEN
    v_status := 'blocked';
  END IF;

  SELECT * INTO v_existing
  FROM public.user_bsk_balances
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF v_status = 'completed' THEN
    v_new_total_earned_withdrawable := GREATEST(COALESCE(v_existing.total_earned_withdrawable, 0), COALESCE(v_report.ledger_withdrawable_balance, 0));
    v_new_total_earned_holding := GREATEST(COALESCE(v_existing.total_earned_holding, 0), COALESCE(v_report.ledger_holding_balance, 0));

    INSERT INTO public.user_bsk_balances (
      user_id,
      withdrawable_balance,
      holding_balance,
      total_earned_withdrawable,
      total_earned_holding
    ) VALUES (
      p_target_user_id,
      COALESCE(v_report.ledger_withdrawable_balance, 0),
      COALESCE(v_report.ledger_holding_balance, 0),
      v_new_total_earned_withdrawable,
      v_new_total_earned_holding
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      withdrawable_balance = EXCLUDED.withdrawable_balance,
      holding_balance = EXCLUDED.holding_balance,
      total_earned_withdrawable = GREATEST(public.user_bsk_balances.total_earned_withdrawable, EXCLUDED.total_earned_withdrawable),
      total_earned_holding = GREATEST(public.user_bsk_balances.total_earned_holding, EXCLUDED.total_earned_holding),
      updated_at = now();
  END IF;

  INSERT INTO public.bsk_balance_integrity_repairs (
    target_user_id,
    repaired_by,
    issue_type,
    status,
    old_withdrawable_balance,
    old_holding_balance,
    new_withdrawable_balance,
    new_holding_balance,
    ledger_withdrawable_balance,
    ledger_holding_balance,
    reason,
    likely_cause,
    diagnostic_snapshot
  ) VALUES (
    p_target_user_id,
    v_actor,
    CASE
      WHEN v_report.missing_balance_row THEN 'missing_balance_row'
      WHEN v_report.has_negative_withdrawable THEN 'negative_withdrawable_balance'
      WHEN v_report.has_negative_holding THEN 'negative_holding_balance'
      WHEN v_report.withdrawable_diff <> 0 OR v_report.holding_diff <> 0 THEN 'ledger_mismatch'
      ELSE 'manual_review'
    END,
    v_status,
    COALESCE(v_existing.withdrawable_balance, 0),
    COALESCE(v_existing.holding_balance, 0),
    CASE WHEN v_status = 'completed' THEN COALESCE(v_report.ledger_withdrawable_balance, 0) ELSE COALESCE(v_existing.withdrawable_balance, 0) END,
    CASE WHEN v_status = 'completed' THEN COALESCE(v_report.ledger_holding_balance, 0) ELSE COALESCE(v_existing.holding_balance, 0) END,
    COALESCE(v_report.ledger_withdrawable_balance, 0),
    COALESCE(v_report.ledger_holding_balance, 0),
    p_reason,
    v_report.likely_cause,
    jsonb_build_object(
      'report', row_to_json(v_report),
      'existing_row_present', (v_existing.user_id IS NOT NULL)
    )
  );

  RETURN jsonb_build_object(
    'success', v_status = 'completed',
    'status', v_status,
    'user_id', p_target_user_id,
    'ledger_withdrawable_balance', COALESCE(v_report.ledger_withdrawable_balance, 0),
    'ledger_holding_balance', COALESCE(v_report.ledger_holding_balance, 0),
    'likely_cause', v_report.likely_cause
  );
END;
$$;