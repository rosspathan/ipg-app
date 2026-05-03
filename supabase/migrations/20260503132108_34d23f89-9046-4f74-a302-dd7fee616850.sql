-- Phase 1: Monitor health telemetry
ALTER TABLE public.custodial_deposit_scan_state
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS active_rpc_provider text,
  ADD COLUMN IF NOT EXISTS failed_provider_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_chain_head_block bigint,
  ADD COLUMN IF NOT EXISTS last_run_detected integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_credited integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS rpc_provider_health jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Health view exposed to admins
CREATE OR REPLACE VIEW public.admin_monitor_health AS
SELECT
  s.chain,
  s.hot_wallet_address,
  s.last_scanned_block,
  s.last_chain_head_block,
  GREATEST(0, COALESCE(s.last_chain_head_block,0) - COALESCE(s.last_scanned_block,0)) AS scanner_lag_blocks,
  s.last_success_at,
  s.last_failure_at,
  s.last_error,
  s.active_rpc_provider,
  s.failed_provider_count,
  s.last_run_detected,
  s.last_run_credited,
  s.last_run_at,
  s.rpc_provider_health,
  s.updated_at,
  (SELECT COUNT(*) FROM public.custodial_deposits cd WHERE cd.status='pending') AS pending_deposits,
  (SELECT COUNT(*) FROM public.custodial_deposits cd WHERE cd.status='confirmed' AND cd.credited_at IS NULL) AS confirmed_uncredited,
  (SELECT COUNT(*) FROM public.custodial_deposits cd WHERE cd.status='manual_review') AS manual_review_deposits,
  (SELECT COUNT(*) FROM public.custodial_deposits cd WHERE cd.status='failed') AS failed_deposits,
  (SELECT COUNT(*) FROM public.custodial_deposits cd WHERE cd.status='pending' AND cd.created_at < now() - interval '10 minutes') AS pending_over_10m
FROM public.custodial_deposit_scan_state s;

REVOKE ALL ON public.admin_monitor_health FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_monitor_health TO authenticated;

-- Wrap with security_barrier-style RLS via a guard function
CREATE OR REPLACE FUNCTION public.get_admin_monitor_health()
RETURNS SETOF public.admin_monitor_health
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_monitor_health
  WHERE public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.get_admin_monitor_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_monitor_health() TO authenticated;