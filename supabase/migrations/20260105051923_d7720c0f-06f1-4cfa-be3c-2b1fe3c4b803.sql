-- 1. Cancel all orphaned pending orders (simpler approach - cancel ALL pending orders to reset)
-- This cleans up the corrupted state so fresh orders can work properly
UPDATE orders 
SET status = 'cancelled', updated_at = now(), cancelled_at = now()
WHERE status = 'pending';

-- 2. Reset all locked balances to 0 since we cancelled all pending orders
UPDATE wallet_balances 
SET locked = 0, updated_at = now()
WHERE locked > 0;

-- 3. Add market maker settings to trading_engine_settings if not exists
ALTER TABLE trading_engine_settings 
ADD COLUMN IF NOT EXISTS market_maker_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS market_maker_user_id UUID,
ADD COLUMN IF NOT EXISTS market_maker_spread_percent NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS market_maker_depth_levels INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS market_maker_order_size NUMERIC DEFAULT 100;