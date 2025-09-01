-- Security hardening for profiles table
-- Add constraint to ensure user_id is always set
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_user_id_not_null 
CHECK (user_id IS NOT NULL);

-- Create function to mask sensitive data for security
CREATE OR REPLACE FUNCTION public.get_masked_profile_data(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_wallet_address text DEFAULT NULL
) RETURNS jsonb AS $$
BEGIN
  -- Only return full data if user owns the profile or is admin
  IF auth.uid() = p_user_id OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'email', p_email,
      'phone', p_phone,
      'wallet_address', p_wallet_address,
      'masked', false
    );
  ELSE
    -- Return masked data for security
    RETURN jsonb_build_object(
      'email', CASE WHEN p_email IS NOT NULL THEN '***@***.***' ELSE NULL END,
      'phone', CASE WHEN p_phone IS NOT NULL THEN '***-***-****' ELSE NULL END,
      'wallet_address', CASE WHEN p_wallet_address IS NOT NULL THEN '0x***...***' ELSE NULL END,
      'masked', true
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create audit function for profile updates
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log profile changes for security audit
  INSERT INTO public.audit_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'profile_created'
      WHEN TG_OP = 'UPDATE' THEN 'profile_updated'
      WHEN TG_OP = 'DELETE' THEN 'profile_deleted'
    END,
    'profiles',
    COALESCE(NEW.user_id, OLD.user_id)::text,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the operation if audit logging fails
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for profile change auditing
DROP TRIGGER IF EXISTS profile_changes_audit ON public.profiles;
CREATE TRIGGER profile_changes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();

-- Add comment to document sensitive data handling
COMMENT ON TABLE public.profiles IS 'Contains sensitive user data. Protected by RLS policies requiring authentication. All changes are audited.';
COMMENT ON COLUMN public.profiles.email IS 'Sensitive: Email address for user identification';
COMMENT ON COLUMN public.profiles.phone IS 'Sensitive: Phone number for 2FA and verification';
COMMENT ON COLUMN public.profiles.wallet_address IS 'Sensitive: Crypto wallet address for financial operations';
COMMENT ON COLUMN public.profiles.full_name IS 'Sensitive: User real name for KYC compliance';