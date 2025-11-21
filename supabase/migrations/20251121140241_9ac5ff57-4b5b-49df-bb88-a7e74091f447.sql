-- Backfill BSK balances: sync user_bsk_balances to ledger-based materialized view
-- This ensures that all users with UI balances have matching ledger entries

-- Step 1: Insert synthetic ledger credits for users with missing or mismatched balances
DO $$
DECLARE
  user_record RECORD;
  backfilled_count INTEGER := 0;
BEGIN
  -- Find users whose UI balance doesn't match ledger view
  FOR user_record IN
    SELECT
      ub.user_id,
      COALESCE(ub.withdrawable_balance, 0) as ui_withdrawable,
      COALESCE(ub.holding_balance, 0) as ui_holding,
      COALESCE(mv.withdrawable_balance, 0) as ledger_withdrawable,
      COALESCE(mv.holding_balance, 0) as ledger_holding
    FROM public.user_bsk_balances ub
    LEFT JOIN public.mv_user_bsk_balances mv ON mv.user_id = ub.user_id
    WHERE
      mv.user_id IS NULL -- no ledger row at all
      OR COALESCE(mv.withdrawable_balance, 0) <> COALESCE(ub.withdrawable_balance, 0)
      OR COALESCE(mv.holding_balance, 0) <> COALESCE(ub.holding_balance, 0)
  LOOP
    -- Insert withdrawable balance backfill if needed
    IF user_record.ui_withdrawable > user_record.ledger_withdrawable THEN
      INSERT INTO public.bonus_ledger (
        user_id,
        type,
        amount_bsk,
        asset,
        meta_json
      ) VALUES (
        user_record.user_id,
        'balance_backfill',
        user_record.ui_withdrawable - user_record.ledger_withdrawable,
        'BSK',
        jsonb_build_object(
          'backfill', true,
          'reason', 'Initial sync from user_bsk_balances',
          'balance_type', 'withdrawable',
          'original_ui_balance', user_record.ui_withdrawable,
          'original_ledger_balance', user_record.ledger_withdrawable,
          'backfilled_at', now()
        )
      );
      backfilled_count := backfilled_count + 1;
    END IF;

    -- Insert holding balance backfill if needed
    IF user_record.ui_holding > user_record.ledger_holding THEN
      INSERT INTO public.bsk_holding_ledger (
        user_id,
        tx_type,
        amount_bsk,
        amount_inr,
        rate_snapshot,
        balance_before,
        balance_after,
        notes,
        metadata
      ) VALUES (
        user_record.user_id,
        'backfill_credit',
        user_record.ui_holding - user_record.ledger_holding,
        0,
        1,
        user_record.ledger_holding,
        user_record.ui_holding,
        'Initial sync from user_bsk_balances',
        jsonb_build_object(
          'backfill', true,
          'balance_type', 'holding',
          'original_ui_balance', user_record.ui_holding,
          'original_ledger_balance', user_record.ledger_holding,
          'backfilled_at', now()
        )
      );
      backfilled_count := backfilled_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfilled % balance discrepancies', backfilled_count;
END $$;

-- Step 2: Refresh materialized view to include new ledger entries
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_bsk_balances;

-- Step 3: Sync materialized view back to user_bsk_balances table
UPDATE public.user_bsk_balances ub
SET
  withdrawable_balance = COALESCE(mv.withdrawable_balance, 0),
  holding_balance = COALESCE(mv.holding_balance, 0),
  total_earned_withdrawable = COALESCE(mv.total_earned_withdrawable, 0),
  total_earned_holding = COALESCE(mv.total_earned_holding, 0),
  updated_at = now()
FROM public.mv_user_bsk_balances mv
WHERE ub.user_id = mv.user_id
  AND (
    COALESCE(ub.withdrawable_balance, 0) <> COALESCE(mv.withdrawable_balance, 0)
    OR COALESCE(ub.holding_balance, 0) <> COALESCE(mv.holding_balance, 0)
  );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Balance backfill complete. All users with UI balances now have matching ledger entries.';
END $$;