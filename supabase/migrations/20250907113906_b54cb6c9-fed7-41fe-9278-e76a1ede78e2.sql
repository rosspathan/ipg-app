-- Fix security issue: Restrict fiat_bank_accounts access to authenticated users only
-- Current policy allows unauthenticated access which is a major security vulnerability

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Users can view active fiat_bank_accounts" ON public.fiat_bank_accounts;

-- Create a new secure policy that requires authentication
CREATE POLICY "Authenticated users can view active fiat_bank_accounts" 
ON public.fiat_bank_accounts 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Add audit logging for bank account access (for security monitoring)
CREATE OR REPLACE FUNCTION public.log_bank_account_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone accesses bank account data
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    created_at
  ) VALUES (
    auth.uid(),
    'bank_account_viewed',
    'fiat_bank_accounts',
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

-- Note: We're not adding the trigger yet as it would log every SELECT, 
-- which might be too verbose. This can be enabled later if needed for investigation.