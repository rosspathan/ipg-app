-- Phase 1: Fix Database Schema for Badge Commission System

-- Step 1: Clean up existing permissive RLS policies on user_bsk_balances
DROP POLICY IF EXISTS "System can insert BSK balances via functions" ON user_bsk_balances;
DROP POLICY IF EXISTS "System can update BSK balances via functions" ON user_bsk_balances;
DROP POLICY IF EXISTS "Users can create own BSK balances" ON user_bsk_balances;

-- Step 2: Add strict write policy - ONLY service_role can write
CREATE POLICY "service_role_only_writes" ON user_bsk_balances
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Create monitoring function for badge commission health
CREATE OR REPLACE FUNCTION check_badge_commission_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  missing_count INTEGER;
  drift_count INTEGER;
BEGIN
  -- Count missing commissions
  SELECT COUNT(*) INTO missing_count
  FROM badge_commission_health
  WHERE has_ledger_entry = false AND has_balance_record = false;
  
  -- Count balance drifts
  SELECT COUNT(*) INTO drift_count
  FROM badge_commission_health
  WHERE balance_drift != 0;
  
  -- Build result
  result := json_build_object(
    'missing_commissions', missing_count,
    'balance_drifts', drift_count,
    'total_checked', (SELECT COUNT(*) FROM badge_commission_health),
    'health_status', CASE 
      WHEN missing_count = 0 AND drift_count = 0 THEN 'healthy'
      WHEN missing_count > 0 OR drift_count > 10 THEN 'critical'
      ELSE 'warning'
    END,
    'checked_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- Step 4: Add unique constraint for idempotency on referral_commissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_commissions_unique_badge_v2
  ON referral_commissions(earner_id, payer_id, commission_type, event_type)
  WHERE event_type IN ('badge', 'badge_subscription');