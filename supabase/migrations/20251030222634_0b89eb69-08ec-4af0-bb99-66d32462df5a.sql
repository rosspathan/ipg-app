-- ============================================================================
-- COMPREHENSIVE BSK BADGE PURCHASE FIX (CORRECTED)
-- ============================================================================

-- ============================================================================
-- PHASE 1: ONE-TIME DATA CORRECTION FOR AFFECTED USER
-- ============================================================================

-- Deduct 5,000 BSK from yowoji9551@keevle.com
UPDATE user_bsk_balances
SET 
  withdrawable_balance = withdrawable_balance - 5000,
  updated_at = NOW()
WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae'
  AND withdrawable_balance >= 5000;

-- Create ledger entry for the correction
INSERT INTO bsk_withdrawable_ledger (
  user_id,
  amount_bsk,
  amount_inr,
  rate_snapshot,
  tx_type,
  balance_before,
  balance_after,
  reference_id,
  notes,
  created_at
)
SELECT 
  '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae',
  -5000,
  0,
  1,
  'badge_purchase_correction',
  10000,
  5000,
  'f73a05ab-381c-4e9e-bc8a-a00a3deb5b77',
  'Manual correction: VIP badge purchase deduction that failed to execute due to atomic_badge_purchase bug',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM bsk_withdrawable_ledger 
  WHERE reference_id = 'f73a05ab-381c-4e9e-bc8a-a00a3deb5b77' 
    AND tx_type IN ('badge_purchase', 'badge_purchase_correction')
);

-- ============================================================================
-- PHASE 2: CREATE AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bsk_balance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  old_withdrawable NUMERIC,
  new_withdrawable NUMERIC,
  old_holding NUMERIC,
  new_holding NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID,
  context TEXT
);

CREATE INDEX IF NOT EXISTS idx_bsk_audit_user_id ON bsk_balance_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_bsk_audit_changed_at ON bsk_balance_audit_log(changed_at DESC);

ALTER TABLE bsk_balance_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all audit logs" ON bsk_balance_audit_log;
CREATE POLICY "Admin can view all audit logs"
  ON bsk_balance_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own audit logs" ON bsk_balance_audit_log;
CREATE POLICY "Users can view own audit logs"
  ON bsk_balance_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- PHASE 3: CREATE AUDIT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_bsk_balance_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.withdrawable_balance IS DISTINCT FROM NEW.withdrawable_balance 
     OR OLD.holding_balance IS DISTINCT FROM NEW.holding_balance THEN
    
    INSERT INTO bsk_balance_audit_log (
      user_id,
      operation,
      old_withdrawable,
      new_withdrawable,
      old_holding,
      new_holding,
      changed_by,
      context
    ) VALUES (
      NEW.user_id,
      TG_OP,
      OLD.withdrawable_balance,
      NEW.withdrawable_balance,
      OLD.holding_balance,
      NEW.holding_balance,
      auth.uid(),
      substring(current_query(), 1, 500)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_bsk_changes ON user_bsk_balances;
CREATE TRIGGER trigger_log_bsk_changes
AFTER UPDATE ON user_bsk_balances
FOR EACH ROW
EXECUTE FUNCTION log_bsk_balance_changes();

-- ============================================================================
-- PHASE 4: ADD BALANCE CONSTRAINTS
-- ============================================================================

ALTER TABLE user_bsk_balances 
DROP CONSTRAINT IF EXISTS check_non_negative_balances;

ALTER TABLE user_bsk_balances 
ADD CONSTRAINT check_non_negative_balances 
CHECK (withdrawable_balance >= 0 AND holding_balance >= 0);

-- ============================================================================
-- PHASE 5: FIX ATOMIC_BADGE_PURCHASE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id UUID,
  p_badge_name TEXT,
  p_previous_badge TEXT,
  p_bsk_amount NUMERIC,
  p_payment_ref TEXT,
  p_payment_method TEXT,
  p_unlock_levels INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawable_balance NUMERIC;
  v_holding_balance NUMERIC;
  v_total_available NUMERIC;
  v_deduct_from_holding NUMERIC := 0;
  v_deduct_from_withdrawable NUMERIC := 0;
  v_new_withdrawable NUMERIC;
  v_new_holding NUMERIC;
  v_purchase_id UUID;
  v_result JSON;
  v_existing_badge TEXT;
  v_balance_updated BOOLEAN;
BEGIN
  -- Lock and fetch BOTH balances
  SELECT withdrawable_balance, holding_balance 
  INTO v_withdrawable_balance, v_holding_balance
  FROM user_bsk_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  v_withdrawable_balance := COALESCE(v_withdrawable_balance, 0);
  v_holding_balance := COALESCE(v_holding_balance, 0);
  v_total_available := v_withdrawable_balance + v_holding_balance;
  
  -- Validate sufficient balance
  IF v_total_available < p_bsk_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Required %, Available %', p_bsk_amount, v_total_available;
  END IF;
  
  -- Check for duplicate badge
  IF EXISTS (
    SELECT 1 FROM user_badge_holdings 
    WHERE user_id = p_user_id AND current_badge = p_badge_name
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BADGE: User already owns this badge';
  END IF;
  
  -- Calculate deduction strategy (prefer holding balance first)
  IF v_holding_balance >= p_bsk_amount THEN
    v_deduct_from_holding := p_bsk_amount;
    v_deduct_from_withdrawable := 0;
  ELSIF v_holding_balance > 0 THEN
    v_deduct_from_holding := v_holding_balance;
    v_deduct_from_withdrawable := p_bsk_amount - v_holding_balance;
  ELSE
    v_deduct_from_holding := 0;
    v_deduct_from_withdrawable := p_bsk_amount;
  END IF;
  
  v_new_withdrawable := v_withdrawable_balance - v_deduct_from_withdrawable;
  v_new_holding := v_holding_balance - v_deduct_from_holding;
  
  -- CRITICAL: Update balances atomically
  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = v_new_withdrawable,
    holding_balance = v_new_holding,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_balance_updated = ROW_COUNT;
  IF v_balance_updated = 0 THEN
    RAISE EXCEPTION 'BALANCE_UPDATE_FAILED: Could not update user balance';
  END IF;
  
  -- Record purchase
  INSERT INTO badge_purchases (
    user_id, badge_name, previous_badge, bsk_amount, inr_amount,
    bsk_rate_at_purchase, is_upgrade, payment_method, payment_ref, status
  ) VALUES (
    p_user_id, p_badge_name, p_previous_badge, p_bsk_amount, 0,
    1, p_previous_badge IS NOT NULL, p_payment_method, p_payment_ref, 'completed'
  )
  RETURNING id INTO v_purchase_id;
  
  -- Create ledger entries
  IF v_deduct_from_withdrawable > 0 THEN
    INSERT INTO bsk_withdrawable_ledger (
      user_id, amount_bsk, amount_inr, rate_snapshot, tx_type,
      balance_before, balance_after, reference_id, notes, created_at
    ) VALUES (
      p_user_id, -v_deduct_from_withdrawable, 0, 1, 'badge_purchase',
      v_withdrawable_balance, v_new_withdrawable, v_purchase_id,
      format('Badge purchase: %s - %s BSK (from withdrawable)', p_badge_name, v_deduct_from_withdrawable),
      NOW()
    );
  END IF;
  
  IF v_deduct_from_holding > 0 THEN
    INSERT INTO bsk_holding_ledger (
      user_id, amount_bsk, amount_inr, rate_snapshot, tx_type,
      balance_before, balance_after, reference_id, notes, created_at
    ) VALUES (
      p_user_id, -v_deduct_from_holding, 0, 1, 'badge_purchase',
      v_holding_balance, v_new_holding, v_purchase_id,
      format('Badge purchase: %s - %s BSK (from holding)', p_badge_name, v_deduct_from_holding),
      NOW()
    );
  END IF;
  
  -- Get existing badge
  SELECT current_badge INTO v_existing_badge
  FROM user_badge_holdings
  WHERE user_id = p_user_id;
  
  -- Update badge holdings
  INSERT INTO user_badge_holdings (
    user_id, current_badge, previous_badge, purchased_at,
    price_bsk, price_inr, payment_ref
  ) VALUES (
    p_user_id, p_badge_name, p_previous_badge, NOW(),
    p_bsk_amount, 0, p_payment_ref
  )
  ON CONFLICT (user_id) DO UPDATE SET
    previous_badge = COALESCE(v_existing_badge, user_badge_holdings.current_badge),
    current_badge = EXCLUDED.current_badge,
    purchased_at = EXCLUDED.purchased_at,
    price_bsk = EXCLUDED.price_bsk,
    price_inr = EXCLUDED.price_inr,
    payment_ref = EXCLUDED.payment_ref,
    updated_at = NOW();
  
  -- Build success response
  v_result := json_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'badge', p_badge_name,
    'amount_paid', p_bsk_amount,
    'new_balance', v_new_withdrawable + v_new_holding,
    'new_withdrawable_balance', v_new_withdrawable,
    'new_holding_balance', v_new_holding,
    'deducted_from', json_build_object(
      'withdrawable', v_deduct_from_withdrawable,
      'holding', v_deduct_from_holding
    )
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Badge purchase failed for user %: %', p_user_id, SQLERRM;
    RAISE EXCEPTION 'PURCHASE_FAILED: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atomic_badge_purchase TO authenticated, service_role;