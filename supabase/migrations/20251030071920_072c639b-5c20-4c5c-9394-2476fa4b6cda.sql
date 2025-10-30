-- Fix the ambiguous column references in atomic_badge_purchase function
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
  v_existing_badge TEXT;
BEGIN
  -- Step 1: Check and lock balance row
  SELECT withdrawable_balance INTO v_current_balance
  FROM user_bsk_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_bsk_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Required %, Available %', p_bsk_amount, COALESCE(v_current_balance, 0);
  END IF;
  
  -- Step 2: Check if user already has this badge
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
  
  -- Step 5: Get existing badge if any (before the INSERT)
  SELECT current_badge INTO v_existing_badge
  FROM user_badge_holdings
  WHERE user_id = p_user_id;
  
  -- Step 6: Update badge holdings with EXPLICIT references to eliminate ambiguity
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
    previous_badge = COALESCE(v_existing_badge, user_badge_holdings.current_badge),
    current_badge = EXCLUDED.current_badge,
    purchased_at = EXCLUDED.purchased_at,
    price_bsk = EXCLUDED.price_bsk,
    price_inr = EXCLUDED.price_inr,
    payment_ref = EXCLUDED.payment_ref,
    unlock_levels = EXCLUDED.unlock_levels,
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
    RAISE EXCEPTION 'PURCHASE_FAILED: %', SQLERRM;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.atomic_badge_purchase TO authenticated, service_role;