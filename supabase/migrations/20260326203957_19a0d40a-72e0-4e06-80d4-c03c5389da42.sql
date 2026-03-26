
-- =====================================================
-- WITHDRAWAL IBT TRUTHFUL STATUS BACKFILL + CRON SETUP
-- =====================================================

-- 1. Backfill 11 stale IBTs (>7 days old) to needs_review
UPDATE internal_balance_transfers
SET 
  status_detail = 'Pending over 7 days — needs admin review',
  updated_at = NOW()
WHERE direction = 'to_wallet' 
  AND status = 'pending'
  AND created_at < NOW() - interval '7 days';

-- 2. Backfill 6 long-pending IBTs (>24h, <7d) to awaiting_liquidity  
UPDATE internal_balance_transfers
SET 
  status_detail = 'Awaiting hot wallet liquidity',
  updated_at = NOW()
WHERE direction = 'to_wallet' 
  AND status = 'pending'
  AND created_at >= NOW() - interval '7 days'
  AND created_at < NOW() - interval '24 hours';

-- 3. Enhanced reconcile function with age-based classification
CREATE OR REPLACE FUNCTION reconcile_transfer_statuses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_deposits int := 0;
  v_stale_withdrawals int := 0;
  v_needs_review int := 0;
  v_synced_deposits int := 0;
  v_synced_withdrawals int := 0;
BEGIN
  -- Fix deposits stuck as pending but already credited
  WITH credited AS (
    UPDATE internal_balance_transfers ibt
    SET status = 'success',
        status_detail = 'Credited to trading balance (auto-repaired)',
        updated_at = NOW()
    FROM custodial_deposits cd
    WHERE ibt.linked_deposit_id = cd.id::text
      AND ibt.direction = 'to_trading'
      AND ibt.status = 'pending'
      AND cd.status = 'credited'
    RETURNING ibt.id
  )
  SELECT count(*) INTO v_synced_deposits FROM credited;

  -- Sync withdrawal IBTs from custodial_withdrawals
  WITH synced AS (
    UPDATE internal_balance_transfers ibt
    SET status = CASE 
          WHEN cw.status = 'completed' THEN 'success'
          WHEN cw.status = 'failed' THEN 'failed'
          ELSE ibt.status
        END,
        status_detail = CASE
          WHEN cw.status = 'completed' THEN 'Completed and sent on-chain'
          WHEN cw.status = 'failed' THEN COALESCE(cw.error_message, 'Withdrawal failed')
          WHEN cw.status = 'processing' THEN 'Broadcasting on-chain'
          ELSE ibt.status_detail
        END,
        tx_hash = COALESCE(cw.tx_hash, ibt.tx_hash),
        updated_at = NOW()
    FROM custodial_withdrawals cw
    WHERE ibt.linked_withdrawal_id = cw.id::text
      AND ibt.direction = 'to_wallet'
      AND ibt.status = 'pending'
      AND cw.status IN ('completed', 'failed', 'processing')
    RETURNING ibt.id
  )
  SELECT count(*) INTO v_synced_withdrawals FROM synced;

  -- Age-classify remaining pending withdrawals
  -- >7 days: needs admin review
  UPDATE internal_balance_transfers
  SET status_detail = 'Pending over 7 days — needs admin review',
      updated_at = NOW()
  WHERE direction = 'to_wallet'
    AND status = 'pending'
    AND created_at < NOW() - interval '7 days'
    AND status_detail NOT LIKE '%needs admin review%';
  GET DIAGNOSTICS v_needs_review = ROW_COUNT;

  -- >24h but <7d: awaiting liquidity
  UPDATE internal_balance_transfers
  SET status_detail = 'Awaiting hot wallet liquidity',
      updated_at = NOW()
  WHERE direction = 'to_wallet'
    AND status = 'pending'
    AND created_at >= NOW() - interval '7 days'
    AND created_at < NOW() - interval '24 hours'
    AND status_detail NOT LIKE '%Awaiting hot wallet%';

  -- >1h deposits still pending: flag
  UPDATE internal_balance_transfers
  SET status_detail = 'Deposit pending over 1 hour — monitoring',
      updated_at = NOW()
  WHERE direction = 'to_trading'
    AND status = 'pending'
    AND created_at < NOW() - interval '1 hour'
    AND status_detail NOT LIKE '%monitoring%';
  GET DIAGNOSTICS v_stale_deposits = ROW_COUNT;

  -- Create admin notifications for stale items
  IF v_needs_review > 0 THEN
    INSERT INTO admin_notifications (title, message, type, priority, metadata)
    VALUES (
      'Stale Withdrawals Need Review',
      v_needs_review || ' withdrawal(s) pending over 7 days require admin attention',
      'withdrawal_stale',
      'high',
      jsonb_build_object('count', v_needs_review, 'checked_at', NOW())
    );
  END IF;

  IF v_stale_deposits > 0 THEN
    INSERT INTO admin_notifications (title, message, type, priority, metadata)
    VALUES (
      'Stale Deposits Detected',
      v_stale_deposits || ' deposit(s) pending over 1 hour',
      'deposit_stale',
      'medium',
      jsonb_build_object('count', v_stale_deposits, 'checked_at', NOW())
    );
  END IF;

  RETURN jsonb_build_object(
    'synced_deposits', v_synced_deposits,
    'synced_withdrawals', v_synced_withdrawals,
    'needs_review', v_needs_review,
    'stale_deposits', v_stale_deposits,
    'ran_at', NOW()
  );
END;
$$;
