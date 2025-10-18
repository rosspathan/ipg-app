-- =====================================================
-- UPDATE EMAIL VERIFICATION TRIGGER (FIXED)
-- Replace old referral logic with new 50-level system
-- =====================================================

-- Drop the correct triggers and function
DROP TRIGGER IF EXISTS on_email_verified_referral ON auth.users;
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
DROP FUNCTION IF EXISTS public.process_email_verification_referral() CASCADE;

-- Create new trigger function that calls edge functions
CREATE OR REPLACE FUNCTION public.process_email_verification_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only process when email_confirmed_at is first set
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Check if user has a locked referral link
    SELECT * INTO referral_record
    FROM referral_links_new
    WHERE user_id = NEW.id
    AND sponsor_id IS NOT NULL
    AND locked_at IS NOT NULL;
    
    -- If no referral exists, exit
    IF referral_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get Supabase URL and service role key from environment
    function_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Call build-referral-tree edge function
    PERFORM net.http_post(
      url := function_url || '/functions/v1/build-referral-tree',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.id::text
      )
    );
    
    -- Call process-signup-commissions edge function
    PERFORM net.http_post(
      url := function_url || '/functions/v1/process-signup-commissions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.id::text
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger with correct name
CREATE TRIGGER on_email_verified_referral
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_email_verification_referral();

-- =====================================================
-- MIGRATION COMPLETE
-- Updated email verification trigger to use new 50-level referral system
-- =====================================================