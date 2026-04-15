CREATE OR REPLACE FUNCTION public.trigger_refresh_bsk_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep the forensic/reporting materialized view current, but do not
  -- resync the full user_bsk_balances table here.
  -- Operational balance mutations are already handled atomically by the
  -- calling RPC/functions, and full-table sync here can fail on unrelated
  -- legacy-corrupt rows, rolling back valid transfers.
  PERFORM public.refresh_bsk_balances_view();
  RETURN NULL;
END;
$$;