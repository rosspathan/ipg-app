-- ================================================
-- TEAM REFERRALS: Badge-Holder Eligibility System
-- ================================================

-- 1. Extend team_referral_settings with new eligibility controls
ALTER TABLE public.team_referral_settings
ADD COLUMN IF NOT EXISTS direct_commission_percent numeric DEFAULT 10 CHECK (direct_commission_percent >= 0 AND direct_commission_percent <= 50),
ADD COLUMN IF NOT EXISTS min_referrer_badge_required text DEFAULT 'ANY_BADGE' CHECK (min_referrer_badge_required IN ('ANY_BADGE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'VIP')),
ADD COLUMN IF NOT EXISTS eligibility_policy text DEFAULT 'REQUIRE_AT_EVENT_NO_RETRO' CHECK (eligibility_policy IN ('REQUIRE_AT_EVENT_NO_RETRO', 'ALLOW_RETRO_WITHIN_WINDOW')),
ADD COLUMN IF NOT EXISTS retro_window_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_scope text DEFAULT 'BADGE_PURCHASES_AND_UPGRADES' CHECK (commission_scope IN ('BADGE_PURCHASES_ONLY', 'BADGE_PURCHASES_AND_UPGRADES')),
ADD COLUMN IF NOT EXISTS payout_destination text DEFAULT 'WITHDRAWABLE' CHECK (payout_destination IN ('WITHDRAWABLE', 'HOLDING')),
ADD COLUMN IF NOT EXISTS apply_requirement_to_vip_milestones boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cooloff_hours_for_clawback integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_daily_direct_commission_bsk numeric DEFAULT 100000;

COMMENT ON COLUMN public.team_referral_settings.direct_commission_percent IS 'Direct referral commission percentage (0-50%)';
COMMENT ON COLUMN public.team_referral_settings.min_referrer_badge_required IS 'Minimum badge referrer must hold to earn commission';
COMMENT ON COLUMN public.team_referral_settings.eligibility_policy IS 'When to check eligibility: at event time only or allow retroactive';
COMMENT ON COLUMN public.team_referral_settings.retro_window_hours IS 'Hours window for retroactive eligibility (only if policy allows)';
COMMENT ON COLUMN public.team_referral_settings.commission_scope IS 'What events trigger direct commission';
COMMENT ON COLUMN public.team_referral_settings.payout_destination IS 'Where to credit commission: withdrawable or holding balance';
COMMENT ON COLUMN public.team_referral_settings.apply_requirement_to_vip_milestones IS 'Apply badge requirement to VIP milestone rewards too';
COMMENT ON COLUMN public.team_referral_settings.cooloff_hours_for_clawback IS 'Hours to allow clawback if payment refunded';
COMMENT ON COLUMN public.team_referral_settings.max_daily_direct_commission_bsk IS 'Per-user daily commission cap (0=no limit)';

-- 2. Create user_badge_holdings table to track current badge status
CREATE TABLE IF NOT EXISTS public.user_badge_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_badge text NOT NULL,
  previous_badge text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  price_bsk numeric NOT NULL,
  price_inr numeric,
  payment_ref text,
  history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_badge_holdings_user ON public.user_badge_holdings(user_id);
CREATE INDEX idx_user_badge_holdings_badge ON public.user_badge_holdings(current_badge);

COMMENT ON TABLE public.user_badge_holdings IS 'Tracks current badge status for each user';

-- 3. Create badge_purchase_events table for all badge transactions
CREATE TABLE IF NOT EXISTS public.badge_purchase_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('badge_purchase', 'badge_upgrade')),
  from_badge text,
  to_badge text NOT NULL,
  paid_amount_bsk numeric NOT NULL,
  commissionable_amount_bsk numeric NOT NULL,
  rate_snapshot numeric NOT NULL,
  payment_ref text,
  payment_method text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_badge_events_user ON public.badge_purchase_events(user_id);
CREATE INDEX idx_badge_events_occurred ON public.badge_purchase_events(occurred_at DESC);

COMMENT ON TABLE public.badge_purchase_events IS 'All badge purchase and upgrade events';

-- 4. Create commission_payouts table for direct commission tracking
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.badge_purchase_events(id) ON DELETE CASCADE,
  commissionable_bsk numeric NOT NULL,
  commission_percent numeric NOT NULL,
  commission_bsk numeric NOT NULL,
  destination text NOT NULL CHECK (destination IN ('WITHDRAWABLE', 'HOLDING')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'void', 'clawed_back')),
  eligibility_met boolean NOT NULL DEFAULT true,
  sponsor_badge_at_event text,
  required_badge_at_event text,
  capped boolean DEFAULT false,
  reason text,
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz,
  voided_at timestamptz,
  clawed_back_at timestamptz,
  UNIQUE(event_id, sponsor_id)
);

CREATE INDEX idx_commission_sponsor ON public.commission_payouts(sponsor_id);
CREATE INDEX idx_commission_referred ON public.commission_payouts(referred_user_id);
CREATE INDEX idx_commission_status ON public.commission_payouts(status);
CREATE INDEX idx_commission_event ON public.commission_payouts(event_id);
CREATE INDEX idx_commission_created ON public.commission_payouts(created_at DESC);

COMMENT ON TABLE public.commission_payouts IS 'Direct commission payout records with eligibility tracking';

-- 5. Create referral_links table (immutable sponsor relationships)
CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_referral_links_user ON public.referral_links(user_id);
CREATE INDEX idx_referral_links_sponsor ON public.referral_links(sponsor_id);

COMMENT ON TABLE public.referral_links IS 'Immutable referral sponsor relationships';

-- 6. Enable RLS
ALTER TABLE public.user_badge_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_purchase_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_badge_holdings
CREATE POLICY "Users can view own badge holdings"
  ON public.user_badge_holdings FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage badge holdings"
  ON public.user_badge_holdings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for badge_purchase_events
CREATE POLICY "Users can view own badge events"
  ON public.badge_purchase_events FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage badge events"
  ON public.badge_purchase_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for commission_payouts
CREATE POLICY "Users can view own commissions"
  ON public.commission_payouts FOR SELECT
  USING (auth.uid() = sponsor_id OR auth.uid() = referred_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage commissions"
  ON public.commission_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_links
CREATE POLICY "Users can view own referral links"
  ON public.referral_links FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = sponsor_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create referral links"
  ON public.referral_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage referral links"
  ON public.referral_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Create helper function to get badge tier value (for comparison)
CREATE OR REPLACE FUNCTION public.get_badge_tier_value(badge_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE badge_name
    WHEN 'VIP' THEN 5
    WHEN 'DIAMOND' THEN 4
    WHEN 'PLATINUM' THEN 3
    WHEN 'GOLD' THEN 2
    WHEN 'SILVER' THEN 1
    ELSE 0
  END;
$$;

-- 8. Create function to check badge eligibility
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(
  sponsor_badge text,
  required_badge text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN required_badge = 'ANY_BADGE' THEN sponsor_badge IS NOT NULL AND sponsor_badge != 'NONE'
    ELSE get_badge_tier_value(sponsor_badge) >= get_badge_tier_value(required_badge)
  END;
$$;

-- 9. Create audit table for commission decisions
CREATE TABLE IF NOT EXISTS public.commission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.badge_purchase_events(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text,
  eligibility_met boolean,
  sponsor_badge text,
  required_badge text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_commission_audit_event ON public.commission_audit_log(event_id);
CREATE INDEX idx_commission_audit_sponsor ON public.commission_audit_log(sponsor_id);

COMMENT ON TABLE public.commission_audit_log IS 'Audit trail for commission eligibility decisions';

-- Enable RLS
ALTER TABLE public.commission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view commission audit"
  ON public.commission_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. Create daily commission tracking table
CREATE TABLE IF NOT EXISTS public.daily_commission_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_commission_bsk numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_commission_user_date ON public.daily_commission_totals(user_id, date);

-- Enable RLS
ALTER TABLE public.daily_commission_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily totals"
  ON public.daily_commission_totals FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage daily totals"
  ON public.daily_commission_totals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));