
-- One-time fix: Clear locked_amount on filled/cancelled orders
-- This fixes the historical ghost locks data issue

UPDATE orders
SET locked_amount = 0, updated_at = NOW()
WHERE status IN ('filled', 'cancelled', 'canceled', 'rejected', 'expired')
  AND locked_amount > 0;

-- Also ensure reconcile function releases the corresponding wallet balance locks
-- For each discrepancy, move excess from locked to available
DO $$
DECLARE
  v_rec RECORD;
  v_asset_id UUID;
BEGIN
  FOR v_rec IN (
    WITH order_locks AS (
      SELECT 
        o.user_id,
        o.locked_asset_symbol as asset_symbol,
        SUM(COALESCE(o.locked_amount, 0)) as expected_locked
      FROM orders o
      WHERE o.status IN ('pending', 'open', 'partially_filled')
      GROUP BY o.user_id, o.locked_asset_symbol
    ),
    balance_locks AS (
      SELECT 
        wb.user_id,
        a.symbol as asset_symbol,
        wb.locked as actual_locked
      FROM wallet_balances wb
      JOIN assets a ON a.id = wb.asset_id
      WHERE wb.locked > 0.00000001
    )
    SELECT 
      COALESCE(bl.user_id, ol.user_id) as user_id,
      COALESCE(bl.asset_symbol, ol.asset_symbol) as asset_symbol,
      COALESCE(bl.actual_locked, 0) as actual_locked,
      COALESCE(ol.expected_locked, 0) as expected_locked,
      COALESCE(bl.actual_locked, 0) - COALESCE(ol.expected_locked, 0) as discrepancy
    FROM balance_locks bl
    FULL OUTER JOIN order_locks ol 
      ON bl.user_id = ol.user_id AND bl.asset_symbol = ol.asset_symbol
    WHERE COALESCE(bl.actual_locked, 0) - COALESCE(ol.expected_locked, 0) > 0.00000001
  ) LOOP
    -- Get asset ID
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_rec.asset_symbol;
    
    IF v_asset_id IS NOT NULL THEN
      -- Move excess from locked to available
      UPDATE wallet_balances
      SET 
        locked = GREATEST(locked - v_rec.discrepancy, 0),
        available = available + v_rec.discrepancy,
        updated_at = NOW()
      WHERE user_id = v_rec.user_id 
        AND asset_id = v_asset_id;
      
      -- Log the fix
      INSERT INTO trading_balance_ledger (
        user_id, asset_symbol, delta_available, delta_locked,
        balance_available_after, balance_locked_after,
        entry_type, reference_type, notes
      )
      SELECT 
        v_rec.user_id, 
        v_rec.asset_symbol, 
        v_rec.discrepancy, 
        -v_rec.discrepancy,
        wb.available,
        wb.locked,
        'RECONCILIATION',
        'admin',
        'Migration fix: released ' || v_rec.discrepancy || ' ' || v_rec.asset_symbol || ' ghost lock'
      FROM wallet_balances wb
      JOIN assets a ON a.id = wb.asset_id
      WHERE wb.user_id = v_rec.user_id AND a.symbol = v_rec.asset_symbol;
      
      RAISE NOTICE 'Fixed ghost lock for user % asset %: released %', 
        v_rec.user_id, v_rec.asset_symbol, v_rec.discrepancy;
    END IF;
  END LOOP;
END $$;
