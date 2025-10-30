-- =====================================================
-- FIX EMAIL VERIFICATION TRIGGER
-- Update environment variable names to correct format
-- =====================================================

-- Drop and recreate the trigger function with correct settings
DROP FUNCTION IF EXISTS public.process_email_verification_referral() CASCADE;

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
  -- Only proceed if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Check if user has a locked referral
    SELECT * INTO referral_record
    FROM referral_links_new
    WHERE user_id = NEW.id
    AND sponsor_id IS NOT NULL
    AND locked_at IS NOT NULL;
    
    -- If no referral exists, exit
    IF referral_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get Supabase URL and service role key from environment (FIXED)
    function_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
    
    -- Fallback to env vars if settings are not configured
    IF function_url IS NULL THEN
      function_url := current_setting('env.SUPABASE_URL', true);
    END IF;
    
    IF service_role_key IS NULL THEN
      service_role_key := current_setting('env.SUPABASE_SERVICE_ROLE_KEY', true);
    END IF;
    
    -- If still null, log error and exit
    IF function_url IS NULL OR service_role_key IS NULL THEN
      RAISE WARNING 'Supabase URL or service role key not configured. Cannot call edge functions.';
      RETURN NEW;
    END IF;
    
    -- Call build-referral-tree edge function
    PERFORM net.http_post(
      url := function_url || '/functions/v1/build-referral-tree',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.id::text,
        'include_unlocked', false
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_email_verified_referral ON auth.users;
CREATE TRIGGER on_email_verified_referral
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_email_verification_referral();

COMMENT ON FUNCTION public.process_email_verification_referral() IS 
'Triggers referral tree build and signup commission distribution when user verifies email. 
REQUIRES: app.supabase_url and app.supabase_service_role_key database settings.';