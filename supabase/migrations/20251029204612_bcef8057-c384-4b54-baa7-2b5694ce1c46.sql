-- =====================================================
-- FIX: Atomic Badge Purchase with Transaction & Refund
-- =====================================================

-- 1. Create atomic badge purchase function
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
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_purchase_id UUID;
  v_result JSON;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Step 1: Check and lock balance row
  SELECT withdrawable_balance INTO v_current_balance
  FROM user_bsk_balances
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock the row
  
  -- Validate sufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_bsk_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Required %, Available %', p_bsk_amount, COALESCE(v_current_balance, 0);
  END IF;
  
  -- Step 2: Check if user already has this badge (idempotency)
  IF EXISTS (
    SELECT 1 FROM user_badge_holdings 
    WHERE user_id = p_user_id AND current_badge = p_badge_name
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BADGE: User already owns this badge';
  END IF;
  
  -- Step 3: Deduct balance
  v_new_balance := v_current_balance - p_bsk_amount;
  
  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = v_new_balance,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Step 4: Record purchase
  INSERT INTO badge_purchases (
    user_id,
    badge_name,
    previous_badge,
    bsk_amount,
    inr_amount,
    bsk_rate_at_purchase,
    is_upgrade,
    payment_method,
    payment_ref,
    status
  ) VALUES (
    p_user_id,
    p_badge_name,
    p_previous_badge,
    p_bsk_amount,
    0,
    1,
    p_previous_badge IS NOT NULL,
    p_payment_method,
    p_payment_ref,
    'completed'
  )
  RETURNING id INTO v_purchase_id;
  
  -- Step 5: Update badge holdings (with ALL required fields)
  INSERT INTO user_badge_holdings (
    user_id,
    current_badge,
    previous_badge,
    purchased_at,
    price_bsk,
    price_inr,
    payment_ref,
    unlock_levels
  ) VALUES (
    p_user_id,
    p_badge_name,
    p_previous_badge,
    NOW(),
    p_bsk_amount,
    0,
    p_payment_ref,
    p_unlock_levels
  )
  ON CONFLICT (user_id) DO UPDATE SET
    previous_badge = user_badge_holdings.current_badge,
    current_badge = p_badge_name,
    purchased_at = NOW(),
    price_bsk = p_bsk_amount,
    payment_ref = p_payment_ref,
    unlock_levels = p_unlock_levels,
    updated_at = NOW();
  
  -- Build success response
  v_result := json_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'badge', p_badge_name,
    'amount_paid', p_bsk_amount,
    'new_balance', v_new_balance
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'PURCHASE_FAILED: %', SQLERRM;
END;
$$;

-- 2. Create refund function for affected users
CREATE OR REPLACE FUNCTION public.refund_failed_badge_purchases()
RETURNS TABLE (
  user_id UUID,
  badge_name TEXT,
  refund_amount NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_refunded_count INTEGER := 0;
BEGIN
  -- Find all completed purchases without badge holdings
  FOR v_record IN
    SELECT 
      bp.user_id,
      bp.badge_name,
      bp.bsk_amount,
      bp.id as purchase_id
    FROM badge_purchases bp
    LEFT JOIN user_badge_holdings ubh ON bp.user_id = ubh.user_id 
      AND bp.badge_name = ubh.current_badge
    WHERE bp.status = 'completed' 
      AND ubh.user_id IS NULL
  LOOP
    -- Refund the BSK
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, updated_at)
    VALUES (v_record.user_id, v_record.bsk_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + v_record.bsk_amount,
      updated_at = NOW();
    
    -- Mark purchase as refunded
    UPDATE badge_purchases
    SET 
      status = 'refunded',
      updated_at = NOW()
    WHERE id = v_record.purchase_id;
    
    -- Record in ledger
    INSERT INTO insurance_bsk_ledger (
      user_id,
      type,
      plan_type,
      bsk_amount,
      inr_amount,
      rate_snapshot,
      destination,
      metadata
    ) VALUES (
      v_record.user_id,
      'refund',
      'badge_purchase_failed',
      v_record.bsk_amount,
      0,
      1,
      'withdrawable',
      json_build_object(
        'reason', 'failed_badge_assignment',
        'original_badge', v_record.badge_name,
        'refund_timestamp', NOW()
      )
    );
    
    v_refunded_count := v_refunded_count + 1;
    
    RETURN QUERY SELECT 
      v_record.user_id,
      v_record.badge_name,
      v_record.bsk_amount,
      'refunded'::TEXT;
  END LOOP;
  
  IF v_refunded_count = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'No failed purchases found'::TEXT,
      0::NUMERIC,
      'none'::TEXT;
  END IF;
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.atomic_badge_purchase TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_failed_badge_purchases TO service_role;