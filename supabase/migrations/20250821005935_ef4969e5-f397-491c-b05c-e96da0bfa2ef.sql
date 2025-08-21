-- Fix security warnings by updating functions with proper search_path

-- Update the update_orders_updated_at function with search_path
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER;

-- Update the log_order_admin_action function with search_path
CREATE OR REPLACE FUNCTION public.log_order_admin_action()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql 
SET search_path = public
SECURITY DEFINER;