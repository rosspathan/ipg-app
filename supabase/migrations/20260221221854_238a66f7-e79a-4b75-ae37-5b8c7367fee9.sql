
-- Fix 1: Recreate user_trade_fills with security_invoker=on
-- so it respects the underlying trades table RLS (owner-only + admin)
DROP VIEW IF EXISTS public.user_trade_fills;

CREATE VIEW public.user_trade_fills
WITH (security_invoker=on) AS
SELECT t.id AS trade_id,
    t.symbol AS pair,
    t.buyer_id AS user_id,
    'buy'::text AS side,
    'taker'::text AS role,
    t.price,
    t.quantity AS amount,
    t.total_value AS total,
    t.buyer_fee AS fee,
    t.fee_asset,
    t.buy_order_id AS order_id,
    t.trade_time AS executed_at,
    t.created_at
FROM trades t
UNION ALL
SELECT t.id AS trade_id,
    t.symbol AS pair,
    t.seller_id AS user_id,
    'sell'::text AS side,
    'maker'::text AS role,
    t.price,
    t.quantity AS amount,
    t.total_value AS total,
    t.seller_fee AS fee,
    t.fee_asset,
    t.sell_order_id AS order_id,
    t.trade_time AS executed_at,
    t.created_at
FROM trades t;

-- Fix 2: Drop the overly permissive "System can manage" policy on escrow_withdrawals
-- Service role already bypasses RLS; the granular owner/admin policies are sufficient
DROP POLICY IF EXISTS "System can manage escrow withdrawals" ON public.escrow_withdrawals;

-- Also drop duplicate policies to clean up conflicts
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "Users can view their own escrow withdrawals" ON public.escrow_withdrawals;
