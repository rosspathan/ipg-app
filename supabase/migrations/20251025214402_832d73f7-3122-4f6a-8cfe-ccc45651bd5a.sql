-- Ensure referral_tree has direct_sponsor_id for correct hierarchy
ALTER TABLE public.referral_tree
ADD COLUMN IF NOT EXISTS direct_sponsor_id UUID;

-- Audit table for retroactive commission executions
CREATE TABLE IF NOT EXISTS public.retroactive_commission_audit (
  id BIGSERIAL PRIMARY KEY,
  executed_by UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress','completed','failed')),
  total_sponsors_credited INTEGER,
  total_commissions_paid NUMERIC,
  total_entries_created INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_completed_at TIMESTAMPTZ
);

-- Enable RLS and restrict write access; admins can read
ALTER TABLE public.retroactive_commission_audit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='retroactive_commission_audit' AND policyname='Admin can view retroactive audit'
  ) THEN
    CREATE POLICY "Admin can view retroactive audit"
    ON public.retroactive_commission_audit
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    ));
  END IF;
END $$;

-- Helper to read level percentage from settings JSON
CREATE OR REPLACE FUNCTION public.get_commission_rate_for_level(
  p_level INTEGER,
  p_level_percentages JSONB
) RETURNS NUMERIC AS $$
DECLARE v_rate NUMERIC; BEGIN
  v_rate := (p_level_percentages->>p_level::text)::NUMERIC;
  RETURN COALESCE(v_rate, 0);
END; $$ LANGUAGE plpgsql IMMUTABLE SET search_path = 'public';

-- Calculate expected vs actual commissions per purchase/level
CREATE OR REPLACE FUNCTION public.calculate_retroactive_commissions()
RETURNS TABLE(
  sponsor_id UUID,
  payer_id UUID,
  level_num INTEGER,
  badge_purchase_id UUID,
  should_have_earned NUMERIC,
  actually_earned NUMERIC,
  missing_commission NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH settings AS (
    SELECT level_percentages, max_levels
    FROM team_referral_settings
    WHERE enabled = true
    ORDER BY created_at DESC
    LIMIT 1
  ), badge_sales AS (
    SELECT bp.id as purchase_id, bp.user_id as buyer_id, bp.bsk_amount
    FROM badge_purchases bp
    WHERE bp.status = 'completed'
  ), expected AS (
    SELECT
      rt.ancestor_id as sponsor_id,
      bs.buyer_id as payer_id,
      rt.level as level_num,
      bs.purchase_id as badge_purchase_id,
      (bs.bsk_amount * get_commission_rate_for_level(rt.level, (SELECT level_percentages FROM settings)) / 100) as expected_amount
    FROM badge_sales bs
    JOIN referral_tree rt ON rt.user_id = bs.buyer_id
    WHERE rt.level <= COALESCE((SELECT max_levels FROM settings), 50)
  ), actual AS (
    SELECT
      rc.earner_id, rc.payer_id, rc.level as level_num, rc.event_id,
      SUM(rc.bsk_amount) as paid_amount
    FROM referral_commissions rc
    WHERE rc.commission_type IN ('badge_purchase', 'badge_purchase_retroactive', 'direct_commission')
      AND rc.status = 'settled'
    GROUP BY rc.earner_id, rc.payer_id, rc.level, rc.event_id
  )
  SELECT
    e.sponsor_id, e.payer_id, e.level_num, e.badge_purchase_id,
    e.expected_amount, COALESCE(a.paid_amount, 0),
    (e.expected_amount - COALESCE(a.paid_amount, 0))
  FROM expected e
  LEFT JOIN actual a
    ON a.earner_id = e.sponsor_id AND a.payer_id = e.payer_id
    AND a.level_num = e.level_num AND a.event_id = e.badge_purchase_id
  WHERE (e.expected_amount - COALESCE(a.paid_amount, 0)) > 0.01 AND e.expected_amount > 0
  ORDER BY e.sponsor_id, e.level_num;
END; $$ LANGUAGE plpgsql SET search_path = 'public';

-- Pay the missing commissions and log/audit
CREATE OR REPLACE FUNCTION public.pay_retroactive_commissions()
RETURNS TABLE(
  total_sponsors_credited INTEGER,
  total_commissions_paid NUMERIC,
  total_entries_created INTEGER
) AS $$
DECLARE
  v_total_sponsors INTEGER := 0;
  v_total_paid NUMERIC := 0;
  v_total_entries INTEGER := 0;
  v_rec RECORD;
  v_earner_badge TEXT;
BEGIN
  FOR v_rec IN SELECT * FROM public.calculate_retroactive_commissions() LOOP
    SELECT current_badge INTO v_earner_badge
    FROM user_badge_holdings WHERE user_id = v_rec.sponsor_id LIMIT 1;

    INSERT INTO referral_commissions (
      earner_id, payer_id, level, event_type, event_id, bsk_amount,
      destination, status, earner_badge_at_event, commission_type, created_at, settled_at
    ) VALUES (
      v_rec.sponsor_id, v_rec.payer_id, v_rec.level_num, 'badge_purchase',
      v_rec.badge_purchase_id, v_rec.missing_commission, 'withdrawable', 'settled',
      COALESCE(v_earner_badge, 'NONE'), 'badge_purchase_retroactive', NOW(), NOW()
    );

    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (v_rec.sponsor_id, v_rec.missing_commission, v_rec.missing_commission)
    ON CONFLICT (user_id) DO UPDATE SET 
      withdrawable_balance = user_bsk_balances.withdrawable_balance + EXCLUDED.withdrawable_balance,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + EXCLUDED.total_earned_withdrawable,
      updated_at = NOW();

    INSERT INTO bonus_ledger (user_id, amount_bsk, balance_type, transaction_type, reference_id, metadata, created_at)
    VALUES (v_rec.sponsor_id, v_rec.missing_commission, 'withdrawable', 'retroactive_commission',
      v_rec.badge_purchase_id::text, jsonb_build_object('level', v_rec.level_num, 'payer_id', v_rec.payer_id,
        'commission_type', 'badge_purchase_retroactive', 'retroactive', true), NOW());

    v_total_paid := v_total_paid + v_rec.missing_commission;
    v_total_entries := v_total_entries + 1;
  END LOOP;

  SELECT COUNT(DISTINCT sponsor_id) INTO v_total_sponsors FROM public.calculate_retroactive_commissions();
  RETURN QUERY SELECT v_total_sponsors, v_total_paid, v_total_entries;
END; $$ LANGUAGE plpgsql SET search_path = 'public';