-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION trigger_build_referral_tree()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger if locked_at changed from NULL to NOT NULL
  IF OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL THEN
    -- Invoke the build-referral-tree edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/build-referral-tree',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'include_unlocked', false
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;