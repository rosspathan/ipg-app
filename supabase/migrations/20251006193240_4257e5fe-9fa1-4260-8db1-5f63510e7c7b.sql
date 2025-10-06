-- ============================================
-- Phase 1: Enhanced User Onboarding & Profile System
-- ============================================

-- Drop existing trigger and function to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_from_email text;
  new_referral_code text;
  pending_ref_code text;
  referrer_user_id uuid;
BEGIN
  -- Extract username from email (part before @)
  username_from_email := split_part(NEW.email, '@', 1);
  
  -- Generate a unique referral code for this user (8 characters)
  new_referral_code := public.generate_referral_code(8);
  
  -- Insert profile with email username as full_name
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    username_from_email, -- Set username from email
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, username_from_email),
    updated_at = NOW();
  
  -- Create referral code entry for this user
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, new_referral_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize BSK balances
  INSERT INTO public.user_bsk_balances (
    user_id,
    withdrawable_balance,
    holding_balance,
    total_earned_withdrawable,
    total_earned_holding
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check for referral code in user metadata (stored during signup)
  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    pending_ref_code := NEW.raw_user_meta_data->>'referral_code';
    
    IF pending_ref_code IS NOT NULL AND pending_ref_code != '' THEN
      -- Find the referrer by their referral code
      SELECT user_id INTO referrer_user_id
      FROM public.referral_codes
      WHERE code = pending_ref_code
      LIMIT 1;
      
      -- Create referral relationship if referrer found and not self-referral
      IF referrer_user_id IS NOT NULL AND referrer_user_id != NEW.id THEN
        INSERT INTO public.referral_relationships (
          referrer_id,
          referee_id,
          created_at
        )
        VALUES (
          referrer_user_id,
          NEW.id,
          NOW()
        )
        ON CONFLICT (referee_id) DO NOTHING;
        
        -- Update referral_links_new if exists
        INSERT INTO public.referral_links_new (
          user_id,
          sponsor_id,
          referral_code,
          first_touch_at,
          total_referrals
        )
        VALUES (
          NEW.id,
          referrer_user_id,
          new_referral_code,
          NOW(),
          0
        )
        ON CONFLICT (user_id) DO UPDATE
        SET sponsor_id = EXCLUDED.sponsor_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helper function to get user's referral code
CREATE OR REPLACE FUNCTION public.get_user_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT code FROM public.referral_codes WHERE user_id = p_user_id LIMIT 1;
$$;

-- Add helper function to get user's referral stats
CREATE OR REPLACE FUNCTION public.get_user_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  ref_code text;
  direct_count integer;
  total_earnings numeric;
BEGIN
  -- Get user's referral code
  SELECT code INTO ref_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  -- Count direct referrals
  SELECT COUNT(*) INTO direct_count
  FROM public.referral_relationships
  WHERE referrer_id = p_user_id;
  
  -- Calculate total earnings from referrals
  SELECT COALESCE(SUM(amount_bonus), 0) INTO total_earnings
  FROM public.referral_events
  WHERE referrer_id = p_user_id;
  
  result := jsonb_build_object(
    'referral_code', COALESCE(ref_code, ''),
    'direct_referrals', COALESCE(direct_count, 0),
    'total_earnings_bsk', COALESCE(total_earnings, 0),
    'referral_link', CONCAT(current_setting('app.settings.site_url', true), '/r/', COALESCE(ref_code, ''))
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO authenticated;