-- One-time backfill: sync user_bsk_balances into unified_bsk_ledger
-- so that ledger-based debits (record_bsk_transaction) see correct balances.

DO $$
DECLARE
  r RECORD;
  backfilled_withdrawable_count INTEGER := 0;
  backfilled_holding_count INTEGER := 0;
BEGIN
  -- Iterate over all users who have any non-zero UI balance
  FOR r IN
    SELECT
      ub.user_id,
      COALESCE(ub.withdrawable_balance, 0) AS ui_withdrawable,
      COALESCE(ub.holding_balance, 0)      AS ui_holding
    FROM public.user_bsk_balances ub
    WHERE COALESCE(ub.withdrawable_balance, 0) <> 0
       OR COALESCE(ub.holding_balance, 0) <> 0
  LOOP
    -- Compute existing ledger balances from unified_bsk_ledger
    DECLARE
      ledger_withdrawable NUMERIC := 0;
      ledger_holding      NUMERIC := 0;
    BEGIN
      SELECT
        COALESCE(SUM(
          CASE
            WHEN balance_type = 'withdrawable' AND tx_type = 'credit' THEN amount_bsk
            WHEN balance_type = 'withdrawable' AND tx_type = 'debit'  THEN -amount_bsk
            ELSE 0
          END
        ), 0),
        COALESCE(SUM(
          CASE
            WHEN balance_type = 'holding' AND tx_type = 'credit' THEN amount_bsk
            WHEN balance_type = 'holding' AND tx_type = 'debit'  THEN -amount_bsk
            ELSE 0
          END
        ), 0)
      INTO
        ledger_withdrawable, ledger_holding
      FROM public.unified_bsk_ledger
      WHERE user_id = r.user_id;

      -- If UI withdrawable > ledger withdrawable, insert a backfill credit
      IF r.ui_withdrawable > ledger_withdrawable THEN
        INSERT INTO public.unified_bsk_ledger (
          user_id,
          idempotency_key,
          tx_type,
          tx_subtype,
          balance_type,
          amount_bsk,
          notes,
          meta_json,
          related_user_id,
          related_transaction_id,
          created_by
        )
        VALUES (
          r.user_id,
          'backfill_withdrawable_' || r.user_id::text,
          'credit',
          'balance_backfill',
          'withdrawable',
          r.ui_withdrawable - ledger_withdrawable,
          'Initial backfill from user_bsk_balances (withdrawable)',
          jsonb_build_object(
            'backfill', true,
            'balance_type', 'withdrawable',
            'original_ui_balance', r.ui_withdrawable,
            'original_ledger_balance', ledger_withdrawable,
            'backfilled_at', now()
          ),
          NULL,
          NULL,
          NULL
        );

        backfilled_withdrawable_count := backfilled_withdrawable_count + 1;
      END IF;

      -- If UI holding > ledger holding, insert a backfill credit
      IF r.ui_holding > ledger_holding THEN
        INSERT INTO public.unified_bsk_ledger (
          user_id,
          idempotency_key,
          tx_type,
          tx_subtype,
          balance_type,
          amount_bsk,
          notes,
          meta_json,
          related_user_id,
          related_transaction_id,
          created_by
        )
        VALUES (
          r.user_id,
          'backfill_holding_' || r.user_id::text,
          'credit',
          'balance_backfill',
          'holding',
          r.ui_holding - ledger_holding,
          'Initial backfill from user_bsk_balances (holding)',
          jsonb_build_object(
            'backfill', true,
            'balance_type', 'holding',
            'original_ui_balance', r.ui_holding,
            'original_ledger_balance', ledger_holding,
            'backfilled_at', now()
          ),
          NULL,
          NULL,
          NULL
        );

        backfilled_holding_count := backfilled_holding_count + 1;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'Backfilled withdrawable rows: %', backfilled_withdrawable_count;
  RAISE NOTICE 'Backfilled holding rows: %', backfilled_holding_count;
END $$;

-- Refresh the materialized view to reflect the new ledger entries
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_bsk_balances;

-- Sync mv_user_bsk_balances back to user_bsk_balances
UPDATE public.user_bsk_balances ub
SET
  withdrawable_balance       = COALESCE(mv.withdrawable_balance, 0),
  holding_balance            = COALESCE(mv.holding_balance, 0),
  total_earned_withdrawable  = COALESCE(mv.total_earned_withdrawable, 0),
  total_earned_holding       = COALESCE(mv.total_earned_holding, 0),
  updated_at                 = now()
FROM public.mv_user_bsk_balances mv
WHERE ub.user_id = mv.user_id
  AND (
    COALESCE(ub.withdrawable_balance, 0) <> COALESCE(mv.withdrawable_balance, 0)
    OR COALESCE(ub.holding_balance, 0)    <> COALESCE(mv.holding_balance, 0)
  );

DO $$
BEGIN
  RAISE NOTICE 'Unified ledger backfill complete: ledger, view, and user_bsk_balances are now in sync.';
END $$;