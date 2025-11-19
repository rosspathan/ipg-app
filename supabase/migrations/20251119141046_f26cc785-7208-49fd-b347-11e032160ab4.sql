-- Function to check if any active offers exist
CREATE OR REPLACE FUNCTION check_active_offers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bsk_purchase_bonuses
    WHERE is_active = true
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at > now())
  );
$$;

-- Function to auto-disable transfers when offer activates
CREATE OR REPLACE FUNCTION auto_disable_transfers_on_offer_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If offer is being activated
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    -- Check if offer is currently within valid time window
    IF (NEW.start_at IS NULL OR NEW.start_at <= now()) 
       AND (NEW.end_at IS NULL OR NEW.end_at > now()) THEN
      
      -- Disable BSK transfers
      UPDATE system_settings
      SET value = 'false', updated_at = now()
      WHERE key = 'bsk_transfers_enabled';
      
      RAISE NOTICE 'BSK transfers auto-disabled due to offer activation: %', NEW.campaign_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto-enable transfers when no active offers remain
CREATE OR REPLACE FUNCTION auto_enable_transfers_on_offer_deactivate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If offer is being deactivated or deleted
  IF (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true)
     OR (TG_OP = 'DELETE' AND OLD.is_active = true) THEN
    
    -- Check if any other active offers exist
    IF NOT check_active_offers() THEN
      -- Enable BSK transfers (no active offers remaining)
      UPDATE system_settings
      SET value = 'true', updated_at = now()
      WHERE key = 'bsk_transfers_enabled';
      
      RAISE NOTICE 'BSK transfers auto-enabled (no active offers remaining)';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_disable_transfers_on_activate ON bsk_purchase_bonuses;
DROP TRIGGER IF EXISTS trigger_enable_transfers_on_deactivate ON bsk_purchase_bonuses;

-- Create trigger for offer activation
CREATE TRIGGER trigger_disable_transfers_on_activate
  AFTER INSERT OR UPDATE OF is_active ON bsk_purchase_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION auto_disable_transfers_on_offer_activate();

-- Create trigger for offer deactivation
CREATE TRIGGER trigger_enable_transfers_on_deactivate
  AFTER UPDATE OF is_active OR DELETE ON bsk_purchase_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION auto_enable_transfers_on_offer_deactivate();

-- Manual function for admins to sync transfer status with offer state
CREATE OR REPLACE FUNCTION sync_transfer_status_with_offers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_offers boolean;
  current_transfer_status boolean;
BEGIN
  -- Check if there are active offers
  SELECT check_active_offers() INTO has_active_offers;
  
  -- Get current transfer status
  SELECT value = 'true' INTO current_transfer_status
  FROM system_settings
  WHERE key = 'bsk_transfers_enabled';
  
  -- Update if mismatch
  IF has_active_offers AND current_transfer_status THEN
    UPDATE system_settings
    SET value = 'false', updated_at = now()
    WHERE key = 'bsk_transfers_enabled';
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'disabled_transfers',
      'reason', 'active_offers_exist'
    );
  ELSIF NOT has_active_offers AND NOT current_transfer_status THEN
    UPDATE system_settings
    SET value = 'true', updated_at = now()
    WHERE key = 'bsk_transfers_enabled';
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'enabled_transfers',
      'reason', 'no_active_offers'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'action', 'no_change_needed',
      'has_active_offers', has_active_offers,
      'transfers_enabled', current_transfer_status
    );
  END IF;
END;
$$;