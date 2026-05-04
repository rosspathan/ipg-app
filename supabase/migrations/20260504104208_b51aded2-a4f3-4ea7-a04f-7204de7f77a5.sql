-- Restrict trading_engine_settings: hide market_maker_user_id and admin_fee_wallet from non-admins.
-- Replace authenticated SELECT with admin-only; expose minimal status via SECURITY DEFINER RPC.

DROP POLICY IF EXISTS "Authenticated users can view engine settings" ON public.trading_engine_settings;

-- (Admin manage policy already covers admin SELECT/INSERT/UPDATE/DELETE via FOR ALL)

-- Public-safe RPC returning only non-sensitive engine status fields.
CREATE OR REPLACE FUNCTION public.get_trading_engine_status()
RETURNS TABLE(auto_matching_enabled boolean, circuit_breaker_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auto_matching_enabled, circuit_breaker_active
  FROM public.trading_engine_settings
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_trading_engine_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trading_engine_status() TO authenticated;