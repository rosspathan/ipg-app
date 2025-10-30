-- ============================================
-- PHASE 1: Add Database Trigger for Auto-Completion
-- ============================================

-- Create trigger to auto-complete onboarding when referral is locked
CREATE OR REPLACE FUNCTION auto_complete_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- If referral just got locked and onboarding not complete, mark it complete
  IF NEW.locked_at IS NOT NULL AND (OLD.locked_at IS NULL OR OLD.locked_at IS DISTINCT FROM NEW.locked_at) THEN
    UPDATE profiles
    SET onboarding_completed_at = NOW(),
        setup_complete = true
    WHERE user_id = NEW.user_id 
      AND onboarding_completed_at IS NULL
      AND email IS NOT NULL
      AND wallet_address IS NOT NULL;
    
    RAISE NOTICE 'Auto-completed onboarding for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_complete_onboarding ON referral_links_new;

-- Create trigger on referral_links_new
CREATE TRIGGER trigger_auto_complete_onboarding
  AFTER INSERT OR UPDATE ON referral_links_new
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_onboarding();

-- ============================================
-- PHASE 2: Fix Existing Broken Test Users
-- ============================================

-- Fix yaleka9663@dropeso.com
DO $$
DECLARE
  v_user_id UUID := '14281276-d9d4-44b1-baf6-038e02a4d9a1';
  v_sponsor_id UUID := '364415f7-fa4b-42ff-b416-8eab8e4402c4'; -- banalasathish143
  v_sponsor_code TEXT := '364415F7';
BEGIN
  -- Insert or update referral link (no referral_code column)
  INSERT INTO referral_links_new (
    user_id, sponsor_id, sponsor_code_used, 
    locked_at, capture_stage, first_touch_at
  )
  VALUES (
    v_user_id, 
    v_sponsor_id, 
    v_sponsor_code,
    NOW(), 
    'manual_repair', 
    '2025-10-30 20:58:12+00'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET sponsor_id = v_sponsor_id,
      sponsor_code_used = v_sponsor_code,
      locked_at = NOW(),
      capture_stage = 'manual_repair';
  
  -- Mark onboarding complete
  UPDATE profiles
  SET onboarding_completed_at = NOW(),
      setup_complete = true
  WHERE user_id = v_user_id
    AND onboarding_completed_at IS NULL;
  
  RAISE NOTICE 'Fixed user: yaleka9663@dropeso.com';
END $$;

-- Fix yegonij957@keevle.com
DO $$
DECLARE
  v_user_id UUID := '6410525f-e204-45b1-950b-52a1b6859d27';
  v_sponsor_id UUID := '364415f7-fa4b-42ff-b416-8eab8e4402c4';
  v_sponsor_code TEXT := '364415F7';
BEGIN
  INSERT INTO referral_links_new (
    user_id, sponsor_id, sponsor_code_used, 
    locked_at, capture_stage, first_touch_at
  )
  VALUES (
    v_user_id, v_sponsor_id, v_sponsor_code,
    NOW(), 'manual_repair', '2025-10-30 21:14:48+00'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET sponsor_id = v_sponsor_id,
      sponsor_code_used = v_sponsor_code,
      locked_at = NOW(),
      capture_stage = 'manual_repair';
  
  UPDATE profiles
  SET onboarding_completed_at = NOW(),
      setup_complete = true
  WHERE user_id = v_user_id
    AND onboarding_completed_at IS NULL;
  
  RAISE NOTICE 'Fixed user: yegonij957@keevle.com';
END $$;

-- Fix facofe4355@hh7f.com
DO $$
DECLARE
  v_user_id UUID := '0d62751c-f4d6-4dbe-8201-3f4211fa82f0';
  v_sponsor_id UUID := '364415f7-fa4b-42ff-b416-8eab8e4402c4';
  v_sponsor_code TEXT := '364415F7';
BEGIN
  INSERT INTO referral_links_new (
    user_id, sponsor_id, sponsor_code_used, 
    locked_at, capture_stage, first_touch_at
  )
  VALUES (
    v_user_id, v_sponsor_id, v_sponsor_code,
    NOW(), 'manual_repair', '2025-10-30 21:31:17+00'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET sponsor_id = v_sponsor_id,
      sponsor_code_used = v_sponsor_code,
      locked_at = NOW(),
      capture_stage = 'manual_repair';
  
  UPDATE profiles
  SET onboarding_completed_at = NOW(),
      setup_complete = true
  WHERE user_id = v_user_id
    AND onboarding_completed_at IS NULL;
  
  RAISE NOTICE 'Fixed user: facofe4355@hh7f.com';
END $$;