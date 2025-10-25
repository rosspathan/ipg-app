-- Drop existing function and policies if they exist
DROP FUNCTION IF EXISTS calculate_retroactive_commissions();
DROP POLICY IF EXISTS "Admin can view retroactive audit" ON retroactive_commission_audit;
DROP POLICY IF EXISTS "System can insert retroactive audit" ON retroactive_commission_audit;

-- Add missing columns to team_referral_settings
ALTER TABLE team_referral_settings 
  ADD COLUMN IF NOT EXISTS level_percentages JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_levels INTEGER DEFAULT 50;

-- Configure multi-level commission structure
UPDATE team_referral_settings
SET level_percentages = '{
  "1": 10.0, "2": 5.0, "3": 3.0, "4": 2.0, "5": 2.0,
  "6": 1.0, "7": 1.0, "8": 1.0, "9": 1.0, "10": 1.0,
  "11": 0.5, "12": 0.5, "13": 0.5, "14": 0.5, "15": 0.5,
  "16": 0.5, "17": 0.5, "18": 0.5, "19": 0.5, "20": 0.5,
  "21": 0.5, "22": 0.5, "23": 0.5, "24": 0.5, "25": 0.5,
  "26": 0.5, "27": 0.5, "28": 0.5, "29": 0.5, "30": 0.5,
  "31": 0.5, "32": 0.5, "33": 0.5, "34": 0.5, "35": 0.5,
  "36": 0.5, "37": 0.5, "38": 0.5, "39": 0.5, "40": 0.5,
  "41": 0.5, "42": 0.5, "43": 0.5, "44": 0.5, "45": 0.5,
  "46": 0.5, "47": 0.5, "48": 0.5, "49": 0.5, "50": 0.5
}'::jsonb,
max_levels = 50
WHERE enabled = true;

-- Create helper function
CREATE OR REPLACE FUNCTION get_commission_rate_for_level(
  p_level INTEGER,
  p_level_percentages JSONB
) RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((p_level_percentages->>p_level::text)::NUMERIC, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create reconciliation function
CREATE OR REPLACE FUNCTION calculate_retroactive_commissions()
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
  WITH badge_sales AS (
    SELECT bp.id as purchase_id, bp.user_id as buyer_id, bp.bsk_amount, bp.created_at
    FROM badge_purchases bp WHERE bp.status = 'completed'
  ),
  expected_commissions AS (
    SELECT
      rt.ancestor_id as sponsor_id, bs.buyer_id as payer_id, rt.level as level_num,
      bs.purchase_id as badge_purchase_id, bs.bsk_amount,
      get_commission_rate_for_level(rt.level,
        (SELECT level_percentages FROM team_referral_settings WHERE enabled = true LIMIT 1)) as rate,
      (bs.bsk_amount * get_commission_rate_for_level(rt.level,
        (SELECT level_percentages FROM team_referral_settings WHERE enabled = true LIMIT 1)) / 100) as expected_amount
    FROM badge_sales bs
    JOIN referral_tree rt ON rt.user_id = bs.buyer_id
    WHERE rt.level <= COALESCE((SELECT max_levels FROM team_referral_settings WHERE enabled = true LIMIT 1), 50)
  ),
  actual_commissions AS (
    SELECT rc.earner_id, rc.payer_id, rc.level as level_num, rc.event_id, SUM(rc.bsk_amount) as paid_amount
    FROM referral_commissions rc
    WHERE rc.commission_type IN ('badge_purchase', 'badge_purchase_retroactive', 'direct_commission')
    AND rc.status = 'settled'
    GROUP BY rc.earner_id, rc.payer_id, rc.level, rc.event_id
  )
  SELECT ec.sponsor_id, ec.payer_id, ec.level_num, ec.badge_purchase_id,
    ec.expected_amount as should_have_earned, COALESCE(ac.paid_amount, 0) as actually_earned,
    (ec.expected_amount - COALESCE(ac.paid_amount, 0)) as missing_commission
  FROM expected_commissions ec
  LEFT JOIN actual_commissions ac 
    ON ac.earner_id = ec.sponsor_id AND ac.payer_id = ec.payer_id
    AND ac.level_num = ec.level_num AND ac.event_id = ec.badge_purchase_id
  WHERE (ec.expected_amount - COALESCE(ac.paid_amount, 0)) > 0.01 AND ec.expected_amount > 0
  ORDER BY ec.sponsor_id, ec.level_num;
END;
$$ LANGUAGE plpgsql;

-- Create payment function
CREATE OR REPLACE FUNCTION pay_retroactive_commissions()
RETURNS TABLE(total_sponsors_credited INTEGER, total_commissions_paid NUMERIC, total_entries_created INTEGER) AS $$
DECLARE
  v_total_sponsors INTEGER := 0; v_total_paid NUMERIC := 0; v_total_entries INTEGER := 0;
  v_rec RECORD; v_earner_badge TEXT;
BEGIN
  FOR v_rec IN SELECT * FROM calculate_retroactive_commissions()
  LOOP
    SELECT current_badge INTO v_earner_badge FROM user_badge_holdings WHERE user_id = v_rec.sponsor_id LIMIT 1;

    INSERT INTO referral_commissions (earner_id, payer_id, level, event_type, event_id, bsk_amount,
      destination, status, earner_badge_at_event, commission_type, created_at, settled_at)
    VALUES (v_rec.sponsor_id, v_rec.payer_id, v_rec.level_num, 'badge_purchase', v_rec.badge_purchase_id,
      v_rec.missing_commission, 'withdrawable', 'settled', COALESCE(v_earner_badge, 'NONE'),
      'badge_purchase_retroactive', NOW(), NOW());

    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (v_rec.sponsor_id, v_rec.missing_commission, v_rec.missing_commission)
    ON CONFLICT (user_id) DO UPDATE SET 
      withdrawable_balance = user_bsk_balances.withdrawable_balance + v_rec.missing_commission,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + v_rec.missing_commission,
      updated_at = NOW();

    INSERT INTO bonus_ledger (user_id, amount_bsk, balance_type, transaction_type, reference_id, metadata, created_at)
    VALUES (v_rec.sponsor_id, v_rec.missing_commission, 'withdrawable', 'retroactive_commission',
      v_rec.badge_purchase_id::text, jsonb_build_object('level', v_rec.level_num, 'payer_id', v_rec.payer_id,
        'commission_type', 'badge_purchase_retroactive', 'retroactive', true), NOW());

    v_total_paid := v_total_paid + v_rec.missing_commission;
    v_total_entries := v_total_entries + 1;
  END LOOP;

  SELECT COUNT(DISTINCT sponsor_id) INTO v_total_sponsors FROM calculate_retroactive_commissions();
  RETURN QUERY SELECT v_total_sponsors, v_total_paid, v_total_entries;
END;
$$ LANGUAGE plpgsql;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_referral_commissions_earner_payer_level ON referral_commissions(earner_id, payer_id, level);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_event_id ON referral_commissions(event_id);

-- Create audit table
CREATE TABLE IF NOT EXISTS retroactive_commission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_completed_at TIMESTAMPTZ,
  total_sponsors_credited INTEGER,
  total_commissions_paid NUMERIC,
  total_entries_created INTEGER,
  executed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'in_progress',
  notes TEXT
);

ALTER TABLE retroactive_commission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view retroactive audit" ON retroactive_commission_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert retroactive audit" ON retroactive_commission_audit
  FOR INSERT WITH CHECK (true);