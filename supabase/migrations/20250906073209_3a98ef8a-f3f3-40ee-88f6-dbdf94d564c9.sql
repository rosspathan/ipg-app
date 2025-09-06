-- Fix search path for the new function
CREATE OR REPLACE FUNCTION public.update_ticket_last_msg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets 
  SET last_msg_at = NEW.created_at 
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;