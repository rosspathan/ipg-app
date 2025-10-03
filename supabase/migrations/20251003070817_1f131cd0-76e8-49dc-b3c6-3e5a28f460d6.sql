-- ================================================
-- TEAM REFERRALS: Badge-Holder Eligibility System (Fixed)
-- ================================================

-- 1. Extend team_referral_settings with new eligibility controls
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'direct_commission_percent') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN direct_commission_percent numeric DEFAULT 10 CHECK (direct_commission_percent >= 0 AND direct_commission_percent <= 50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'min_referrer_badge_required') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN min_referrer_badge_required text DEFAULT 'ANY_BADGE' CHECK (min_referrer_badge_required IN ('ANY_BADGE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'VIP'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'eligibility_policy') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN eligibility_policy text DEFAULT 'REQUIRE_AT_EVENT_NO_RETRO' CHECK (eligibility_policy IN ('REQUIRE_AT_EVENT_NO_RETRO', 'ALLOW_RETRO_WITHIN_WINDOW'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'retro_window_hours') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN retro_window_hours integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'commission_scope') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN commission_scope text DEFAULT 'BADGE_PURCHASES_AND_UPGRADES' CHECK (commission_scope IN ('BADGE_PURCHASES_ONLY', 'BADGE_PURCHASES_AND_UPGRADES'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'payout_destination') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN payout_destination text DEFAULT 'WITHDRAWABLE' CHECK (payout_destination IN ('WITHDRAWABLE', 'HOLDING'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'apply_requirement_to_vip_milestones') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN apply_requirement_to_vip_milestones boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'cooloff_hours_for_clawback') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN cooloff_hours_for_clawback integer DEFAULT 24;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_referral_settings' AND column_name = 'max_daily_direct_commission_bsk') THEN
    ALTER TABLE public.team_referral_settings ADD COLUMN max_daily_direct_commission_bsk numeric DEFAULT 100000;
  END IF;
END $$;

-- 2. Create user_badge_holdings table
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

DROP INDEX IF EXISTS public.idx_user_badge_holdings_user;
DROP INDEX IF EXISTS public.idx_user_badge_holdings_badge;
CREATE INDEX IF NOT EXISTS idx_user_badge_holdings_user ON public.user_badge_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_holdings_badge ON public.user_badge_holdings(current_badge);

-- 3. Create badge_purchase_events table
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

DROP INDEX IF EXISTS public.idx_badge_events_user;
DROP INDEX IF EXISTS public.idx_badge_events_occurred;
CREATE INDEX IF NOT EXISTS idx_badge_events_user ON public.badge_purchase_events(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_events_occurred ON public.badge_purchase_events(occurred_at DESC);

-- 4. Create commission_payouts table
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

DROP INDEX IF EXISTS public.idx_commission_sponsor;
DROP INDEX IF EXISTS public.idx_commission_referred;
DROP INDEX IF EXISTS public.idx_commission_status;
DROP INDEX IF EXISTS public.idx_commission_event;
DROP INDEX IF EXISTS public.idx_commission_created;
CREATE INDEX IF NOT EXISTS idx_commission_sponsor ON public.commission_payouts(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_commission_referred ON public.commission_payouts(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON public.commission_payouts(status);
CREATE INDEX IF NOT EXISTS idx_commission_event ON public.commission_payouts(event_id);
CREATE INDEX IF NOT EXISTS idx_commission_created ON public.commission_payouts(created_at DESC);

-- 5. Create referral_links table
CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

DROP INDEX IF EXISTS public.idx_referral_links_user;
DROP INDEX IF EXISTS public.idx_referral_links_sponsor;
CREATE INDEX IF NOT EXISTS idx_referral_links_user ON public.referral_links(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_sponsor ON public.referral_links(sponsor_id);

-- 6. Enable RLS
ALTER TABLE public.user_badge_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_purchase_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own badge holdings" ON public.user_badge_holdings;
DROP POLICY IF EXISTS "System can manage badge holdings" ON public.user_badge_holdings;
DROP POLICY IF EXISTS "Users can view own badge events" ON public.badge_purchase_events;
DROP POLICY IF EXISTS "Admin can manage badge events" ON public.badge_purchase_events;
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commission_payouts;
DROP POLICY IF EXISTS "Admin can manage commissions" ON public.commission_payouts;
DROP POLICY IF EXISTS "Users can view own referral links" ON public.referral_links;
DROP POLICY IF EXISTS "System can create referral links" ON public.referral_links;
DROP POLICY IF EXISTS "Admin can manage referral links" ON public.referral_links;

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

-- 7. Create helper functions
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

-- 8. Create audit table
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

DROP INDEX IF EXISTS public.idx_commission_audit_event;
DROP INDEX IF EXISTS public.idx_commission_audit_sponsor;
CREATE INDEX IF NOT EXISTS idx_commission_audit_event ON public.commission_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_commission_audit_sponsor ON public.commission_audit_log(sponsor_id);

ALTER TABLE public.commission_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view commission audit" ON public.commission_audit_log;
CREATE POLICY "Admin can view commission audit"
  ON public.commission_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Create daily commission tracking
CREATE TABLE IF NOT EXISTS public.daily_commission_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_commission_bsk numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

DROP INDEX IF EXISTS public.idx_daily_commission_user_date;
CREATE INDEX IF NOT EXISTS idx_daily_commission_user_date ON public.daily_commission_totals(user_id, date);

ALTER TABLE public.daily_commission_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily totals" ON public.daily_commission_totals;
DROP POLICY IF EXISTS "System can manage daily totals" ON public.daily_commission_totals;

CREATE POLICY "Users can view own daily totals"
  ON public.daily_commission_totals FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage daily totals"
  ON public.daily_commission_totals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));