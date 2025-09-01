-- Security hardening for profiles table - corrected version
-- Add additional constraint to ensure user_id is never NULL
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_not_null 
CHECK (user_id IS NOT NULL);

-- Create function to mask sensitive data for display purposes
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
      'access_level', 'full'
    );
  ELSE
    -- Return masked data for security
    RETURN jsonb_build_object(
      'email', CASE WHEN p_email IS NOT NULL THEN '***@***.***' ELSE NULL END,
      'phone', CASE WHEN p_phone IS NOT NULL THEN '***-***-****' ELSE NULL END,
      'wallet_address', CASE WHEN p_wallet_address IS NOT NULL THEN '0x***...***' ELSE NULL END,
      'access_level', 'masked'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create audit logging function for profile modifications
CREATE OR REPLACE FUNCTION public.log_profile_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log profile updates for security auditing
  IF TG_OP = 'UPDATE' THEN
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
      'profile_updated',
      'profiles',
      NEW.user_id::text,
      to_jsonb(OLD),
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      resource_type, 
      resource_id,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      'profile_created',
      'profiles',
      NEW.user_id::text,
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the operation if audit logging fails
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile modification audit logging
DROP TRIGGER IF EXISTS profile_modification_audit ON public.profiles;
CREATE TRIGGER profile_modification_audit
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_modification();