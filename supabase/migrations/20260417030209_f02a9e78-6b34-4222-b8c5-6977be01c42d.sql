DROP VIEW IF EXISTS public.v_phantom_liquidity_diagnostic;

CREATE VIEW public.v_phantom_liquidity_diagnostic
WITH (security_invoker = true)
AS
SELECT
  o.id AS order_id, o.user_id, o.symbol, o.side, o.order_type, o.price, o.amount,
  o.filled_amount, GREATEST(o.amount - COALESCE(o.filled_amount,0), 0) AS remaining,
  o.status, o.locked_amount, o.locked_asset_symbol, o.created_at, o.updated_at,
  CASE
    WHEN o.order_type='market' AND o.status IN ('pending','open','partially_filled') THEN 'RESTING_MARKET_ORDER'
    WHEN COALESCE(o.price,0)<=0 AND o.status IN ('pending','open','partially_filled') THEN 'ZERO_OR_NEGATIVE_PRICE'
    WHEN GREATEST(o.amount-COALESCE(o.filled_amount,0),0)<=0 AND o.status IN ('pending','open','partially_filled') THEN 'ZERO_REMAINING_BUT_OPEN'
    ELSE 'OTHER'
  END AS issue_type,
  EXTRACT(EPOCH FROM (now()-o.created_at))/60 AS age_minutes
FROM public.orders o
WHERE o.status IN ('pending','open','partially_filled')
  AND (o.order_type='market' OR COALESCE(o.price,0)<=0 OR GREATEST(o.amount-COALESCE(o.filled_amount,0),0)<=0);

REVOKE ALL ON public.v_phantom_liquidity_diagnostic FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_phantom_liquidity_diagnostic TO authenticated;

COMMENT ON VIEW public.v_phantom_liquidity_diagnostic IS
'Admin diagnostic for phantom liquidity (resting market orders, price<=0, zero-remaining open orders). Uses SECURITY INVOKER so RLS on underlying orders applies. Admin-only access enforced via orders RLS + has_role() at query layer.';