-- Create admin notifications table for KYC submissions
CREATE TABLE IF NOT EXISTS public.kyc_admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_profile_id UUID NOT NULL REFERENCES public.kyc_profiles_new(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.kyc_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can manage all KYC notifications"
ON public.kyc_admin_notifications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to auto-create notification when KYC is submitted
CREATE OR REPLACE FUNCTION public.create_kyc_admin_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    INSERT INTO public.kyc_admin_notifications (
      kyc_profile_id,
      user_id,
      level,
      status,
      submitted_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.level,
      'pending',
      NEW.submitted_at
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-notification
DROP TRIGGER IF EXISTS trigger_create_kyc_notification ON public.kyc_profiles_new;
CREATE TRIGGER trigger_create_kyc_notification
  AFTER INSERT OR UPDATE ON public.kyc_profiles_new
  FOR EACH ROW
  EXECUTE FUNCTION public.create_kyc_admin_notification();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_kyc_notifications_status ON public.kyc_admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_notifications_level ON public.kyc_admin_notifications(level);
CREATE INDEX IF NOT EXISTS idx_kyc_notifications_created_at ON public.kyc_admin_notifications(created_at DESC);