
INSERT INTO public.system_settings (key, value, description)
VALUES ('kyc_bonus_enabled', 'false', 'Master flag: when false, all KYC reward functions are no-ops.')
ON CONFLICT (key) DO UPDATE SET value='false', updated_at=now();

INSERT INTO public.system_settings (key, value, description)
VALUES ('kyc_referral_bonus_enabled', 'false', 'Master flag: when false, KYC referral bonus is disabled.')
ON CONFLICT (key) DO UPDATE SET value='false', updated_at=now();

CREATE OR REPLACE FUNCTION public.reward_kyc_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_enabled text;
BEGIN
  SELECT value INTO v_enabled FROM public.system_settings WHERE key='kyc_bonus_enabled';
  IF COALESCE(v_enabled,'false') <> 'true' THEN RETURN NEW; END IF;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.reward_kyc_approval_simple()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_enabled text;
BEGIN
  SELECT value INTO v_enabled FROM public.system_settings WHERE key='kyc_bonus_enabled';
  IF COALESCE(v_enabled,'false') <> 'true' THEN RETURN NEW; END IF;
  RETURN NEW;
END;$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT 'public.'||viewname AS qn FROM pg_views WHERE schemaname='public' AND viewname LIKE 'admin_recon%' LOOP
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC, anon, authenticated', r.qn);
  END LOOP;
END$$;
REVOKE ALL ON public.admin_manual_review_deposits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.admin_recon_ledger_sources_by_asset
WITH (security_invoker=true) AS
SELECT asset_symbol, entry_type, COUNT(*)::bigint AS entry_count,
       SUM(delta_available) AS sum_delta_available, SUM(delta_locked) AS sum_delta_locked,
       MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
FROM public.trading_balance_ledger GROUP BY asset_symbol, entry_type;

CREATE OR REPLACE VIEW public.admin_recon_unexplained_drift_by_asset
WITH (security_invoker=true) AS
WITH wb AS (
  SELECT a.symbol AS asset_symbol, SUM(w.available) AS wb_available, SUM(w.locked) AS wb_locked
  FROM public.wallet_balances w JOIN public.assets a ON a.id=w.asset_id GROUP BY a.symbol),
lg AS (
  SELECT asset_symbol, SUM(delta_available) AS led_available, SUM(delta_locked) AS led_locked
  FROM public.trading_balance_ledger GROUP BY asset_symbol)
SELECT COALESCE(wb.asset_symbol, lg.asset_symbol) AS asset_symbol,
       COALESCE(wb.wb_available,0) AS wb_available, COALESCE(wb.wb_locked,0) AS wb_locked,
       COALESCE(lg.led_available,0) AS led_available, COALESCE(lg.led_locked,0) AS led_locked,
       COALESCE(wb.wb_available,0)-COALESCE(lg.led_available,0) AS drift_available,
       COALESCE(wb.wb_locked,0)-COALESCE(lg.led_locked,0) AS drift_locked
FROM wb FULL OUTER JOIN lg ON lg.asset_symbol=wb.asset_symbol;

CREATE OR REPLACE VIEW public.admin_recon_unexplained_drift_by_user
WITH (security_invoker=true) AS
WITH wb AS (
  SELECT w.user_id, a.symbol AS asset_symbol, w.available AS wb_av, w.locked AS wb_lk
  FROM public.wallet_balances w JOIN public.assets a ON a.id=w.asset_id),
lg AS (
  SELECT user_id, asset_symbol, SUM(delta_available) AS led_av, SUM(delta_locked) AS led_lk
  FROM public.trading_balance_ledger GROUP BY user_id, asset_symbol)
SELECT COALESCE(wb.user_id, lg.user_id) AS user_id,
       COALESCE(wb.asset_symbol, lg.asset_symbol) AS asset_symbol,
       COALESCE(wb.wb_av,0) AS wb_available, COALESCE(wb.wb_lk,0) AS wb_locked,
       COALESCE(lg.led_av,0) AS led_available, COALESCE(lg.led_lk,0) AS led_locked,
       COALESCE(wb.wb_av,0)-COALESCE(lg.led_av,0) AS drift_available,
       COALESCE(wb.wb_lk,0)-COALESCE(lg.led_lk,0) AS drift_locked
FROM wb FULL OUTER JOIN lg ON lg.user_id=wb.user_id AND lg.asset_symbol=wb.asset_symbol
WHERE ABS(COALESCE(wb.wb_av,0)-COALESCE(lg.led_av,0))>0.00001
   OR ABS(COALESCE(wb.wb_lk,0)-COALESCE(lg.led_lk,0))>0.00001;

CREATE OR REPLACE VIEW public.admin_recon_orphan_wallet_balances
WITH (security_invoker=true) AS
SELECT w.user_id, a.symbol AS asset_symbol, w.available, w.locked, w.created_at, w.updated_at
FROM public.wallet_balances w JOIN public.assets a ON a.id=w.asset_id
WHERE (w.available>0 OR w.locked>0)
  AND NOT EXISTS (SELECT 1 FROM public.trading_balance_ledger l WHERE l.user_id=w.user_id AND l.asset_symbol=a.symbol);

CREATE OR REPLACE VIEW public.admin_recon_orphan_ledger_entries
WITH (security_invoker=true) AS
SELECT l.user_id, l.asset_symbol, COUNT(*)::bigint AS entry_count,
       SUM(l.delta_available) AS sum_delta_available, SUM(l.delta_locked) AS sum_delta_locked,
       MIN(l.created_at) AS first_seen, MAX(l.created_at) AS last_seen
FROM public.trading_balance_ledger l
LEFT JOIN public.assets a ON a.symbol=l.asset_symbol
LEFT JOIN public.wallet_balances w ON w.user_id=l.user_id AND w.asset_id=a.id
WHERE w.id IS NULL
GROUP BY l.user_id, l.asset_symbol;

CREATE OR REPLACE VIEW public.admin_recon_bsk_liability_funding
WITH (security_invoker=true) AS
SELECT tx_type, tx_subtype, balance_type, COUNT(*)::bigint AS event_count,
       SUM(amount_bsk) AS total_bsk, MIN(created_at) AS first_event, MAX(created_at) AS last_event
FROM public.unified_bsk_ledger GROUP BY tx_type, tx_subtype, balance_type;

CREATE OR REPLACE VIEW public.admin_recon_hot_wallet_solvency
WITH (security_invoker=true) AS
SELECT DISTINCT ON (asset_symbol)
  asset_symbol, user_available, user_locked, total_user_liability, pending_withdrawals,
  platform_fees_owed, required_balance, actual_onchain_balance, surplus_or_deficit,
  status, drift_users_count, total_drift_amount, snapshot_at
FROM public.hot_wallet_solvency_snapshots
ORDER BY asset_symbol, snapshot_at DESC;

CREATE OR REPLACE VIEW public.admin_recon_rewards_by_source
WITH (security_invoker=true) AS
SELECT 'unified_bsk_ledger'::text AS source, tx_type::text AS subtype, COUNT(*)::bigint AS event_count, SUM(amount_bsk)::numeric AS total_amount, 'BSK'::text AS asset_symbol
FROM public.unified_bsk_ledger GROUP BY tx_type
UNION ALL
SELECT 'bonus_ledger', type, COUNT(*), SUM(amount_bsk), COALESCE(asset,'BSK')
FROM public.bonus_ledger GROUP BY type, asset;

CREATE OR REPLACE VIEW public.admin_recon_usdt_drift_forensics
WITH (security_invoker=true) AS
WITH wb AS (
  SELECT w.user_id, w.available AS wb_av, w.locked AS wb_lk, w.updated_at AS wb_updated_at
  FROM public.wallet_balances w JOIN public.assets a ON a.id=w.asset_id WHERE a.symbol='USDT'),
lg AS (
  SELECT user_id, SUM(delta_available) AS led_av, SUM(delta_locked) AS led_lk,
         COUNT(*)::bigint AS ledger_entry_count,
         MIN(created_at) AS first_ledger_at, MAX(created_at) AS last_ledger_at
  FROM public.trading_balance_ledger WHERE asset_symbol='USDT' GROUP BY user_id)
SELECT COALESCE(wb.user_id, lg.user_id) AS user_id, 'USDT'::text AS asset_symbol,
       COALESCE(wb.wb_av,0) AS wb_available, COALESCE(wb.wb_lk,0) AS wb_locked,
       COALESCE(lg.led_av,0) AS ledger_available, COALESCE(lg.led_lk,0) AS ledger_locked,
       COALESCE(wb.wb_av,0)-COALESCE(lg.led_av,0) AS drift_available,
       COALESCE(wb.wb_lk,0)-COALESCE(lg.led_lk,0) AS drift_locked,
       COALESCE(lg.ledger_entry_count,0) AS ledger_entry_count,
       lg.first_ledger_at, lg.last_ledger_at, wb.wb_updated_at,
       COALESCE(lg.led_av,0)-COALESCE(wb.wb_av,0) AS suggested_ledger_correction_available,
       COALESCE(lg.led_lk,0)-COALESCE(wb.wb_lk,0) AS suggested_ledger_correction_locked,
       CASE
         WHEN wb.user_id IS NULL THEN 'orphan_ledger_no_wallet_row'
         WHEN lg.user_id IS NULL THEN 'orphan_wallet_no_ledger_row'
         WHEN ABS(COALESCE(wb.wb_av,0)-COALESCE(lg.led_av,0))<0.00001 AND ABS(COALESCE(wb.wb_lk,0)-COALESCE(lg.led_lk,0))<0.00001 THEN 'in_sync'
         WHEN COALESCE(wb.wb_av,0)>COALESCE(lg.led_av,0) THEN 'wallet_overstated_vs_ledger'
         ELSE 'wallet_understated_vs_ledger'
       END AS classification
FROM wb FULL OUTER JOIN lg ON lg.user_id=wb.user_id
WHERE ABS(COALESCE(wb.wb_av,0)-COALESCE(lg.led_av,0))>0.00001
   OR ABS(COALESCE(wb.wb_lk,0)-COALESCE(lg.led_lk,0))>0.00001;

REVOKE ALL ON
  public.admin_recon_ledger_sources_by_asset,
  public.admin_recon_unexplained_drift_by_asset,
  public.admin_recon_unexplained_drift_by_user,
  public.admin_recon_orphan_wallet_balances,
  public.admin_recon_orphan_ledger_entries,
  public.admin_recon_bsk_liability_funding,
  public.admin_recon_hot_wallet_solvency,
  public.admin_recon_rewards_by_source,
  public.admin_recon_usdt_drift_forensics
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_recon_view(p_view text)
RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_allowed text[] := ARRAY[
  'admin_recon_ledger_sources_by_asset','admin_recon_unexplained_drift_by_asset',
  'admin_recon_unexplained_drift_by_user','admin_recon_orphan_wallet_balances',
  'admin_recon_orphan_ledger_entries','admin_recon_bsk_liability_funding',
  'admin_recon_hot_wallet_solvency','admin_recon_rewards_by_source',
  'admin_recon_usdt_drift_forensics','admin_recon_balances_by_asset',
  'admin_recon_deposits_by_asset','admin_recon_solvency_by_asset',
  'admin_recon_user_asset_summary','admin_recon_withdrawals_by_asset',
  'admin_manual_review_deposits'];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;
  IF NOT (p_view = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'view not allowed: %', p_view;
  END IF;
  PERFORM public.log_admin_action('admin_recon_view_query','recon_view',p_view,NULL,jsonb_build_object('view',p_view));
  RETURN QUERY EXECUTE format('SELECT to_jsonb(t) FROM public.%I t', p_view);
END;$$;
REVOKE ALL ON FUNCTION public.admin_get_recon_view(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_recon_view(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recon_security_self_test()
RETURNS TABLE(check_name text, expected text, actual text, pass boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_anon_drift boolean; v_auth_drift boolean;
  v_anon_solv boolean; v_auth_solv boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;
  v_anon_drift := has_table_privilege('anon','public.admin_recon_unexplained_drift_by_asset','SELECT');
  v_auth_drift := has_table_privilege('authenticated','public.admin_recon_unexplained_drift_by_asset','SELECT');
  v_anon_solv  := has_table_privilege('anon','public.admin_recon_hot_wallet_solvency','SELECT');
  v_auth_solv  := has_table_privilege('authenticated','public.admin_recon_hot_wallet_solvency','SELECT');
  RETURN QUERY VALUES
    ('anon cannot SELECT drift view','false',v_anon_drift::text, v_anon_drift=false),
    ('authenticated cannot SELECT drift view','false',v_auth_drift::text, v_auth_drift=false),
    ('anon cannot SELECT solvency view','false',v_anon_solv::text, v_anon_solv=false),
    ('authenticated cannot SELECT solvency view','false',v_auth_solv::text, v_auth_solv=false);
END;$$;
REVOKE ALL ON FUNCTION public.admin_recon_security_self_test() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recon_security_self_test() TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS sig
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN (
             'admin_list_manual_review_deposits','admin_credit_manual_review_deposit',
             'admin_reject_manual_review_deposit','admin_reassign_manual_review_deposit')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END$$;
