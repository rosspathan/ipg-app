-- Create function to auto-build referral tree when sponsor is locked
CREATE OR REPLACE FUNCTION auto_build_referral_tree()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if locked_at changed from NULL to a timestamp
  IF OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL AND NEW.sponsor_id IS NOT NULL THEN
    -- Call the build-referral-tree edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/build-referral-tree',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object('user_id', NEW.user_id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on referral_links_new
DROP TRIGGER IF EXISTS trigger_auto_build_referral_tree ON referral_links_new;
CREATE TRIGGER trigger_auto_build_referral_tree
  AFTER UPDATE ON referral_links_new
  FOR EACH ROW
  EXECUTE FUNCTION auto_build_referral_tree();