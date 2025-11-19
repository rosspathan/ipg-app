-- Add BSK transfer control setting
INSERT INTO public.system_settings (key, value, description, updated_at) 
VALUES ('bsk_transfers_enabled', 'true', 'Enable or disable BSK transfers between users', now())
ON CONFLICT (key) DO NOTHING;

-- Create function to auto-disable transfers when any offer becomes active
CREATE OR REPLACE FUNCTION auto_disable_bsk_transfers_on_offer()
RETURNS TRIGGER AS $$
BEGIN
  -- If an offer is being activated (is_active changed to true)
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    -- Disable BSK transfers
    UPDATE public.system_settings
    SET value = 'false', updated_at = now()
    WHERE key = 'bsk_transfers_enabled';
    
    -- Log this action
    RAISE NOTICE 'BSK transfers auto-disabled due to offer activation: %', NEW.campaign_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bsk_purchase_bonuses
DROP TRIGGER IF EXISTS trigger_auto_disable_transfers ON public.bsk_purchase_bonuses;
CREATE TRIGGER trigger_auto_disable_transfers
  AFTER INSERT OR UPDATE OF is_active
  ON public.bsk_purchase_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION auto_disable_bsk_transfers_on_offer();

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);