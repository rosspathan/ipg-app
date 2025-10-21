-- =====================================================
-- SECURITY FIX: Add search_path to functions
-- This prevents SQL injection via search_path manipulation
-- =====================================================

-- 1. Fix check_badge_eligibility
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(sponsor_badge text, required_badge text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN required_badge = 'ANY_BADGE' THEN sponsor_badge IS NOT NULL AND sponsor_badge != 'NONE'
    ELSE get_badge_tier_value(sponsor_badge) >= get_badge_tier_value(required_badge)
  END;
$$;

-- 2. Fix get_badge_tier_value
CREATE OR REPLACE FUNCTION public.get_badge_tier_value(badge_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
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

-- 3. Fix update_ad_mining_updated_at
CREATE OR REPLACE FUNCTION public.update_ad_mining_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Fix update_draw_configs_updated_at
CREATE OR REPLACE FUNCTION public.update_draw_configs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Fix update_inr_balance_updated_at
CREATE OR REPLACE FUNCTION public.update_inr_balance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Fix update_insurance_bsk_plans_updated_at
CREATE OR REPLACE FUNCTION public.update_insurance_bsk_plans_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. Fix update_program_updated_at
CREATE OR REPLACE FUNCTION public.update_program_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 8. Fix update_team_referral_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_team_referral_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 9. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 10. Fix update_user_program_states_updated_at
CREATE OR REPLACE FUNCTION public.update_user_program_states_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;