-- CRITICAL FIX: Release funds stuck in filled/cancelled orders
-- This migration fixes the orphaned locked funds issue where order execution/cancellation
-- didn't properly release the locked amounts back to users

-- Step 1: Release funds from FILLED orders that still have locked amounts
WITH filled_orders_with_locks AS (
  SELECT 
    o.id as order_id,
    o.user_id,
    o.locked_amount,
    o.locked_asset_symbol,
    a.id as asset_id
  FROM orders o
  JOIN assets a ON a.symbol = o.locked_asset_symbol
  WHERE o.status = 'filled' 
    AND o.locked_amount > 0
)
UPDATE wallet_balances wb
SET 
  locked = GREATEST(0, locked - fol.locked_amount),
  available = available + fol.locked_amount,
  updated_at = now()
FROM filled_orders_with_locks fol
WHERE wb.user_id = fol.user_id 
  AND wb.asset_id = fol.asset_id;

-- Step 2: Release funds from CANCELLED orders that still have locked amounts
WITH cancelled_orders_with_locks AS (
  SELECT 
    o.id as order_id,
    o.user_id,
    o.locked_amount,
    o.locked_asset_symbol,
    a.id as asset_id
  FROM orders o
  JOIN assets a ON a.symbol = o.locked_asset_symbol
  WHERE o.status = 'cancelled' 
    AND o.locked_amount > 0
)
UPDATE wallet_balances wb
SET 
  locked = GREATEST(0, locked - col.locked_amount),
  available = available + col.locked_amount,
  updated_at = now()
FROM cancelled_orders_with_locks col
WHERE wb.user_id = col.user_id 
  AND wb.asset_id = col.asset_id;

-- Step 3: Clear the locked_amount on all filled orders
UPDATE orders
SET locked_amount = 0, updated_at = now()
WHERE status = 'filled' AND locked_amount > 0;

-- Step 4: Clear the locked_amount on all cancelled orders
UPDATE orders
SET locked_amount = 0, updated_at = now()
WHERE status = 'cancelled' AND locked_amount > 0;

-- Step 5: Reconcile any remaining wallet lock discrepancies
-- This compares the actual open orders locked amounts with wallet locks
-- and fixes any mismatches
WITH order_lock_totals AS (
  SELECT 
    o.user_id,
    a.id as asset_id,
    SUM(o.locked_amount) as expected_locked
  FROM orders o
  JOIN assets a ON a.symbol = o.locked_asset_symbol
  WHERE o.status IN ('pending', 'open', 'partially_filled')
    AND o.locked_amount > 0
  GROUP BY o.user_id, a.id
),
wallet_discrepancies AS (
  SELECT 
    wb.user_id,
    wb.asset_id,
    wb.locked as current_locked,
    wb.available as current_available,
    COALESCE(olt.expected_locked, 0) as expected_locked,
    wb.locked - COALESCE(olt.expected_locked, 0) as over_locked
  FROM wallet_balances wb
  LEFT JOIN order_lock_totals olt ON wb.user_id = olt.user_id AND wb.asset_id = olt.asset_id
  WHERE wb.locked > COALESCE(olt.expected_locked, 0)
)
UPDATE wallet_balances wb
SET 
  locked = wd.expected_locked,
  available = wb.available + wd.over_locked,
  updated_at = now()
FROM wallet_discrepancies wd
WHERE wb.user_id = wd.user_id 
  AND wb.asset_id = wd.asset_id;
