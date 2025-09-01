-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix existing masked profile data function
CREATE OR REPLACE FUNCTION public.get_masked_profile_data(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_wallet_address text DEFAULT NULL
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
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
$$;

-- Fix existing audit profile changes function
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;