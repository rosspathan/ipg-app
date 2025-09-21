-- CRITICAL SECURITY FIX: Restrict access to sensitive banking information
-- Remove the dangerous public access policy that allows anyone to view bank details

-- Drop the insecure public policy
DROP POLICY IF EXISTS "Users can view fiat_settings_inr" ON public.fiat_settings_inr;

-- Create secure admin-only access policy for sensitive banking configuration
CREATE POLICY "Admin only access to banking settings"
ON public.fiat_settings_inr
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled on this table
ALTER TABLE public.fiat_settings_inr ENABLE ROW LEVEL SECURITY;

-- Add audit logging for access to sensitive banking data
CREATE OR REPLACE FUNCTION public.log_banking_settings_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone accesses banking settings
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    created_at
  ) VALUES (
    auth.uid(),
    'banking_settings_viewed',
    'fiat_settings_inr',
    NEW.id::text,
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the query if audit logging fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for audit logging
DROP TRIGGER IF EXISTS log_banking_settings_access_trigger ON public.fiat_settings_inr;
CREATE TRIGGER log_banking_settings_access_trigger
  AFTER SELECT ON public.fiat_settings_inr
  FOR EACH ROW
  EXECUTE FUNCTION public.log_banking_settings_access();