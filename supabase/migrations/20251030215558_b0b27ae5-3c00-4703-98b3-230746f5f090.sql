-- Fix broken referral for gidigam586@ametitas.com
-- This user signed up with code 364415F7 but was not properly linked

DO $$
DECLARE
  v_user_id UUID;
  v_sponsor_id UUID;
BEGIN
  -- Get user ID for gidigam586@ametitas.com
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE email = 'gidigam586@ametitas.com';

  -- Get sponsor ID for banalasathish143 (code 364415F7)
  SELECT user_id INTO v_sponsor_id
  FROM profiles
  WHERE referral_code = '364415F7';

  -- Only proceed if both users exist
  IF v_user_id IS NOT NULL AND v_sponsor_id IS NOT NULL THEN
    -- Insert the missing referral link
    INSERT INTO referral_links_new (
      user_id,
      sponsor_id,
      sponsor_code_used,
      locked_at,
      capture_stage,
      first_touch_at,
      created_at
    )
    VALUES (
      v_user_id,
      v_sponsor_id,
      '364415F7',
      NOW(),
      'after_email_verify',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      sponsor_id = EXCLUDED.sponsor_id,
      sponsor_code_used = EXCLUDED.sponsor_code_used,
      locked_at = EXCLUDED.locked_at,
      capture_stage = EXCLUDED.capture_stage;

    RAISE NOTICE 'Fixed referral link for user % with sponsor %', v_user_id, v_sponsor_id;
  ELSE
    RAISE NOTICE 'Could not find user or sponsor';
  END IF;
END $$;