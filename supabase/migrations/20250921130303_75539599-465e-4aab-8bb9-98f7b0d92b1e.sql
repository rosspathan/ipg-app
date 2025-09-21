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

-- Create a view for users to see only essential non-sensitive information
CREATE OR REPLACE VIEW public.fiat_settings_inr_public AS
SELECT 
  id,
  enabled,
  bank_name,
  min_deposit,
  fee_percent,
  fee_fixed,
  notes,
  created_at,
  updated_at
FROM public.fiat_settings_inr
WHERE enabled = true;

-- Allow authenticated users to view the public (non-sensitive) view
GRANT SELECT ON public.fiat_settings_inr_public TO authenticated;

-- Create RLS policy for the public view
ALTER VIEW public.fiat_settings_inr_public SET (security_barrier = true);

-- Add comment to document the security fix
COMMENT ON POLICY "Admin only access to banking settings" ON public.fiat_settings_inr 
IS 'SECURITY: Only admins can access sensitive banking information including account numbers, IFSC codes, and UPI IDs';