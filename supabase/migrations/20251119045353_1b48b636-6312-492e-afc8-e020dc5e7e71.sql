-- Create bsk_purchase_bonuses table for admin-controlled offers
CREATE TABLE IF NOT EXISTS public.bsk_purchase_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  description TEXT,
  purchase_amount_bsk NUMERIC NOT NULL CHECK (purchase_amount_bsk > 0),
  withdrawable_bonus_percent NUMERIC NOT NULL CHECK (withdrawable_bonus_percent >= 0 AND withdrawable_bonus_percent <= 100),
  holding_bonus_percent NUMERIC NOT NULL CHECK (holding_bonus_percent >= 0 AND holding_bonus_percent <= 100),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure bonus percentages sum to 100
  CONSTRAINT bonus_split_must_equal_100 CHECK (withdrawable_bonus_percent + holding_bonus_percent = 100),
  
  -- Ensure end_at is after start_at
  CONSTRAINT valid_time_window CHECK (end_at > start_at)
);

-- Create user_purchase_bonus_claims table to track user claims
CREATE TABLE IF NOT EXISTS public.user_purchase_bonus_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_id UUID NOT NULL REFERENCES public.bsk_purchase_bonuses(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchase_amount_bsk NUMERIC NOT NULL,
  withdrawable_bonus_bsk NUMERIC NOT NULL,
  holding_bonus_bsk NUMERIC NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  
  -- Ensure each user can only claim each offer once
  CONSTRAINT unique_user_bonus_claim UNIQUE(user_id, bonus_id)
);

-- Create indexes for performance
CREATE INDEX idx_bsk_purchase_bonuses_active ON public.bsk_purchase_bonuses(is_active, start_at, end_at);
CREATE INDEX idx_bsk_purchase_bonuses_featured ON public.bsk_purchase_bonuses(is_featured, display_order);
CREATE INDEX idx_user_purchase_bonus_claims_user ON public.user_purchase_bonus_claims(user_id);
CREATE INDEX idx_user_purchase_bonus_claims_bonus ON public.user_purchase_bonus_claims(bonus_id);
CREATE INDEX idx_user_purchase_bonus_claims_claimed_at ON public.user_purchase_bonus_claims(claimed_at DESC);

-- Enable RLS
ALTER TABLE public.bsk_purchase_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchase_bonus_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bsk_purchase_bonuses
CREATE POLICY "Users can view active offers"
  ON public.bsk_purchase_bonuses
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND now() >= start_at 
    AND now() <= end_at
  );

CREATE POLICY "Admins can manage all offers"
  ON public.bsk_purchase_bonuses
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_purchase_bonus_claims
CREATE POLICY "Users can view own claims"
  ON public.user_purchase_bonus_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
  ON public.user_purchase_bonus_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
  ON public.user_purchase_bonus_claims
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to auto-disable expired offers (can be called by cron or on page load)
CREATE OR REPLACE FUNCTION public.auto_disable_expired_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bsk_purchase_bonuses
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND end_at < now();
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bsk_purchase_bonuses_updated_at
  BEFORE UPDATE ON public.bsk_purchase_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();