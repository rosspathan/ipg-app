-- =====================================================
-- 50-LEVEL REFERRAL SYSTEM - DATABASE MIGRATION
-- Phase 1: Create all tables and modify existing schema
-- =====================================================

-- 1. Create referral_tree table (50-level hierarchy cache)
CREATE TABLE IF NOT EXISTS public.referral_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ancestor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level >= 1 AND level <= 50),
  path UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ancestor_id)
);

-- Index for fast ancestor lookups
CREATE INDEX IF NOT EXISTS idx_referral_tree_user ON public.referral_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_ancestor ON public.referral_tree(ancestor_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_level ON public.referral_tree(level);

-- Enable RLS
ALTER TABLE public.referral_tree ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_tree
CREATE POLICY "Users can view own referral tree"
ON public.referral_tree FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = ancestor_id);

CREATE POLICY "Admin can view all trees"
ON public.referral_tree FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage trees"
ON public.referral_tree FOR ALL
USING (true);

-- 2. Create referral_level_rewards table (admin-configurable rewards)
CREATE TABLE IF NOT EXISTS public.referral_level_rewards (
  level INT PRIMARY KEY CHECK (level >= 1 AND level <= 50),
  bsk_amount NUMERIC NOT NULL DEFAULT 0 CHECK (bsk_amount >= 0),
  balance_type TEXT NOT NULL CHECK (balance_type IN ('holding', 'withdrawable')),
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default rewards (as per spec)
INSERT INTO public.referral_level_rewards (level, bsk_amount, balance_type) VALUES
  (1, 5.0, 'holding'),
  (2, 0.5, 'withdrawable'), (3, 0.5, 'withdrawable'), (4, 0.5, 'withdrawable'), (5, 0.5, 'withdrawable'),
  (6, 0.5, 'withdrawable'), (7, 0.5, 'withdrawable'), (8, 0.5, 'withdrawable'), (9, 0.5, 'withdrawable'), (10, 0.5, 'withdrawable'),
  (11, 0.4, 'withdrawable'), (12, 0.4, 'withdrawable'), (13, 0.4, 'withdrawable'), (14, 0.4, 'withdrawable'), (15, 0.4, 'withdrawable'),
  (16, 0.4, 'withdrawable'), (17, 0.4, 'withdrawable'), (18, 0.4, 'withdrawable'), (19, 0.4, 'withdrawable'), (20, 0.4, 'withdrawable'),
  (21, 0.3, 'withdrawable'), (22, 0.3, 'withdrawable'), (23, 0.3, 'withdrawable'), (24, 0.3, 'withdrawable'), (25, 0.3, 'withdrawable'),
  (26, 0.3, 'withdrawable'), (27, 0.3, 'withdrawable'), (28, 0.3, 'withdrawable'), (29, 0.3, 'withdrawable'), (30, 0.3, 'withdrawable'),
  (31, 0.2, 'withdrawable'), (32, 0.2, 'withdrawable'), (33, 0.2, 'withdrawable'), (34, 0.2, 'withdrawable'), (35, 0.2, 'withdrawable'),
  (36, 0.2, 'withdrawable'), (37, 0.2, 'withdrawable'), (38, 0.2, 'withdrawable'), (39, 0.2, 'withdrawable'), (40, 0.2, 'withdrawable'),
  (41, 0.1, 'withdrawable'), (42, 0.1, 'withdrawable'), (43, 0.1, 'withdrawable'), (44, 0.1, 'withdrawable'), (45, 0.1, 'withdrawable'),
  (46, 0.1, 'withdrawable'), (47, 0.1, 'withdrawable'), (48, 0.1, 'withdrawable'), (49, 0.1, 'withdrawable'), (50, 0.1, 'withdrawable')
ON CONFLICT (level) DO NOTHING;

-- Enable RLS
ALTER TABLE public.referral_level_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage level rewards"
ON public.referral_level_rewards FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active level rewards"
ON public.referral_level_rewards FOR SELECT
USING (is_active = true);

-- 3. Create referral_commissions table (audit trail)
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level >= 1 AND level <= 50),
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'badge_purchase', 'badge_upgrade')),
  event_id UUID NOT NULL,
  bsk_amount NUMERIC NOT NULL CHECK (bsk_amount >= 0),
  destination TEXT NOT NULL CHECK (destination IN ('holding', 'withdrawable')),
  status TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('pending', 'settled', 'failed')),
  earner_badge_at_event TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  settled_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_earner ON public.referral_commissions(earner_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_payer ON public.referral_commissions(payer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_event ON public.referral_commissions(event_type, event_id);

-- Enable RLS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own commissions"
ON public.referral_commissions FOR SELECT
USING (auth.uid() = earner_id OR auth.uid() = payer_id);

CREATE POLICY "Admin can view all commissions"
ON public.referral_commissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create commissions"
ON public.referral_commissions FOR INSERT
WITH CHECK (true);

-- 4. Create vip_milestone_tracker table
CREATE TABLE IF NOT EXISTS public.vip_milestone_tracker (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  vip_badge_acquired_at TIMESTAMPTZ NOT NULL,
  direct_vip_count_after_vip INT DEFAULT 0 CHECK (direct_vip_count_after_vip >= 0),
  milestone_10_claimed BOOLEAN DEFAULT false,
  milestone_10_claimed_at TIMESTAMPTZ,
  milestone_50_claimed BOOLEAN DEFAULT false,
  milestone_50_claimed_at TIMESTAMPTZ,
  milestone_100_claimed BOOLEAN DEFAULT false,
  milestone_100_claimed_at TIMESTAMPTZ,
  milestone_250_claimed BOOLEAN DEFAULT false,
  milestone_250_claimed_at TIMESTAMPTZ,
  milestone_500_claimed BOOLEAN DEFAULT false,
  milestone_500_claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_milestone_tracker ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own milestone tracker"
ON public.vip_milestone_tracker FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all trackers"
ON public.vip_milestone_tracker FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage trackers"
ON public.vip_milestone_tracker FOR ALL
USING (true);

-- 5. Create badge_purchases table (for delta calculation)
CREATE TABLE IF NOT EXISTS public.badge_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  bsk_amount NUMERIC NOT NULL CHECK (bsk_amount >= 0),
  previous_badge TEXT,
  delta_amount NUMERIC NOT NULL CHECK (delta_amount >= 0),
  is_upgrade BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding previous purchases
CREATE INDEX IF NOT EXISTS idx_badge_purchases_user_date ON public.badge_purchases(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.badge_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own purchases"
ON public.badge_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all purchases"
ON public.badge_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create purchases"
ON public.badge_purchases FOR INSERT
WITH CHECK (true);

-- 6. Add unlock_levels to badge_thresholds (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'badge_thresholds' 
    AND column_name = 'unlock_levels'
  ) THEN
    ALTER TABLE public.badge_thresholds 
    ADD COLUMN unlock_levels INT NOT NULL DEFAULT 1 CHECK (unlock_levels >= 1 AND unlock_levels <= 50);
  END IF;
END $$;

-- Set default unlock_levels for each badge tier
UPDATE public.badge_thresholds SET unlock_levels = 1 WHERE badge_name = 'NONE';
UPDATE public.badge_thresholds SET unlock_levels = 10 WHERE badge_name = 'SILVER';
UPDATE public.badge_thresholds SET unlock_levels = 20 WHERE badge_name = 'GOLD';
UPDATE public.badge_thresholds SET unlock_levels = 30 WHERE badge_name = 'PLATINUM';
UPDATE public.badge_thresholds SET unlock_levels = 40 WHERE badge_name = 'DIAMOND';
UPDATE public.badge_thresholds SET unlock_levels = 50 WHERE badge_name = 'VIP';

-- 7. Add unlock_levels to user_badge_holdings (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_badge_holdings' 
    AND column_name = 'unlock_levels'
  ) THEN
    ALTER TABLE public.user_badge_holdings 
    ADD COLUMN unlock_levels INT NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Update existing user_badge_holdings with unlock_levels from badge_thresholds
UPDATE public.user_badge_holdings ubh
SET unlock_levels = bt.unlock_levels
FROM public.badge_thresholds bt
WHERE ubh.current_badge = bt.badge_name;

-- Create trigger to auto-update unlock_levels when badge changes
CREATE OR REPLACE FUNCTION public.sync_unlock_levels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.unlock_levels := (
    SELECT unlock_levels FROM public.badge_thresholds WHERE badge_name = NEW.current_badge
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_unlock_levels ON public.user_badge_holdings;
CREATE TRIGGER trigger_sync_unlock_levels
BEFORE INSERT OR UPDATE OF current_badge ON public.user_badge_holdings
FOR EACH ROW
EXECUTE FUNCTION public.sync_unlock_levels();

-- =====================================================
-- MIGRATION COMPLETE
-- Created: referral_tree, referral_level_rewards, referral_commissions, 
--          vip_milestone_tracker, badge_purchases
-- Modified: badge_thresholds (added unlock_levels)
--          user_badge_holdings (added unlock_levels)
-- =====================================================