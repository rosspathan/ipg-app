-- Fix remaining function security warnings by setting search_path properly

-- Fix trigger functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.update_markets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ticket_last_msg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.support_tickets 
  SET last_msg_at = NEW.created_at 
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, wallet_address)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'wallet_address'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_referral_configs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_profile_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.audit_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_order_admin_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_admin_action(
      'order_status_change',
      'orders',
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_admin_role_to_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Check if the new user's email is the admin email
  IF NEW.email = 'rosspathan@gmail.com' THEN
    -- Insert admin role for this user
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'admin'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  
  -- Set filled_at when order becomes filled
  IF OLD.status != 'filled' AND NEW.status = 'filled' THEN
    NEW.filled_at = now();
  END IF;
  
  -- Set cancelled_at when order is cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;