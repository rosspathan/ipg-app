-- Phase 1.1: Fix Row-Level Security on Profiles Table
-- Drop the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Anyone can lookup profiles by referral code" ON public.profiles;

-- Create a safe referral lookup function instead
CREATE OR REPLACE FUNCTION public.lookup_user_by_referral_code(p_referral_code TEXT)
RETURNS TABLE(user_id UUID, referral_code TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.referral_code,
    p.full_name
  FROM profiles p
  WHERE p.referral_code = p_referral_code
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_referral_code(TEXT) TO authenticated, anon;

-- Phase 1.2: Fix settle_trade Race Condition with Row-Level Locking
CREATE OR REPLACE FUNCTION public.settle_trade(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_base_symbol TEXT,
  p_quote_symbol TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_total_value NUMERIC;
  v_buyer_quote_locked NUMERIC;
  v_seller_base_locked NUMERIC;
BEGIN
  -- Get asset IDs
  SELECT id INTO v_base_asset_id FROM public.assets WHERE symbol = p_base_symbol;
  SELECT id INTO v_quote_asset_id FROM public.assets WHERE symbol = p_quote_symbol;
  
  IF v_base_asset_id IS NULL OR v_quote_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: % or %', p_base_symbol, p_quote_symbol;
  END IF;
  
  v_total_value := p_quantity * p_price;
  
  -- CRITICAL FIX: Lock buyer's quote balance row FIRST to prevent race conditions
  SELECT locked INTO v_buyer_quote_locked
  FROM public.wallet_balances
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id
  FOR UPDATE;
  
  -- CRITICAL FIX: Lock seller's base balance row FIRST to prevent race conditions
  SELECT locked INTO v_seller_base_locked
  FROM public.wallet_balances
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id
  FOR UPDATE;
  
  -- Validate buyer has enough locked balance
  IF v_buyer_quote_locked IS NULL OR v_buyer_quote_locked < (v_total_value + p_buyer_fee) THEN
    RAISE EXCEPTION 'Buyer insufficient locked balance. Required: %, Available: %', 
      v_total_value + p_buyer_fee, COALESCE(v_buyer_quote_locked, 0);
  END IF;
  
  -- Validate seller has enough locked balance
  IF v_seller_base_locked IS NULL OR v_seller_base_locked < p_quantity THEN
    RAISE EXCEPTION 'Seller insufficient locked balance. Required: %, Available: %',
      p_quantity, COALESCE(v_seller_base_locked, 0);
  END IF;
  
  -- Buyer: deduct locked quote, add available base
  UPDATE public.wallet_balances
  SET 
    locked = locked - (v_total_value + p_buyer_fee),
    updated_at = now()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
  
  INSERT INTO public.wallet_balances (user_id, asset_id, available, locked, balance, total)
  VALUES (p_buyer_id, v_base_asset_id, p_quantity, 0, p_quantity, p_quantity)
  ON CONFLICT (user_id, asset_id) 
  DO UPDATE SET 
    available = wallet_balances.available + p_quantity,
    balance = wallet_balances.balance + p_quantity,
    total = wallet_balances.total + p_quantity,
    updated_at = now();
  
  -- Seller: deduct locked base, add available quote (minus fee)
  UPDATE public.wallet_balances
  SET 
    locked = locked - p_quantity,
    updated_at = now()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
  
  INSERT INTO public.wallet_balances (user_id, asset_id, available, locked, balance, total)
  VALUES (p_seller_id, v_quote_asset_id, v_total_value - p_seller_fee, 0, v_total_value - p_seller_fee, v_total_value - p_seller_fee)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET 
    available = wallet_balances.available + (v_total_value - p_seller_fee),
    balance = wallet_balances.balance + (v_total_value - p_seller_fee),
    total = wallet_balances.total + (v_total_value - p_seller_fee),
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Phase 1.3: Fix admin_adjust_user_balance Validation
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_target_user_id UUID,
  p_balance_type TEXT,
  p_operation TEXT,
  p_amount NUMERIC,
  p_reason TEXT,
  p_subtype TEXT DEFAULT 'withdrawable'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calling_user_id UUID;
  v_is_admin BOOLEAN;
  v_before NUMERIC;
  v_after NUMERIC;
  v_result JSON;
BEGIN
  -- Get calling user
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;

  -- Check admin role
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = v_calling_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('ok', false, 'message', 'Admin role required');
  END IF;

  -- Validate inputs
  IF p_balance_type NOT IN ('bsk', 'inr') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid balance type. Must be "bsk" or "inr"');
  END IF;

  IF p_operation NOT IN ('add', 'deduct') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid operation. Must be "add" or "deduct"');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'message', 'Amount must be positive');
  END IF;

  -- BSK balance handling
  IF p_balance_type = 'bsk' THEN
    IF p_subtype NOT IN ('withdrawable', 'locked', 'lifetime_earnings', 'referral_earnings') THEN
      RETURN json_build_object('ok', false, 'message', 'Invalid BSK subtype');
    END IF;

    -- Get current balance
    IF p_subtype = 'withdrawable' THEN
      SELECT COALESCE(withdrawable_balance, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'locked' THEN
      SELECT COALESCE(locked_balance, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'lifetime_earnings' THEN
      SELECT COALESCE(lifetime_earnings, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'referral_earnings' THEN
      SELECT COALESCE(referral_earnings, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    END IF;

    v_before := COALESCE(v_before, 0);

    -- CRITICAL FIX: Validate sufficient balance before deducting
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object(
          'ok', false, 
          'message', 'Insufficient BSK balance (' || p_subtype || '). Available: ' || v_before || ', Requested: ' || p_amount
        );
      END IF;
      v_after := v_before - p_amount;
    ELSE
      v_after := v_before + p_amount;
    END IF;

    -- Update balance
    IF p_subtype = 'withdrawable' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, locked_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, v_after, 0, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET withdrawable_balance = v_after, updated_at = now();
    ELSIF p_subtype = 'locked' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, locked_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, v_after, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET locked_balance = v_after, updated_at = now();
    ELSIF p_subtype = 'lifetime_earnings' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, locked_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, 0, v_after, 0)
      ON CONFLICT (user_id) DO UPDATE SET lifetime_earnings = v_after, updated_at = now();
    ELSIF p_subtype = 'referral_earnings' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, locked_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, 0, 0, v_after)
      ON CONFLICT (user_id) DO UPDATE SET referral_earnings = v_after, updated_at = now();
    END IF;

  -- INR balance handling
  ELSIF p_balance_type = 'inr' THEN
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_before 
    FROM user_inr_balances WHERE user_id = p_target_user_id FOR UPDATE;

    v_before := COALESCE(v_before, 0);

    -- CRITICAL FIX: Validate sufficient balance before deducting
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object(
          'ok', false,
          'message', 'Insufficient INR balance. Available: ₹' || v_before || ', Requested: ₹' || p_amount
        );
      END IF;
      v_after := v_before - p_amount;
    ELSE
      v_after := v_before + p_amount;
    END IF;

    -- Update balance
    INSERT INTO user_inr_balances (user_id, balance)
    VALUES (p_target_user_id, v_after)
    ON CONFLICT (user_id) DO UPDATE SET balance = v_after, updated_at = now();
  END IF;

  -- Log the adjustment
  INSERT INTO admin_balance_adjustments (
    admin_user_id, target_user_id, balance_type, operation, amount, reason, before_balance, after_balance
  ) VALUES (
    v_calling_user_id, p_target_user_id, p_balance_type, p_operation, p_amount, p_reason, v_before, v_after
  );

  RETURN json_build_object(
    'ok', true,
    'message', 'Balance adjusted successfully',
    'before', v_before,
    'after', v_after
  );
END;
$$;

-- Phase 1.4: Add SET search_path to All Functions
ALTER FUNCTION public.update_insurance_bsk_plans_updated_at() SET search_path = public;
ALTER FUNCTION public.update_team_referral_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.update_referral_configs_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_subscription_plans_updated_at() SET search_path = public;
ALTER FUNCTION public.update_draw_configs_updated_at() SET search_path = public;
ALTER FUNCTION public.update_badge_timestamp() SET search_path = public;