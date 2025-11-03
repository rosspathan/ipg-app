-- Create function to auto-build referral tree when a sponsor is locked
CREATE OR REPLACE FUNCTION trigger_build_referral_tree()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on referral_links_new
DROP TRIGGER IF EXISTS auto_build_referral_tree ON referral_links_new;
CREATE TRIGGER auto_build_referral_tree
  AFTER UPDATE ON referral_links_new
  FOR EACH ROW
  EXECUTE FUNCTION trigger_build_referral_tree();