
-- ============================================================
-- BSK LOCKED BALANCE GLOBAL SUNSET SYSTEM
-- ============================================================

-- 1. Global unlock events table (one row per execution)
CREATE TABLE public.bsk_global_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  conversion_ratio NUMERIC NOT NULL DEFAULT 3,
  confirmation_phrase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'executing' CHECK (status IN ('executing', 'completed', 'failed', 'partial')),
  total_users_processed INT NOT NULL DEFAULT 0,
  total_users_skipped INT NOT NULL DEFAULT 0,
  total_users_failed INT NOT NULL DEFAULT 0,
  total_locked_bsk_before NUMERIC NOT NULL DEFAULT 0,
  total_locked_bsk_deducted NUMERIC NOT NULL DEFAULT 0,
  total_tradable_bsk_credited NUMERIC NOT NULL DEFAULT 0,
  total_remainder_bsk NUMERIC NOT NULL DEFAULT 0,
  error_summary JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bsk_global_unlock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view global unlock events"
  ON public.bsk_global_unlock_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert global unlock events"
  ON public.bsk_global_unlock_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update global unlock events"
  ON public.bsk_global_unlock_events FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Per-user unlock records (immutable audit trail)
CREATE TABLE public.bsk_unlock_user_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.bsk_global_unlock_events(id),
  user_id UUID NOT NULL,
  locked_bsk_before NUMERIC NOT NULL,
  locked_bsk_deducted NUMERIC NOT NULL,
  tradable_bsk_credited NUMERIC NOT NULL,
  remainder_bsk NUMERIC NOT NULL DEFAULT 0,
  remainder_treatment TEXT NOT NULL DEFAULT 'goodwill_credit',
  conversion_ratio NUMERIC NOT NULL,
  withdrawable_before NUMERIC NOT NULL,
  withdrawable_after NUMERIC NOT NULL,
  holding_before NUMERIC NOT NULL,
  holding_after NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped')),
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_unlock_user_records_event ON public.bsk_unlock_user_records(event_id);
CREATE INDEX idx_unlock_user_records_user ON public.bsk_unlock_user_records(user_id);

ALTER TABLE public.bsk_unlock_user_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all unlock records"
  ON public.bsk_unlock_user_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own unlock records"
  ON public.bsk_unlock_user_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert unlock records"
  ON public.bsk_unlock_user_records FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admin can insert unlock records"
  ON public.bsk_unlock_user_records FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Preview function (read-only, no side effects)
CREATE OR REPLACE FUNCTION public.preview_bsk_global_unlock()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Check if already sunset
  IF EXISTS (SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'completed') THEN
    RETURN jsonb_build_object(
      'can_execute', false,
      'reason', 'already_executed',
      'message', 'Locked BSK has already been sunset. No further action possible.'
    );
  END IF;

  SELECT jsonb_build_object(
    'can_execute', true,
    'total_users_with_locked', COUNT(CASE WHEN holding_balance > 0 THEN 1 END),
    'total_users_zero', COUNT(CASE WHEN holding_balance = 0 THEN 1 END),
    'total_locked_bsk', COALESCE(SUM(holding_balance), 0),
    'total_tradable_bsk_to_credit', COALESCE(SUM(FLOOR(holding_balance / 3)), 0),
    'total_remainder_bsk', COALESCE(SUM(holding_balance - FLOOR(holding_balance / 3) * 3), 0),
    'total_goodwill_from_remainder', COALESCE(SUM(holding_balance - FLOOR(holding_balance / 3) * 3), 0),
    'total_withdrawable_current', COALESCE(SUM(withdrawable_balance), 0),
    'conversion_ratio', 3,
    'remainder_policy', 'goodwill_credit_to_withdrawable',
    'note', 'Remainder BSK (not divisible by 3) will be credited 1:1 to withdrawable as goodwill since locked BSK is being permanently retired.'
  ) INTO result
  FROM public.user_bsk_balances;

  RETURN result;
END;
$$;

-- 4. Check if sunset has been executed
CREATE OR REPLACE FUNCTION public.is_bsk_holding_sunset()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'completed'
  );
$$;

-- 5. Execute global unlock (atomic, idempotent via status check)
CREATE OR REPLACE FUNCTION public.execute_bsk_global_unlock(
  p_confirmation_phrase TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_admin_id UUID;
  v_user RECORD;
  v_divisible_bsk NUMERIC;
  v_tradable_credit NUMERIC;
  v_remainder NUMERIC;
  v_total_goodwill NUMERIC;
  v_success_count INT := 0;
  v_fail_count INT := 0;
  v_skip_count INT := 0;
  v_total_locked NUMERIC := 0;
  v_total_deducted NUMERIC := 0;
  v_total_credited NUMERIC := 0;
  v_total_remainder NUMERIC := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  v_admin_id := auth.uid();

  -- Admin check
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Confirmation phrase check
  IF p_confirmation_phrase != 'UNLOCK ALL LOCKED BSK PERMANENTLY' THEN
    RAISE EXCEPTION 'Invalid confirmation phrase. Type exactly: UNLOCK ALL LOCKED BSK PERMANENTLY';
  END IF;

  -- Idempotency: block if already completed
  IF EXISTS (SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'completed') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_executed');
  END IF;

  -- Block if one is currently executing
  IF EXISTS (SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'executing') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'execution_in_progress');
  END IF;

  -- Create event record
  INSERT INTO public.bsk_global_unlock_events (admin_user_id, confirmation_phrase, status)
  VALUES (v_admin_id, p_confirmation_phrase, 'executing')
  RETURNING id INTO v_event_id;

  -- Process each user with locked BSK
  FOR v_user IN
    SELECT user_id, holding_balance, withdrawable_balance
    FROM public.user_bsk_balances
    WHERE holding_balance > 0
    FOR UPDATE
  LOOP
    BEGIN
      v_total_locked := v_total_locked + v_user.holding_balance;

      -- Calculate conversion: floor(holding/3) = tradable from ratio
      v_divisible_bsk := FLOOR(v_user.holding_balance / 3) * 3;
      v_tradable_credit := FLOOR(v_user.holding_balance / 3);
      v_remainder := v_user.holding_balance - v_divisible_bsk;

      -- Goodwill: remainder credited 1:1 to withdrawable
      v_total_goodwill := v_tradable_credit + v_remainder;

      -- Update balance: zero out holding, credit withdrawable
      UPDATE public.user_bsk_balances
      SET holding_balance = 0,
          withdrawable_balance = withdrawable_balance + v_total_goodwill,
          updated_at = now()
      WHERE user_id = v_user.user_id;

      -- Ledger entry for holding deduction
      INSERT INTO public.bsk_holding_ledger (
        user_id, tx_type, tx_subtype, amount_bsk, amount_inr, rate_snapshot,
        balance_before, balance_after, notes, reference_id
      ) VALUES (
        v_user.user_id, 'debit', 'global_sunset_unlock',
        v_user.holding_balance, 0, 0,
        v_user.holding_balance, 0,
        'Locked BSK global sunset: full balance converted at 3:1 ratio + remainder goodwill',
        v_event_id::TEXT
      );

      -- Ledger entry for withdrawable credit
      INSERT INTO public.bsk_withdrawable_ledger (
        user_id, tx_type, tx_subtype, amount_bsk, amount_inr, rate_snapshot,
        balance_before, balance_after, notes, reference_id
      ) VALUES (
        v_user.user_id, 'credit', 'global_sunset_unlock',
        v_total_goodwill, 0, 0,
        v_user.withdrawable_balance, v_user.withdrawable_balance + v_total_goodwill,
        format('Locked BSK sunset: %s BSK from 3:1 conversion + %s BSK remainder goodwill', v_tradable_credit, v_remainder),
        v_event_id::TEXT
      );

      -- Audit record
      INSERT INTO public.bsk_unlock_user_records (
        event_id, user_id,
        locked_bsk_before, locked_bsk_deducted, tradable_bsk_credited,
        remainder_bsk, remainder_treatment, conversion_ratio,
        withdrawable_before, withdrawable_after,
        holding_before, holding_after, status
      ) VALUES (
        v_event_id, v_user.user_id,
        v_user.holding_balance, v_user.holding_balance, v_total_goodwill,
        v_remainder, 'goodwill_credit', 3,
        v_user.withdrawable_balance, v_user.withdrawable_balance + v_total_goodwill,
        v_user.holding_balance, 0, 'completed'
      );

      v_total_deducted := v_total_deducted + v_user.holding_balance;
      v_total_credited := v_total_credited + v_total_goodwill;
      v_total_remainder := v_total_remainder + v_remainder;
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_user.user_id,
        'error', SQLERRM
      );

      INSERT INTO public.bsk_unlock_user_records (
        event_id, user_id,
        locked_bsk_before, locked_bsk_deducted, tradable_bsk_credited,
        remainder_bsk, conversion_ratio,
        withdrawable_before, withdrawable_after,
        holding_before, holding_after, status, error_details
      ) VALUES (
        v_event_id, v_user.user_id,
        v_user.holding_balance, 0, 0,
        0, 3,
        v_user.withdrawable_balance, v_user.withdrawable_balance,
        v_user.holding_balance, v_user.holding_balance, 'failed', SQLERRM
      );
    END;
  END LOOP;

  -- Update event with totals
  UPDATE public.bsk_global_unlock_events
  SET status = CASE WHEN v_fail_count = 0 THEN 'completed' WHEN v_success_count = 0 THEN 'failed' ELSE 'partial' END,
      total_users_processed = v_success_count,
      total_users_failed = v_fail_count,
      total_users_skipped = v_skip_count,
      total_locked_bsk_before = v_total_locked,
      total_locked_bsk_deducted = v_total_deducted,
      total_tradable_bsk_credited = v_total_credited,
      total_remainder_bsk = v_total_remainder,
      error_summary = CASE WHEN jsonb_array_length(v_errors) > 0 THEN v_errors ELSE NULL END,
      completed_at = now()
  WHERE id = v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'status', CASE WHEN v_fail_count = 0 THEN 'completed' WHEN v_success_count = 0 THEN 'failed' ELSE 'partial' END,
    'users_processed', v_success_count,
    'users_failed', v_fail_count,
    'total_locked_deducted', v_total_deducted,
    'total_tradable_credited', v_total_credited,
    'total_remainder_goodwill', v_total_remainder
  );
END;
$$;

-- 6. Trigger: prevent any future holding_balance increase after sunset
CREATE OR REPLACE FUNCTION public.block_holding_credit_after_sunset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.holding_balance > OLD.holding_balance THEN
    IF public.is_bsk_holding_sunset() THEN
      RAISE EXCEPTION 'Locked BSK has been permanently sunset. No new holding credits allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_holding_credit_after_sunset
  BEFORE UPDATE ON public.user_bsk_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.block_holding_credit_after_sunset();
