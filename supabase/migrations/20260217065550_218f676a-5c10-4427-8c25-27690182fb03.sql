
-- Step 1: Release locked USDI back to users (from buy orders in BSK/USDI and IPG/USDI)
UPDATE public.wallet_balances wb
SET available = wb.available + sub.total_locked,
    locked = GREATEST(0, wb.locked - sub.total_locked)
FROM (
  SELECT o.user_id, SUM(o.locked_amount) AS total_locked
  FROM public.orders o
  WHERE o.symbol IN ('BSK/USDI', 'IPG/USDI')
    AND o.status IN ('pending', 'open', 'partially_filled')
    AND o.locked_asset_symbol = 'USDI'
  GROUP BY o.user_id
) sub
WHERE wb.user_id = sub.user_id
  AND wb.asset_id = '62e5491b-abcb-4d3d-9ba5-42f1104fd457';

-- Step 2: Release locked BSK back to users (from sell orders in BSK/USDI)
UPDATE public.wallet_balances wb
SET available = wb.available + sub.total_locked,
    locked = GREATEST(0, wb.locked - sub.total_locked)
FROM (
  SELECT o.user_id, SUM(o.locked_amount) AS total_locked
  FROM public.orders o
  WHERE o.symbol = 'BSK/USDI'
    AND o.status IN ('pending', 'open', 'partially_filled')
    AND o.locked_asset_symbol = 'BSK'
  GROUP BY o.user_id
) sub
WHERE wb.user_id = sub.user_id
  AND wb.asset_id = '3a57be42-ab49-4813-9922-517cb0b5a011';

-- Step 3: Release locked IPG back to users (from sell orders in IPG/USDI)
UPDATE public.wallet_balances wb
SET available = wb.available + sub.total_locked,
    locked = GREATEST(0, wb.locked - sub.total_locked)
FROM (
  SELECT o.user_id, SUM(o.locked_amount) AS total_locked
  FROM public.orders o
  WHERE o.symbol = 'IPG/USDI'
    AND o.status IN ('pending', 'open', 'partially_filled')
    AND o.locked_asset_symbol = 'IPG'
  GROUP BY o.user_id
) sub
WHERE wb.user_id = sub.user_id
  AND wb.asset_id = 'e4ce7e45-5215-4a84-8189-3139f55c8983';

-- Step 4: Cancel all open orders in the removed pairs
UPDATE public.orders
SET status = 'cancelled',
    locked_amount = 0,
    updated_at = now()
WHERE symbol IN ('BSK/USDI', 'IPG/USDI')
  AND status IN ('pending', 'open', 'partially_filled');

-- Step 5: Deactivate BSK/USDI and IPG/USDI markets
UPDATE public.markets
SET is_active = false
WHERE id IN (
  '554a720f-5685-4110-b043-0811cb0700db',
  'bbfa3203-d0d4-4b32-a36e-774e0bd68d59'
);
