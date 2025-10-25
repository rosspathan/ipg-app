-- Fix search_path for new functions
CREATE OR REPLACE FUNCTION get_commission_rate_for_level(
  p_level INTEGER,
  p_level_percentages JSONB
) RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  v_rate := (p_level_percentages->>p_level::text)::NUMERIC;
  RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = 'public';

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
    SELECT bp.id as purchase_id, bp.user_id as buyer_id, bp.bsk_amount
    FROM badge_purchases bp WHERE bp.status = 'completed'
  ),
  expected_commissions AS (
    SELECT
      rt.ancestor_id as sponsor_id,
      bs.buyer_id as payer_id,
      rt.level as level_num,
      bs.purchase_id as badge_purchase_id,
      (bs.bsk_amount * get_commission_rate_for_level(
        rt.level,
        (SELECT level_percentages FROM team_referral_settings WHERE enabled = true LIMIT 1)
      ) / 100) as expected_amount
    FROM badge_sales bs
    JOIN referral_tree rt ON rt.user_id = bs.buyer_id
    WHERE rt.level <= COALESCE(
      (SELECT max_levels FROM team_referral_settings WHERE enabled = true LIMIT 1), 50
    )
  ),
  actual_commissions AS (
    SELECT
      rc.earner_id, rc.payer_id, rc.level as level_num, rc.event_id,
      SUM(rc.bsk_amount) as paid_amount
    FROM referral_commissions rc
    WHERE rc.commission_type IN ('badge_purchase', 'badge_purchase_retroactive', 'direct_commission')
    AND rc.status = 'settled'
    GROUP BY rc.earner_id, rc.payer_id, rc.level, rc.event_id
  )
  SELECT
    ec.sponsor_id, ec.payer_id, ec.level_num, ec.badge_purchase_id,
    ec.expected_amount, COALESCE(ac.paid_amount, 0),
    (ec.expected_amount - COALESCE(ac.paid_amount, 0))
  FROM expected_commissions ec
  LEFT JOIN actual_commissions ac 
    ON ac.earner_id = ec.sponsor_id AND ac.payer_id = ec.payer_id
    AND ac.level_num = ec.level_num AND ac.event_id = ec.badge_purchase_id
  WHERE (ec.expected_amount - COALESCE(ac.paid_amount, 0)) > 0.01 AND ec.expected_amount > 0
  ORDER BY ec.sponsor_id, ec.level_num;
END;
$$ LANGUAGE plpgsql
SET search_path = 'public';

CREATE OR REPLACE FUNCTION pay_retroactive_commissions()
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
  FOR v_rec IN SELECT * FROM calculate_retroactive_commissions()
  LOOP
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
$$ LANGUAGE plpgsql
SET search_path = 'public';