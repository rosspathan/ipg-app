-- ============================================================
-- FIX 1: Enhanced status model for internal_balance_transfers
-- ============================================================
ALTER TABLE internal_balance_transfers 
  ADD COLUMN IF NOT EXISTS status_detail TEXT;

ALTER TABLE internal_balance_transfers 
  ADD COLUMN IF NOT EXISTS linked_withdrawal_id UUID;

ALTER TABLE internal_balance_transfers 
  ADD COLUMN IF NOT EXISTS linked_deposit_id UUID;

-- ============================================================
-- FIX 2: Backfill 55 stuck deposit IBTs
-- ============================================================
UPDATE internal_balance_transfers ibt
SET status = 'success',
    status_detail = 'Credited to trading balance',
    linked_deposit_id = cd.id,
    updated_at = now()
FROM custodial_deposits cd
WHERE cd.tx_hash = ibt.tx_hash
  AND cd.status = 'credited'
  AND ibt.direction = 'to_trading'
  AND ibt.status = 'pending';

-- ============================================================
-- FIX 3: Link and sync pending withdrawal IBTs
-- ============================================================
UPDATE internal_balance_transfers ibt
SET linked_withdrawal_id = (REPLACE(ibt.notes, 'withdrawal_id:', ''))::uuid,
    status_detail = CASE 
      WHEN cw.status = 'completed' THEN 'Completed and sent on-chain'
      WHEN cw.status = 'failed' THEN 'Failed — funds refunded'
      WHEN cw.status = 'pending' THEN 'Queued for processing'
      WHEN cw.status = 'processing' THEN 'Broadcasting on-chain'
      ELSE 'Processing'
    END,
    status = CASE 
      WHEN cw.status = 'completed' THEN 'success'
      WHEN cw.status = 'failed' THEN 'failed'
      ELSE ibt.status
    END,
    tx_hash = COALESCE(cw.tx_hash, ibt.tx_hash),
    updated_at = now()
FROM custodial_withdrawals cw
WHERE cw.id = (REPLACE(ibt.notes, 'withdrawal_id:', ''))::uuid
  AND ibt.direction = 'to_wallet'
  AND ibt.notes LIKE 'withdrawal_id:%';

-- ============================================================
-- FIX 4: Trigger to auto-sync deposit IBT status
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ibt_from_custodial_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'credited' AND (OLD.status IS NULL OR OLD.status <> 'credited') THEN
    UPDATE internal_balance_transfers
    SET status = 'success',
        status_detail = 'Credited to trading balance',
        linked_deposit_id = NEW.id,
        updated_at = now()
    WHERE tx_hash = NEW.tx_hash
      AND direction = 'to_trading'
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_ibt_deposit ON custodial_deposits;
CREATE TRIGGER trg_sync_ibt_deposit
  AFTER UPDATE ON custodial_deposits
  FOR EACH ROW
  EXECUTE FUNCTION sync_ibt_from_custodial_deposit();

-- ============================================================
-- FIX 5: Trigger to auto-sync withdrawal IBT status
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ibt_from_custodial_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE internal_balance_transfers
  SET status = CASE 
        WHEN NEW.status = 'completed' THEN 'success'
        WHEN NEW.status = 'failed' THEN 'failed'
        ELSE status
      END,
      status_detail = CASE 
        WHEN NEW.status = 'completed' THEN 'Completed and sent on-chain'
        WHEN NEW.status = 'failed' THEN 'Failed — funds refunded'
        WHEN NEW.status = 'processing' THEN 'Broadcasting on-chain'
        ELSE status_detail
      END,
      tx_hash = COALESCE(NEW.tx_hash, tx_hash),
      updated_at = now()
  WHERE linked_withdrawal_id = NEW.id
     OR (direction = 'to_wallet' AND notes = 'withdrawal_id:' || NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_ibt_withdrawal ON custodial_withdrawals;
CREATE TRIGGER trg_sync_ibt_withdrawal
  AFTER UPDATE ON custodial_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION sync_ibt_from_custodial_withdrawal();

-- ============================================================
-- FIX 6: Reconciliation function
-- ============================================================
CREATE OR REPLACE FUNCTION reconcile_transfer_statuses()
RETURNS JSONB AS $$
DECLARE
  v_deposits_fixed INT := 0;
  v_withdrawals_fixed INT := 0;
  v_stale_flagged INT := 0;
BEGIN
  WITH fixed AS (
    UPDATE internal_balance_transfers ibt
    SET status = 'success',
        status_detail = 'Credited to trading balance (reconciled)',
        linked_deposit_id = cd.id,
        updated_at = now()
    FROM custodial_deposits cd
    WHERE cd.tx_hash = ibt.tx_hash
      AND cd.status = 'credited'
      AND ibt.direction = 'to_trading'
      AND ibt.status = 'pending'
    RETURNING ibt.id
  )
  SELECT count(*) INTO v_deposits_fixed FROM fixed;

  WITH fixed AS (
    UPDATE internal_balance_transfers ibt
    SET status = CASE WHEN cw.status = 'completed' THEN 'success' WHEN cw.status = 'failed' THEN 'failed' ELSE ibt.status END,
        status_detail = CASE 
          WHEN cw.status = 'completed' THEN 'Completed (reconciled)'
          WHEN cw.status = 'failed' THEN 'Failed (reconciled)'
          ELSE ibt.status_detail
        END,
        tx_hash = COALESCE(cw.tx_hash, ibt.tx_hash),
        linked_withdrawal_id = cw.id,
        updated_at = now()
    FROM custodial_withdrawals cw
    WHERE ibt.direction = 'to_wallet'
      AND ibt.status = 'pending'
      AND ibt.notes LIKE 'withdrawal_id:%'
      AND cw.id = (REPLACE(ibt.notes, 'withdrawal_id:', ''))::uuid
      AND cw.status IN ('completed', 'failed')
    RETURNING ibt.id
  )
  SELECT count(*) INTO v_withdrawals_fixed FROM fixed;

  WITH flagged AS (
    UPDATE internal_balance_transfers
    SET status_detail = 'Needs review — pending over 24h'
    WHERE status = 'pending'
      AND created_at < now() - interval '24 hours'
      AND (status_detail IS NULL OR status_detail NOT LIKE '%review%')
    RETURNING id
  )
  SELECT count(*) INTO v_stale_flagged FROM flagged;

  RETURN jsonb_build_object(
    'deposits_fixed', v_deposits_fixed,
    'withdrawals_fixed', v_withdrawals_fixed,
    'stale_flagged', v_stale_flagged,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;