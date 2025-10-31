-- Drop existing function
DROP FUNCTION IF EXISTS calculate_retroactive_commissions();
DROP FUNCTION IF EXISTS pay_retroactive_commissions();

-- Create function to calculate retroactive commissions
CREATE OR REPLACE FUNCTION calculate_retroactive_commissions()
RETURNS TABLE (
  purchase_id UUID,
  buyer_id UUID,
  badge_name TEXT,
  purchase_amount NUMERIC,
  purchase_date TIMESTAMPTZ,
  sponsor_id UUID,
  missing_commission NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id as purchase_id,
    bp.user_id as buyer_id,
    bp.badge_name::TEXT,
    bp.bsk_amount as purchase_amount,
    bp.created_at as purchase_date,
    rt.ancestor_id as sponsor_id,
    (bp.bsk_amount * 0.10) as missing_commission
  FROM badge_purchases bp
  INNER JOIN referral_tree rt ON rt.user_id = bp.user_id AND rt.level = 1
  WHERE bp.created_at >= '2025-10-25'
    AND bp.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM referral_commissions rc 
      WHERE rc.payer_id = bp.user_id 
      AND rc.created_at >= bp.created_at 
      AND rc.created_at <= bp.created_at + INTERVAL '5 minutes'
      AND rc.level = 1
    )
  ORDER BY bp.created_at DESC;
END;
$$;

-- Create function to pay retroactive commissions
CREATE OR REPLACE FUNCTION pay_retroactive_commissions()
RETURNS TABLE (
  total_sponsors_credited INTEGER,
  total_commissions_paid NUMERIC,
  total_entries_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_record RECORD;
  v_sponsors_credited INTEGER := 0;
  v_total_paid NUMERIC := 0;
  v_entries_created INTEGER := 0;
  v_sponsor_totals JSONB := '{}'::JSONB;
BEGIN
  -- Process each missing commission
  FOR v_missing_record IN 
    SELECT * FROM calculate_retroactive_commissions()
  LOOP
    -- Track sponsor totals
    IF NOT (v_sponsor_totals ? v_missing_record.sponsor_id::TEXT) THEN
      v_sponsor_totals := jsonb_set(v_sponsor_totals, ARRAY[v_missing_record.sponsor_id::TEXT], '0');
    END IF;
    
    v_sponsor_totals := jsonb_set(
      v_sponsor_totals, 
      ARRAY[v_missing_record.sponsor_id::TEXT], 
      to_jsonb((v_sponsor_totals->>v_missing_record.sponsor_id::TEXT)::NUMERIC + v_missing_record.missing_commission)
    );
    
    -- Create commission record
    INSERT INTO referral_commissions (
      earner_id, payer_id, level, event_type, commission_type, 
      bsk_amount, destination, status, metadata
    ) VALUES (
      v_missing_record.sponsor_id,
      v_missing_record.buyer_id,
      1,
      'badge_purchase',
      'badge_subscription',
      v_missing_record.missing_commission,
      'withdrawable',
      'settled',
      jsonb_build_object(
        'retroactive', true,
        'purchase_id', v_missing_record.purchase_id,
        'badge_name', v_missing_record.badge_name,
        'purchase_date', v_missing_record.purchase_date
      )
    );
    
    v_entries_created := v_entries_created + 1;
    v_total_paid := v_total_paid + v_missing_record.missing_commission;
  END LOOP;
  
  -- Update all sponsor balances in one go
  FOR v_missing_record IN 
    SELECT DISTINCT sponsor_id FROM calculate_retroactive_commissions()
  LOOP
    DECLARE
      v_amount NUMERIC;
    BEGIN
      v_amount := (v_sponsor_totals->>v_missing_record.sponsor_id::TEXT)::NUMERIC;
      
      -- Update sponsor balance
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
      VALUES (v_missing_record.sponsor_id, v_amount, v_amount)
      ON CONFLICT (user_id) DO UPDATE SET
        withdrawable_balance = user_bsk_balances.withdrawable_balance + v_amount,
        total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + v_amount,
        updated_at = NOW();
      
      -- Create bonus ledger entry
      INSERT INTO bonus_ledger (user_id, type, amount_bsk, asset, meta_json, usd_value)
      VALUES (
        v_missing_record.sponsor_id,
        'badge_purchase_commission',
        v_amount,
        'BSK',
        jsonb_build_object('retroactive', true, 'date', CURRENT_DATE),
        0
      );
      
      v_sponsors_credited := v_sponsors_credited + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_sponsors_credited, v_total_paid, v_entries_created;
END;
$$;

-- Create audit table for retroactive payments
CREATE TABLE IF NOT EXISTS retroactive_commission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  total_sponsors_credited INTEGER,
  total_commissions_paid NUMERIC,
  total_entries_created INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE retroactive_commission_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view retroactive commission audits"
ON retroactive_commission_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
