-- Fix function security issues by setting proper search_path
CREATE OR REPLACE FUNCTION public.update_bonus_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;