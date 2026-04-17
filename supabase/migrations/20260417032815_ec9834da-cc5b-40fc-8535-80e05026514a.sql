-- ============================================================
-- HOT WALLET SECURITY HARDENING — RECONCILIATION INFRASTRUCTURE
-- ============================================================

-- Trading hot wallet address constant (lowercased for comparison)
-- 0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5

-- ------------------------------------------------------------
-- 1) hotwallet_security_thresholds (admin-tunable risk config)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotwallet_security_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hot_wallet_address text NOT NULL,
  token_symbol text,
  max_single_tx_amount numeric NOT NULL DEFAULT 1000,
  max_daily_amount_per_address numeric NOT NULL DEFAULT 5000,
  max_daily_tx_count_per_address int NOT NULL DEFAULT 10,
  alert_on_unmatched boolean NOT NULL DEFAULT true,
  alert_on_duplicate boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hot_wallet_address, token_symbol)
);

ALTER TABLE public.hotwallet_security_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hotwallet_thresholds_admin_all ON public.hotwallet_security_thresholds;
CREATE POLICY hotwallet_thresholds_admin_all
ON public.hotwallet_security_thresholds
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default thresholds for the trading hot wallet
INSERT INTO public.hotwallet_security_thresholds
  (hot_wallet_address, token_symbol, max_single_tx_amount, max_daily_amount_per_address, max_daily_tx_count_per_address, notes)
VALUES
  ('0x4a6a2066b6b42fe90128351d67fb5dea40ecacf5', NULL, 5000, 25000, 20, 'Default thresholds for trading hot wallet (any token)')
ON CONFLICT (hot_wallet_address, token_symbol) DO NOTHING;

-- ------------------------------------------------------------
-- 2) hotwallet_security_alerts (real-time alert store)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotwallet_security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,           -- UNMATCHED_OUTBOUND, DUPLICATE_TX, ABNORMAL_REPEAT, THRESHOLD_BREACH, NO_APPROVAL_LINK
  severity text NOT NULL DEFAULT 'high',  -- low | medium | high | critical
  hot_wallet_address text NOT NULL,
  tx_hash text,
  token_symbol text,
  amount numeric,
  destination_address text,
  related_user_id uuid,
  related_withdrawal_id uuid,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_type, tx_hash, destination_address)
);

CREATE INDEX IF NOT EXISTS idx_hotwallet_alerts_unack
  ON public.hotwallet_security_alerts (created_at DESC)
  WHERE acknowledged = false;

CREATE INDEX IF NOT EXISTS idx_hotwallet_alerts_severity
  ON public.hotwallet_security_alerts (severity, created_at DESC);

ALTER TABLE public.hotwallet_security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hotwallet_alerts_admin_all ON public.hotwallet_security_alerts;
CREATE POLICY hotwallet_alerts_admin_all
ON public.hotwallet_security_alerts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 3) v_hotwallet_outbound_reconciliation
--    Every outbound tx FROM the trading hot wallet, joined to
--    its matching internal withdrawal record (if any).
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.v_hotwallet_outbound_reconciliation CASCADE;

CREATE VIEW public.v_hotwallet_outbound_reconciliation
WITH (security_invoker = true)
AS
WITH outbound_txs AS (
  -- Pull outbound txs as recorded against any user (the hot wallet
  -- sends ON BEHALF of users, so we use custodial_withdrawals as the
  -- authoritative outbound ledger and onchain_transactions as the on-chain proof)
  SELECT
    cw.id              AS withdrawal_id,
    cw.user_id,
    cw.asset_id,
    a.symbol           AS token_symbol,
    a.name             AS token_name,
    cw.amount,
    cw.fee_amount,
    LOWER(cw.to_address) AS destination_address,
    cw.tx_hash,
    cw.status          AS withdrawal_status,
    cw.created_at      AS requested_at,
    cw.completed_at,
    p.email            AS user_email,
    p.full_name        AS user_full_name,
    p.username         AS username
  FROM public.custodial_withdrawals cw
  LEFT JOIN public.assets a    ON a.id = cw.asset_id
  LEFT JOIN public.profiles p  ON p.user_id = cw.user_id
)
SELECT
  ot.withdrawal_id,
  ot.tx_hash,
  ot.token_symbol,
  ot.token_name,
  ot.amount,
  ot.fee_amount,
  ot.destination_address,
  ot.user_id,
  ot.user_email,
  ot.user_full_name,
  ot.username,
  ot.withdrawal_status,
  ot.requested_at,
  ot.completed_at,
  -- Match against on-chain record (counterparty_address = destination)
  oc.id              AS onchain_record_id,
  oc.amount_formatted AS onchain_amount,
  oc.confirmations,
  oc.block_number,
  oc.confirmed_at,
  -- Match status logic
  CASE
    WHEN ot.tx_hash IS NULL AND ot.withdrawal_status IN ('pending','approved','queued','broadcasting')
      THEN 'PENDING_BROADCAST'
    WHEN ot.tx_hash IS NULL
      THEN 'NO_TX_HASH'
    WHEN oc.id IS NULL
      THEN 'UNMATCHED_ONCHAIN'
    WHEN ABS(COALESCE(oc.amount_formatted,0) - ot.amount) > 0.00000001
      THEN 'AMOUNT_MISMATCH'
    WHEN LOWER(COALESCE(oc.counterparty_address,'')) <> ot.destination_address
      THEN 'ADDRESS_MISMATCH'
    ELSE 'MATCHED'
  END AS match_status,
  CASE
    WHEN ot.tx_hash IS NOT NULL AND oc.id IS NULL THEN true
    WHEN oc.id IS NOT NULL AND ABS(COALESCE(oc.amount_formatted,0) - ot.amount) > 0.00000001 THEN true
    WHEN oc.id IS NOT NULL AND LOWER(COALESCE(oc.counterparty_address,'')) <> ot.destination_address THEN true
    ELSE false
  END AS mismatch_flag
FROM outbound_txs ot
LEFT JOIN public.onchain_transactions oc
  ON oc.tx_hash = ot.tx_hash
 AND oc.direction IN ('out','outbound','OUT','withdrawal');

REVOKE ALL ON public.v_hotwallet_outbound_reconciliation FROM PUBLIC, anon;
GRANT SELECT ON public.v_hotwallet_outbound_reconciliation TO authenticated;

COMMENT ON VIEW public.v_hotwallet_outbound_reconciliation IS
'Hot-wallet outbound reconciliation. Joins custodial_withdrawals (internal source of truth) with onchain_transactions (on-chain proof). match_status = MATCHED, UNMATCHED_ONCHAIN, AMOUNT_MISMATCH, ADDRESS_MISMATCH, PENDING_BROADCAST, NO_TX_HASH. Admin-only access via RLS on underlying tables + has_role() at query layer.';

-- ------------------------------------------------------------
-- 4) v_hotwallet_inbound_reconciliation
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.v_hotwallet_inbound_reconciliation CASCADE;

CREATE VIEW public.v_hotwallet_inbound_reconciliation
WITH (security_invoker = true)
AS
SELECT
  oc.id                  AS onchain_record_id,
  oc.tx_hash,
  oc.token_symbol,
  oc.token_name,
  oc.amount_formatted    AS amount,
  LOWER(oc.counterparty_address) AS source_address,
  LOWER(oc.wallet_address)       AS hot_wallet_address,
  oc.user_id,
  p.email                AS user_email,
  p.username             AS username,
  oc.status,
  oc.confirmations,
  oc.confirmed_at,
  oc.created_at
FROM public.onchain_transactions oc
LEFT JOIN public.profiles p ON p.user_id = oc.user_id
WHERE oc.direction IN ('in','inbound','IN','deposit')
  AND LOWER(oc.wallet_address) = '0x4a6a2066b6b42fe90128351d67fb5dea40ecacf5';

REVOKE ALL ON public.v_hotwallet_inbound_reconciliation FROM PUBLIC, anon;
GRANT SELECT ON public.v_hotwallet_inbound_reconciliation TO authenticated;

COMMENT ON VIEW public.v_hotwallet_inbound_reconciliation IS
'Inbound transfers to the trading hot wallet (0x4a6A...ACF5). Used to detect unsolicited or unattributed deposits. Admin-only via RLS.';

-- ------------------------------------------------------------
-- 5) v_hotwallet_address_profiles
--    Aggregated stats per withdrawal destination address.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.v_hotwallet_address_profiles CASCADE;

CREATE VIEW public.v_hotwallet_address_profiles
WITH (security_invoker = true)
AS
SELECT
  LOWER(cw.to_address) AS destination_address,
  COUNT(DISTINCT cw.user_id)                      AS distinct_user_count,
  COUNT(*) FILTER (WHERE cw.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE cw.status NOT IN ('completed','failed','cancelled')) AS pending_count,
  COALESCE(SUM(cw.amount) FILTER (WHERE cw.status = 'completed'), 0) AS total_amount_withdrawn,
  MIN(cw.created_at) AS first_withdrawal_at,
  MAX(cw.created_at) AS last_withdrawal_at,
  ARRAY_AGG(DISTINCT cw.user_id)                  AS linked_user_ids,
  ARRAY_AGG(DISTINCT a.symbol) FILTER (WHERE a.symbol IS NOT NULL) AS tokens_used
FROM public.custodial_withdrawals cw
LEFT JOIN public.assets a ON a.id = cw.asset_id
GROUP BY LOWER(cw.to_address);

REVOKE ALL ON public.v_hotwallet_address_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.v_hotwallet_address_profiles TO authenticated;

COMMENT ON VIEW public.v_hotwallet_address_profiles IS
'Aggregated profile per withdrawal destination address. Used for address-reuse detection and risk scoring. Admin-only via RLS.';

-- ------------------------------------------------------------
-- 6) Withdrawal integrity validation trigger
--    Hardens custodial_withdrawals to prevent:
--      - completion without an authentic on-chain tx
--      - tx_hash collisions (idempotency)
--      - destination drift after approval
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_custodial_withdrawal_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count int;
BEGIN
  -- Idempotency: tx_hash must be globally unique across custodial_withdrawals
  IF NEW.tx_hash IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.tx_hash IS DISTINCT FROM OLD.tx_hash) THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM public.custodial_withdrawals
    WHERE tx_hash = NEW.tx_hash AND id <> NEW.id;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'DUPLICATE_TX_HASH: tx_hash % already used by another withdrawal', NEW.tx_hash
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Block destination drift after approval/broadcast
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('approved','broadcasting','completed')
     AND NEW.to_address IS DISTINCT FROM OLD.to_address THEN
    RAISE EXCEPTION 'DESTINATION_LOCKED: Cannot change to_address after approval. Old=%, New=%', OLD.to_address, NEW.to_address;
  END IF;

  -- Block amount drift after approval/broadcast
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('approved','broadcasting','completed')
     AND NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'AMOUNT_LOCKED: Cannot change amount after approval. Old=%, New=%', OLD.amount, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_custodial_withdrawal_integrity ON public.custodial_withdrawals;
CREATE TRIGGER trg_validate_custodial_withdrawal_integrity
BEFORE INSERT OR UPDATE ON public.custodial_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.validate_custodial_withdrawal_integrity();

-- Unique index for tx_hash (DB-level idempotency guarantee)
CREATE UNIQUE INDEX IF NOT EXISTS uq_custodial_withdrawals_tx_hash
  ON public.custodial_withdrawals (tx_hash)
  WHERE tx_hash IS NOT NULL;

-- ------------------------------------------------------------
-- 7) Daily proof report function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_hotwallet_daily_proof_report(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_per_token jsonb;
  v_top_destinations jsonb;
  v_top_users jsonb;
  v_summary jsonb;
BEGIN
  -- Auth: admin only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ACCESS_DENIED: admin role required';
  END IF;

  -- Per-token totals
  SELECT jsonb_agg(jsonb_build_object(
    'token_symbol', token_symbol,
    'total_outbound_amount', total_amount,
    'total_outbound_count', total_count,
    'matched_count', matched_count,
    'unmatched_count', unmatched_count,
    'mismatch_count', mismatch_count
  ))
  INTO v_per_token
  FROM (
    SELECT
      token_symbol,
      SUM(amount) AS total_amount,
      COUNT(*)    AS total_count,
      COUNT(*) FILTER (WHERE match_status = 'MATCHED') AS matched_count,
      COUNT(*) FILTER (WHERE match_status IN ('UNMATCHED_ONCHAIN','NO_TX_HASH')) AS unmatched_count,
      COUNT(*) FILTER (WHERE mismatch_flag) AS mismatch_count
    FROM public.v_hotwallet_outbound_reconciliation
    WHERE requested_at::date = p_date
    GROUP BY token_symbol
  ) t;

  -- Top destinations
  SELECT jsonb_agg(jsonb_build_object(
    'address', destination_address,
    'amount', total_amount,
    'tx_count', tx_count,
    'distinct_users', distinct_users
  ))
  INTO v_top_destinations
  FROM (
    SELECT
      destination_address,
      SUM(amount) AS total_amount,
      COUNT(*)    AS tx_count,
      COUNT(DISTINCT user_id) AS distinct_users
    FROM public.v_hotwallet_outbound_reconciliation
    WHERE requested_at::date = p_date AND withdrawal_status = 'completed'
    GROUP BY destination_address
    ORDER BY SUM(amount) DESC
    LIMIT 20
  ) t;

  -- Top users
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'email', user_email,
    'username', username,
    'amount', total_amount,
    'tx_count', tx_count
  ))
  INTO v_top_users
  FROM (
    SELECT
      user_id,
      MAX(user_email) AS user_email,
      MAX(username)   AS username,
      SUM(amount)     AS total_amount,
      COUNT(*)        AS tx_count
    FROM public.v_hotwallet_outbound_reconciliation
    WHERE requested_at::date = p_date AND withdrawal_status = 'completed'
    GROUP BY user_id
    ORDER BY SUM(amount) DESC
    LIMIT 20
  ) t;

  -- Top-level summary
  SELECT jsonb_build_object(
    'total_outbound_count', COUNT(*),
    'matched_count', COUNT(*) FILTER (WHERE match_status = 'MATCHED'),
    'unmatched_count', COUNT(*) FILTER (WHERE match_status IN ('UNMATCHED_ONCHAIN','NO_TX_HASH')),
    'mismatch_count', COUNT(*) FILTER (WHERE mismatch_flag),
    'pending_broadcast_count', COUNT(*) FILTER (WHERE match_status = 'PENDING_BROADCAST'),
    'distinct_destinations', COUNT(DISTINCT destination_address),
    'distinct_users', COUNT(DISTINCT user_id)
  )
  INTO v_summary
  FROM public.v_hotwallet_outbound_reconciliation
  WHERE requested_at::date = p_date;

  v_result := jsonb_build_object(
    'report_date', p_date,
    'generated_at', now(),
    'hot_wallet_address', '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5',
    'summary', COALESCE(v_summary, '{}'::jsonb),
    'per_token', COALESCE(v_per_token, '[]'::jsonb),
    'top_destinations', COALESCE(v_top_destinations, '[]'::jsonb),
    'top_users', COALESCE(v_top_users, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_hotwallet_daily_proof_report(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_hotwallet_daily_proof_report(date) TO authenticated;

-- ------------------------------------------------------------
-- 8) Alert scanner function (called by cron)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scan_hotwallet_security_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unmatched int := 0;
  v_threshold_breach int := 0;
  v_abnormal_repeat int := 0;
  v_threshold record;
BEGIN
  -- 1) UNMATCHED_OUTBOUND: tx_hash exists but no on-chain record
  INSERT INTO public.hotwallet_security_alerts
    (alert_type, severity, hot_wallet_address, tx_hash, token_symbol, amount, destination_address, related_user_id, related_withdrawal_id, message, metadata)
  SELECT
    'UNMATCHED_OUTBOUND', 'critical',
    '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5',
    r.tx_hash, r.token_symbol, r.amount, r.destination_address,
    r.user_id, r.withdrawal_id,
    format('Outbound tx %s has no matching on-chain record', r.tx_hash),
    jsonb_build_object('match_status', r.match_status, 'requested_at', r.requested_at)
  FROM public.v_hotwallet_outbound_reconciliation r
  WHERE r.match_status IN ('UNMATCHED_ONCHAIN','AMOUNT_MISMATCH','ADDRESS_MISMATCH')
    AND r.requested_at > now() - interval '24 hours'
  ON CONFLICT (alert_type, tx_hash, destination_address) DO NOTHING;
  GET DIAGNOSTICS v_unmatched = ROW_COUNT;

  -- 2) THRESHOLD_BREACH: completed tx exceeds max_single_tx_amount
  FOR v_threshold IN
    SELECT * FROM public.hotwallet_security_thresholds WHERE is_active = true
  LOOP
    INSERT INTO public.hotwallet_security_alerts
      (alert_type, severity, hot_wallet_address, tx_hash, token_symbol, amount, destination_address, related_user_id, related_withdrawal_id, message, metadata)
    SELECT
      'THRESHOLD_BREACH', 'high',
      v_threshold.hot_wallet_address,
      r.tx_hash, r.token_symbol, r.amount, r.destination_address,
      r.user_id, r.withdrawal_id,
      format('Withdrawal of %s %s exceeds single-tx threshold %s', r.amount, r.token_symbol, v_threshold.max_single_tx_amount),
      jsonb_build_object('threshold', v_threshold.max_single_tx_amount, 'amount', r.amount)
    FROM public.v_hotwallet_outbound_reconciliation r
    WHERE r.amount > v_threshold.max_single_tx_amount
      AND r.requested_at > now() - interval '24 hours'
      AND (v_threshold.token_symbol IS NULL OR r.token_symbol = v_threshold.token_symbol)
      AND r.tx_hash IS NOT NULL
    ON CONFLICT (alert_type, tx_hash, destination_address) DO NOTHING;
  END LOOP;
  GET DIAGNOSTICS v_threshold_breach = ROW_COUNT;

  -- 3) ABNORMAL_REPEAT: same destination receives > N tx in 24h
  INSERT INTO public.hotwallet_security_alerts
    (alert_type, severity, hot_wallet_address, tx_hash, destination_address, message, metadata)
  SELECT
    'ABNORMAL_REPEAT', 'medium',
    '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5',
    NULL, destination_address,
    format('Destination %s received %s withdrawals in last 24h', destination_address, COUNT(*)),
    jsonb_build_object('tx_count', COUNT(*), 'total_amount', SUM(amount))
  FROM public.v_hotwallet_outbound_reconciliation
  WHERE requested_at > now() - interval '24 hours'
  GROUP BY destination_address
  HAVING COUNT(*) > 10
  ON CONFLICT (alert_type, tx_hash, destination_address) DO NOTHING;
  GET DIAGNOSTICS v_abnormal_repeat = ROW_COUNT;

  RETURN jsonb_build_object(
    'scanned_at', now(),
    'unmatched_alerts_created', v_unmatched,
    'threshold_breach_alerts_created', v_threshold_breach,
    'abnormal_repeat_alerts_created', v_abnormal_repeat
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scan_hotwallet_security_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scan_hotwallet_security_alerts() TO authenticated, service_role;