-- Fix create_kyc_admin_notification to safely handle TEXT user_id and only insert on 'submitted' transition
CREATE OR REPLACE FUNCTION public.create_kyc_admin_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create notification when status transitions to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status <> 'submitted') THEN
    -- Insert only if NEW.user_id is a valid UUID
    IF NEW.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      INSERT INTO public.kyc_admin_notifications (
        kyc_profile_id,
        user_id,
        level,
        status,
        submitted_at
      ) VALUES (
        NEW.id,
        NEW.user_id::uuid,
        NEW.level,
        'pending',
        COALESCE(NEW.submitted_at, now())
      );
    ELSE
      -- Skip (legacy non-UUID user_id) instead of erroring
      RAISE NOTICE 'Skipping KYC admin notification for non-UUID user_id: %', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
