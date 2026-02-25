-- Phase 2: Create trigger to mirror unified_bsk_ledger entries to trading_balance_ledger
-- This prevents future drift from off-chain BSK credits/debits

CREATE OR REPLACE FUNCTION mirror_bsk_ledger_to_trading()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_avail numeric;
  v_wallet_locked numeric;
BEGIN
  -- Only mirror completed entries that affect trading balance
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get current wallet balance for balance_after snapshot
  SELECT COALESCE(wb.available, 0), COALESCE(wb.locked, 0)
  INTO v_wallet_avail, v_wallet_locked
  FROM wallet_balances wb
  JOIN assets a ON a.id = wb.asset_id AND a.symbol = 'BSK'
  WHERE wb.user_id = NEW.user_id
  LIMIT 1;

  -- Determine if credit or debit based on tx_type
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, entry_type, 
    delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    reference_type, reference_id, notes, created_at
  ) VALUES (
    NEW.user_id,
    'BSK',
    CASE WHEN NEW.tx_type = 'credit' THEN 'EXTERNAL_CREDIT' ELSE 'EXTERNAL_DEBIT' END,
    CASE WHEN NEW.tx_type = 'credit' THEN NEW.amount ELSE -NEW.amount END,
    0,
    v_wallet_avail,
    v_wallet_locked,
    'BSK_LEDGER_MIRROR',
    NEW.id,
    'Auto-mirrored from unified_bsk_ledger: ' || COALESCE(NEW.category, NEW.tx_type),
    NEW.created_at
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the original insert if mirroring fails
  RAISE WARNING 'mirror_bsk_ledger_to_trading failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_mirror_bsk_to_trading ON unified_bsk_ledger;

-- Create the trigger
CREATE TRIGGER trg_mirror_bsk_to_trading
  AFTER INSERT ON unified_bsk_ledger
  FOR EACH ROW
  EXECUTE FUNCTION mirror_bsk_ledger_to_trading();