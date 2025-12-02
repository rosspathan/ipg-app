-- Fix create_kyc_admin_notification trigger function
-- Remove broken UUID regex validation since user_id is already UUID type

DROP FUNCTION IF EXISTS public.create_kyc_admin_notification() CASCADE;

CREATE OR REPLACE FUNCTION public.create_kyc_admin_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification when status changes to 'submitted'
  IF (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'submitted' THEN
    -- Insert notification directly - no need to validate UUID since column is UUID type
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      priority,
      related_resource_id,
      related_user_id,
      metadata
    ) VALUES (
      'kyc_submission',
      'New KYC Submission',
      'A user has submitted their KYC documents for review',
      'high',
      NEW.id,
      NEW.user_id,
      jsonb_build_object(
        'kyc_profile_id', NEW.id,
        'level', NEW.level,
        'status', NEW.status,
        'submitted_at', COALESCE(NEW.submitted_at, now())
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_kyc_admin_notification_trigger ON public.kyc_profiles_new;

CREATE TRIGGER create_kyc_admin_notification_trigger
  AFTER INSERT OR UPDATE ON public.kyc_profiles_new
  FOR EACH ROW
  EXECUTE FUNCTION public.create_kyc_admin_notification();