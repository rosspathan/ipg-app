
-- Update preview function: remove goodwill
CREATE OR REPLACE FUNCTION public.preview_bsk_global_unlock()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

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
    'total_remainder_bsk_burned', COALESCE(SUM(holding_balance - FLOOR(holding_balance / 3) * 3), 0),
    'total_withdrawable_current', COALESCE(SUM(withdrawable_balance), 0),
    'conversion_ratio', 3,
    'remainder_policy', 'burned',
    'note', 'Remainder BSK (not divisible by 3) will be burned/discarded. Only the divisible portion is converted at 3:1.'
  ) INTO result
  FROM public.user_bsk_balances;

  RETURN result;
END;
$$;

-- Update execute function: no goodwill, remainder is burned
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
  v_tradable_credit NUMERIC;
  v_remainder NUMERIC;
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

  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF p_confirmation_phrase != 'UNLOCK ALL LOCKED BSK PERMANENTLY' THEN
    RAISE EXCEPTION 'Invalid confirmation phrase. Type exactly: UNLOCK ALL LOCKED BSK PERMANENTLY';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'completed') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_executed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.bsk_global_unlock_events WHERE status = 'executing') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'execution_in_progress');
  END IF;

  INSERT INTO public.bsk_global_unlock_events (admin_user_id, confirmation_phrase, status)
  VALUES (v_admin_id, p_confirmation_phrase, 'executing')
  RETURNING id INTO v_event_id;

  FOR v_user IN
    SELECT user_id, holding_balance, withdrawable_balance
    FROM public.user_bsk_balances
    WHERE holding_balance > 0
    FOR UPDATE
  LOOP
    BEGIN
      v_total_locked := v_total_locked + v_user.holding_balance;

      -- Only convert divisible portion. Remainder is burned.
      v_tradable_credit := FLOOR(v_user.holding_balance / 3);
      v_remainder := v_user.holding_balance - (v_tradable_credit * 3);

      -- Zero out holding, credit only the 3:1 converted amount
      UPDATE public.user_bsk_balances
      SET holding_balance = 0,
          withdrawable_balance = withdrawable_balance + v_tradable_credit,
          updated_at = now()
      WHERE user_id = v_user.user_id;

      -- Ledger: holding deduction (full amount including burned remainder)
      INSERT INTO public.bsk_holding_ledger (
        user_id, tx_type, tx_subtype, amount_bsk, amount_inr, rate_snapshot,
        balance_before, balance_after, notes, reference_id
      ) VALUES (
        v_user.user_id, 'debit', 'global_sunset_unlock',
        v_user.holding_balance, 0, 0,
        v_user.holding_balance, 0,
        format('Locked BSK sunset: %s converted at 3:1, %s remainder burned', v_tradable_credit * 3, v_remainder),
        v_event_id::TEXT
      );

      -- Ledger: withdrawable credit (only converted amount, no remainder)
      INSERT INTO public.bsk_withdrawable_ledger (
        user_id, tx_type, tx_subtype, amount_bsk, amount_inr, rate_snapshot,
        balance_before, balance_after, notes, reference_id
      ) VALUES (
        v_user.user_id, 'credit', 'global_sunset_unlock',
        v_tradable_credit, 0, 0,
        v_user.withdrawable_balance, v_user.withdrawable_balance + v_tradable_credit,
        format('Locked BSK sunset: %s tradable BSK from 3:1 conversion', v_tradable_credit),
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
        v_user.holding_balance, v_user.holding_balance, v_tradable_credit,
        v_remainder, 'burned', 3,
        v_user.withdrawable_balance, v_user.withdrawable_balance + v_tradable_credit,
        v_user.holding_balance, 0, 'completed'
      );

      v_total_deducted := v_total_deducted + v_user.holding_balance;
      v_total_credited := v_total_credited + v_tradable_credit;
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
    'total_remainder_burned', v_total_remainder
  );
END;
$$;
