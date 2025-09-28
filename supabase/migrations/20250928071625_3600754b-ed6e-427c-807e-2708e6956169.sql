-- Create enum types for promotion system
CREATE TYPE promotion_status AS ENUM ('draft', 'scheduled', 'live', 'paused', 'ended');
CREATE TYPE bonus_destination AS ENUM ('withdrawable', 'holding');
CREATE TYPE purchase_channel AS ENUM ('inr_onramp', 'swap_ipg_bsk', 'swap_crypto_bsk');
CREATE TYPE bonus_event_status AS ENUM ('pending', 'settled', 'void', 'clawed_back');
CREATE TYPE per_user_limit_type AS ENUM ('once', 'once_per_campaign', 'unlimited');

-- BSK Purchase Bonus Campaigns table
CREATE TABLE public.bsk_bonus_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'BSK Purchase Bonus',
  status promotion_status NOT NULL DEFAULT 'draft',
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  min_purchase_inr NUMERIC NOT NULL DEFAULT 1000,
  max_purchase_inr NUMERIC NOT NULL DEFAULT 100000,
  bonus_percent NUMERIC NOT NULL DEFAULT 50,
  per_user_limit per_user_limit_type NOT NULL DEFAULT 'once',
  per_user_max_times INTEGER DEFAULT 1,
  destination bonus_destination NOT NULL DEFAULT 'withdrawable',
  vesting_enabled BOOLEAN NOT NULL DEFAULT false,
  vesting_duration_days INTEGER DEFAULT 0,
  global_budget_bsk NUMERIC DEFAULT NULL,
  global_budget_used_bsk NUMERIC NOT NULL DEFAULT 0,
  eligible_channels purchase_channel[] NOT NULL DEFAULT ARRAY['inr_onramp']::purchase_channel[],
  allow_stacking BOOLEAN NOT NULL DEFAULT false,
  stacking_priority INTEGER DEFAULT 1,
  kyc_required BOOLEAN NOT NULL DEFAULT false,
  cooloff_hours INTEGER NOT NULL DEFAULT 24,
  region_restrictions JSONB DEFAULT '{"allowed": ["global"], "blocked": []}'::JSONB,
  rate_snapshot_bsk_inr NUMERIC,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BSK Bonus Events ledger
CREATE TABLE public.bsk_bonus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.bsk_bonus_campaigns(id),
  purchase_id TEXT NOT NULL, -- For idempotency
  channel purchase_channel NOT NULL,
  purchase_inr NUMERIC NOT NULL,
  effective_purchase_inr NUMERIC NOT NULL, -- Clamped to min/max
  rate_snapshot_bsk_inr NUMERIC NOT NULL,
  bonus_bsk NUMERIC NOT NULL,
  destination bonus_destination NOT NULL,
  status bonus_event_status NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  void_reason TEXT,
  clawback_at TIMESTAMP WITH TIME ZONE,
  clawback_reason TEXT,
  vesting_schedule_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id, purchase_id)
);

-- BSK Bonus Vesting Schedules (for holding destination with vesting)
CREATE TABLE public.bsk_bonus_vesting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_event_id UUID NOT NULL REFERENCES public.bsk_bonus_events(id),
  user_id UUID NOT NULL,
  total_bsk NUMERIC NOT NULL,
  daily_release_bsk NUMERIC NOT NULL,
  days_total INTEGER NOT NULL,
  days_completed INTEGER NOT NULL DEFAULT 0,
  bsk_released NUMERIC NOT NULL DEFAULT 0,
  bsk_pending NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  next_release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promotion Events audit log
CREATE TABLE public.promotion_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.bsk_bonus_campaigns(id),
  admin_user_id UUID,
  event_type TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Promotion Claims tracking
CREATE TABLE public.user_promotion_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.bsk_bonus_campaigns(id),
  claims_count INTEGER NOT NULL DEFAULT 0,
  first_claim_at TIMESTAMP WITH TIME ZONE,
  last_claim_at TIMESTAMP WITH TIME ZONE,
  total_bonus_bsk NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.bsk_bonus_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_bonus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_bonus_vesting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promotion_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Campaigns
CREATE POLICY "Admin can manage campaigns" ON public.bsk_bonus_campaigns
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active campaigns" ON public.bsk_bonus_campaigns
  FOR SELECT TO authenticated USING (status IN ('live', 'scheduled'));

-- Bonus Events
CREATE POLICY "Admin can view all bonus events" ON public.bsk_bonus_events
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own bonus events" ON public.bsk_bonus_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can manage bonus events" ON public.bsk_bonus_events
  FOR ALL TO authenticated USING (true);

-- Vesting Schedules
CREATE POLICY "Admin can view all vesting schedules" ON public.bsk_bonus_vesting_schedules
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own vesting schedules" ON public.bsk_bonus_vesting_schedules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can manage vesting schedules" ON public.bsk_bonus_vesting_schedules
  FOR ALL TO authenticated USING (true);

-- Promotion Events Log
CREATE POLICY "Admin can view promotion events log" ON public.promotion_events_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create promotion events log" ON public.promotion_events_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- User Claims
CREATE POLICY "Admin can view all user claims" ON public.user_promotion_claims
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own claims" ON public.user_promotion_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can manage user claims" ON public.user_promotion_claims
  FOR ALL TO authenticated USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bsk_bonus_campaigns_updated_at
    BEFORE UPDATE ON public.bsk_bonus_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bsk_bonus_events_updated_at
    BEFORE UPDATE ON public.bsk_bonus_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bsk_bonus_vesting_schedules_updated_at
    BEFORE UPDATE ON public.bsk_bonus_vesting_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_promotion_claims_updated_at
    BEFORE UPDATE ON public.user_promotion_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to process BSK bonus purchase
CREATE OR REPLACE FUNCTION public.process_bsk_bonus_purchase(
  p_user_id UUID,
  p_purchase_id TEXT,
  p_channel purchase_channel,
  p_purchase_inr NUMERIC,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  campaign_record RECORD;
  user_claims_record RECORD;
  effective_purchase_inr NUMERIC;
  bonus_bsk NUMERIC;
  bonus_event_id UUID;
  vesting_schedule_id UUID;
  result JSONB;
BEGIN
  -- Get active campaign if not specified
  IF p_campaign_id IS NULL THEN
    SELECT * INTO campaign_record
    FROM public.bsk_bonus_campaigns
    WHERE status = 'live'
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at >= now())
      AND p_channel = ANY(eligible_channels)
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO campaign_record
    FROM public.bsk_bonus_campaigns
    WHERE id = p_campaign_id
      AND status = 'live'
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at >= now())
      AND p_channel = ANY(eligible_channels);
  END IF;

  -- No active campaign
  IF campaign_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_campaign');
  END IF;

  -- Check if purchase amount qualifies
  IF p_purchase_inr < campaign_record.min_purchase_inr THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'below_minimum',
      'min_required', campaign_record.min_purchase_inr,
      'shortfall', campaign_record.min_purchase_inr - p_purchase_inr
    );
  END IF;

  -- Check user limits
  SELECT * INTO user_claims_record
  FROM public.user_promotion_claims
  WHERE user_id = p_user_id AND campaign_id = campaign_record.id;

  IF user_claims_record IS NOT NULL THEN
    IF campaign_record.per_user_limit = 'once' AND user_claims_record.claims_count >= 1 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'already_claimed_once');
    ELSIF campaign_record.per_user_limit = 'once_per_campaign' AND user_claims_record.claims_count >= campaign_record.per_user_max_times THEN
      RETURN jsonb_build_object('success', false, 'reason', 'max_claims_reached');
    END IF;
  END IF;

  -- Check for duplicate purchase_id
  IF EXISTS (SELECT 1 FROM public.bsk_bonus_events WHERE purchase_id = p_purchase_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_purchase_id');
  END IF;

  -- Calculate effective purchase amount (capped at max)
  effective_purchase_inr := LEAST(p_purchase_inr, campaign_record.max_purchase_inr);

  -- Calculate bonus BSK
  bonus_bsk := (effective_purchase_inr * campaign_record.bonus_percent / 100.0) / campaign_record.rate_snapshot_bsk_inr;

  -- Check global budget
  IF campaign_record.global_budget_bsk IS NOT NULL THEN
    IF campaign_record.global_budget_used_bsk + bonus_bsk > campaign_record.global_budget_bsk THEN
      RETURN jsonb_build_object('success', false, 'reason', 'global_budget_exhausted');
    END IF;
  END IF;

  -- Create bonus event
  INSERT INTO public.bsk_bonus_events (
    user_id, campaign_id, purchase_id, channel, purchase_inr, effective_purchase_inr,
    rate_snapshot_bsk_inr, bonus_bsk, destination, status
  ) VALUES (
    p_user_id, campaign_record.id, p_purchase_id, p_channel, p_purchase_inr, effective_purchase_inr,
    campaign_record.rate_snapshot_bsk_inr, bonus_bsk, campaign_record.destination, 'settled'
  ) RETURNING id INTO bonus_event_id;

  -- Update campaign budget
  UPDATE public.bsk_bonus_campaigns
  SET global_budget_used_bsk = global_budget_used_bsk + bonus_bsk
  WHERE id = campaign_record.id;

  -- Credit BSK balance
  IF campaign_record.destination = 'withdrawable' THEN
    -- Credit to withdrawable balance
    INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (p_user_id, bonus_bsk, bonus_bsk)
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + bonus_bsk,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + bonus_bsk;
  ELSE
    -- Credit to holding balance
    INSERT INTO public.user_bsk_balances (user_id, holding_balance, total_earned_holding)
    VALUES (p_user_id, bonus_bsk, bonus_bsk)
    ON CONFLICT (user_id) DO UPDATE SET
      holding_balance = user_bsk_balances.holding_balance + bonus_bsk,
      total_earned_holding = user_bsk_balances.total_earned_holding + bonus_bsk;

    -- Create vesting schedule if enabled
    IF campaign_record.vesting_enabled AND campaign_record.vesting_duration_days > 0 THEN
      INSERT INTO public.bsk_bonus_vesting_schedules (
        bonus_event_id, user_id, total_bsk, daily_release_bsk, days_total,
        bsk_pending, start_date, next_release_date
      ) VALUES (
        bonus_event_id, p_user_id, bonus_bsk, 
        bonus_bsk / campaign_record.vesting_duration_days, campaign_record.vesting_duration_days,
        bonus_bsk, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'
      ) RETURNING id INTO vesting_schedule_id;

      -- Update bonus event with vesting schedule
      UPDATE public.bsk_bonus_events
      SET vesting_schedule_id = vesting_schedule_id
      WHERE id = bonus_event_id;
    END IF;
  END IF;

  -- Create bonus ledger entry
  INSERT INTO public.bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (p_user_id, 'purchase_bonus', bonus_bsk, jsonb_build_object(
    'campaign_id', campaign_record.id,
    'campaign_name', campaign_record.name,
    'purchase_id', p_purchase_id,
    'channel', p_channel,
    'purchase_inr', p_purchase_inr,
    'effective_purchase_inr', effective_purchase_inr,
    'rate_snapshot', campaign_record.rate_snapshot_bsk_inr,
    'bonus_percent', campaign_record.bonus_percent,
    'destination', campaign_record.destination
  ));

  -- Update user claims
  INSERT INTO public.user_promotion_claims (user_id, campaign_id, claims_count, first_claim_at, last_claim_at, total_bonus_bsk)
  VALUES (p_user_id, campaign_record.id, 1, now(), now(), bonus_bsk)
  ON CONFLICT (user_id, campaign_id) DO UPDATE SET
    claims_count = user_promotion_claims.claims_count + 1,
    last_claim_at = now(),
    total_bonus_bsk = user_promotion_claims.total_bonus_bsk + bonus_bsk;

  RETURN jsonb_build_object(
    'success', true,
    'bonus_event_id', bonus_event_id,
    'campaign_id', campaign_record.id,
    'campaign_name', campaign_record.name,
    'bonus_bsk', bonus_bsk,
    'destination', campaign_record.destination,
    'vesting_enabled', campaign_record.vesting_enabled,
    'vesting_schedule_id', vesting_schedule_id
  );
END;
$$;

-- Insert default campaign
INSERT INTO public.bsk_bonus_campaigns (
  name, status, min_purchase_inr, max_purchase_inr, bonus_percent,
  per_user_limit, destination, vesting_enabled, eligible_channels,
  rate_snapshot_bsk_inr
) VALUES (
  'BSK One-Time Purchase — 50% Bonus', 'draft', 1000, 100000, 50,
  'once', 'withdrawable', false, ARRAY['inr_onramp']::purchase_channel[],
  1.0
);