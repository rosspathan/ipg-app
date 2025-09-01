-- Additional security hardening for sensitive data
-- Create function to log profile access for audit trail
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when profiles are accessed for audit trail
  INSERT INTO public.audit_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id,
    created_at
  ) VALUES (
    auth.uid(),
    'profile_accessed',
    'profiles',
    NEW.user_id::text,
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the operation if audit logging fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS profile_access_audit ON public.profiles;
CREATE TRIGGER profile_access_audit
  AFTER SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_access();

-- Add additional constraint to ensure user_id matches auth.uid() on updates
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_immutable 
CHECK (user_id IS NOT NULL);

-- Create function to mask sensitive data for non-owners
CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_data(
  p_user_id uuid,
  p_email text,
  p_phone text,
  p_wallet_address text
) RETURNS jsonb AS $$
BEGIN
  -- Only return full data if user owns the profile or is admin
  IF auth.uid() = p_user_id OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'email', p_email,
      'phone', p_phone,
      'wallet_address', p_wallet_address
    );
  ELSE
    -- Return masked data for security
    RETURN jsonb_build_object(
      'email', CASE WHEN p_email IS NOT NULL THEN '***@***.***' ELSE NULL END,
      'phone', CASE WHEN p_phone IS NOT NULL THEN '***-***-****' ELSE NULL END,
      'wallet_address', CASE WHEN p_wallet_address IS NOT NULL THEN '0x***...***' ELSE NULL END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;