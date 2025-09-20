-- Create enum for balance metrics
CREATE TYPE balance_metric AS ENUM ('MAIN', 'TOTAL', 'BONUS_INCLUDED');

-- Create enum for invite policies
CREATE TYPE invite_policy AS ENUM ('BLOCK_WHEN_FULL', 'WAITLIST');

-- Create referral_balance_slabs table
CREATE TABLE public.referral_balance_slabs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  balance_metric balance_metric NOT NULL DEFAULT 'TOTAL',
  base_currency text NOT NULL DEFAULT 'USDT',
  min_balance numeric NOT NULL DEFAULT 0,
  max_balance numeric NULL, -- NULL means no upper limit
  max_direct_referrals integer NOT NULL DEFAULT 0,
  unlocked_levels integer NOT NULL DEFAULT 50,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral_global_settings table
CREATE TABLE public.referral_global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_balance_metric balance_metric NOT NULL DEFAULT 'TOTAL',
  base_currency text NOT NULL DEFAULT 'USDT',
  invite_policy invite_policy NOT NULL DEFAULT 'BLOCK_WHEN_FULL',
  reevaluate_on_balance_change boolean NOT NULL DEFAULT true,
  reevaluate_threshold_percent numeric NOT NULL DEFAULT 5.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral_user_state table for caching user slab info
CREATE TABLE public.referral_user_state (
  user_id uuid NOT NULL PRIMARY KEY,
  current_slab_id uuid REFERENCES public.referral_balance_slabs(id) ON DELETE SET NULL,
  current_balance numeric NOT NULL DEFAULT 0,
  direct_referral_count integer NOT NULL DEFAULT 0,
  last_evaluated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral_waitlist table for queued referrals
CREATE TABLE public.referral_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  prospect_id uuid NULL, -- NULL until user signs up
  prospect_email text NULL,
  prospect_phone text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone NULL,
  expired_at timestamp with time zone NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'applied', 'expired')),
  notes text
);

-- Enable RLS on all new tables
ALTER TABLE public.referral_balance_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_balance_slabs
CREATE POLICY "Admin can manage balance slabs" ON public.referral_balance_slabs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active slabs" ON public.referral_balance_slabs
  FOR SELECT USING (is_active = true);

-- RLS policies for referral_global_settings
CREATE POLICY "Admin can manage global settings" ON public.referral_global_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view global settings" ON public.referral_global_settings
  FOR SELECT USING (true);

-- RLS policies for referral_user_state
CREATE POLICY "Admin can view all user states" ON public.referral_user_state
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own state" ON public.referral_user_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user states" ON public.referral_user_state
  FOR ALL USING (true);

-- RLS policies for referral_waitlist
CREATE POLICY "Admin can manage waitlist" ON public.referral_waitlist
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own waitlist entries" ON public.referral_waitlist
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = prospect_id);

CREATE POLICY "System can create waitlist entries" ON public.referral_waitlist
  FOR INSERT WITH CHECK (true);

-- Add updated_at triggers
CREATE TRIGGER update_referral_balance_slabs_updated_at
  BEFORE UPDATE ON public.referral_balance_slabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_global_settings_updated_at
  BEFORE UPDATE ON public.referral_global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_user_state_updated_at
  BEFORE UPDATE ON public.referral_user_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate user balance based on metric
CREATE OR REPLACE FUNCTION public.calculate_user_balance(
  p_user_id uuid,
  p_metric balance_metric DEFAULT 'TOTAL',
  p_base_currency text DEFAULT 'USDT'
) RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric := 0;
  v_bsk_balance numeric := 0;
  v_bsk_price numeric := 1;
BEGIN
  -- For now, we'll use a simplified calculation
  -- In a real implementation, this would calculate portfolio value based on current prices
  
  IF p_metric = 'MAIN' THEN
    -- Get main wallet balance (simplified - just USDT for now)
    SELECT COALESCE(SUM(balance), 0) INTO v_balance
    FROM wallet_balances wb
    JOIN assets a ON wb.asset_id = a.id
    WHERE wb.user_id = p_user_id AND a.symbol = p_base_currency;
    
  ELSIF p_metric = 'TOTAL' THEN
    -- Calculate total portfolio value (simplified calculation)
    -- This would need to be enhanced with real-time price data
    SELECT COALESCE(1000, 0) INTO v_balance; -- Placeholder
    
  ELSIF p_metric = 'BONUS_INCLUDED' THEN
    -- Include BSK bonus balance
    SELECT COALESCE(1000, 0) INTO v_balance; -- Portfolio value placeholder
    
    -- Get BSK bonus balance
    SELECT COALESCE(SUM(wbb.balance), 0) INTO v_bsk_balance
    FROM wallet_bonus_balances wbb
    JOIN bonus_assets ba ON wbb.asset_id = ba.id
    WHERE wbb.user_id = p_user_id AND ba.symbol = 'BSK';
    
    -- Get latest BSK price (fallback to 1 if not found)
    SELECT COALESCE(bp.price, 1) INTO v_bsk_price
    FROM bonus_prices bp
    JOIN bonus_assets ba ON bp.asset_id = ba.id
    WHERE ba.symbol = 'BSK'
    ORDER BY bp.recorded_at DESC
    LIMIT 1;
    
    v_balance := v_balance + (v_bsk_balance * v_bsk_price);
  END IF;
  
  RETURN v_balance;
END;
$$;

-- Function to determine user's current slab
CREATE OR REPLACE FUNCTION public.get_user_slab(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slab_id uuid;
  v_balance numeric;
  v_global_settings record;
BEGIN
  -- Get global settings for default metric
  SELECT * INTO v_global_settings
  FROM referral_global_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate user balance using default metric
  v_balance := calculate_user_balance(
    p_user_id, 
    COALESCE(v_global_settings.default_balance_metric, 'TOTAL'::balance_metric),
    COALESCE(v_global_settings.base_currency, 'USDT')
  );
  
  -- Find matching slab
  SELECT id INTO v_slab_id
  FROM referral_balance_slabs
  WHERE is_active = true
    AND min_balance <= v_balance
    AND (max_balance IS NULL OR v_balance <= max_balance)
  ORDER BY min_balance DESC
  LIMIT 1;
  
  RETURN v_slab_id;
END;
$$;

-- Function to update user referral state
CREATE OR REPLACE FUNCTION public.update_user_referral_state(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slab_id uuid;
  v_balance numeric;
  v_direct_count integer := 0;
  v_global_settings record;
BEGIN
  -- Get global settings
  SELECT * INTO v_global_settings
  FROM referral_global_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate current balance
  v_balance := calculate_user_balance(
    p_user_id,
    COALESCE(v_global_settings.default_balance_metric, 'TOTAL'::balance_metric),
    COALESCE(v_global_settings.base_currency, 'USDT')
  );
  
  -- Get current slab
  v_slab_id := get_user_slab(p_user_id);
  
  -- Count direct referrals
  SELECT COUNT(*) INTO v_direct_count
  FROM referral_relationships
  WHERE referrer_id = p_user_id;
  
  -- Upsert user state
  INSERT INTO referral_user_state (
    user_id, current_slab_id, current_balance, direct_referral_count, last_evaluated_at
  ) VALUES (
    p_user_id, v_slab_id, v_balance, v_direct_count, now()
  ) ON CONFLICT (user_id) DO UPDATE SET
    current_slab_id = EXCLUDED.current_slab_id,
    current_balance = EXCLUDED.current_balance,
    direct_referral_count = EXCLUDED.direct_referral_count,
    last_evaluated_at = EXCLUDED.last_evaluated_at,
    updated_at = now();
END;
$$;

-- Insert default global settings
INSERT INTO public.referral_global_settings (
  default_balance_metric,
  base_currency,
  invite_policy,
  reevaluate_on_balance_change,
  reevaluate_threshold_percent
) VALUES (
  'TOTAL',
  'USDT',
  'BLOCK_WHEN_FULL',
  true,
  5.0
);

-- Insert default balance slabs
INSERT INTO public.referral_balance_slabs (name, balance_metric, base_currency, min_balance, max_balance, max_direct_referrals, unlocked_levels, notes, is_active) VALUES
('Starter', 'TOTAL', 'USDT', 0, 100, 5, 10, 'Basic tier for new users', true),
('Bronze', 'TOTAL', 'USDT', 100, 500, 10, 20, 'Bronze tier with increased limits', true),
('Silver', 'TOTAL', 'USDT', 500, 2000, 25, 30, 'Silver tier with good benefits', true),
('Gold', 'TOTAL', 'USDT', 2000, 10000, 50, 40, 'Gold tier with high limits', true),
('Platinum', 'TOTAL', 'USDT', 10000, 50000, 100, 50, 'Platinum tier with premium benefits', true),
('Elite', 'TOTAL', 'USDT', 50000, NULL, 500, 50, 'Elite tier with unlimited earning potential', true);

-- Add indexes for performance
CREATE INDEX idx_referral_balance_slabs_active ON public.referral_balance_slabs(is_active, min_balance DESC);
CREATE INDEX idx_referral_user_state_user_id ON public.referral_user_state(user_id);
CREATE INDEX idx_referral_user_state_slab_id ON public.referral_user_state(current_slab_id);
CREATE INDEX idx_referral_waitlist_referrer ON public.referral_waitlist(referrer_id);
CREATE INDEX idx_referral_waitlist_status ON public.referral_waitlist(status);

-- Add check constraint to prevent overlapping slabs (basic validation)
ALTER TABLE public.referral_balance_slabs ADD CONSTRAINT check_min_balance_non_negative CHECK (min_balance >= 0);
ALTER TABLE public.referral_balance_slabs ADD CONSTRAINT check_max_balance_greater_than_min CHECK (max_balance IS NULL OR max_balance > min_balance);