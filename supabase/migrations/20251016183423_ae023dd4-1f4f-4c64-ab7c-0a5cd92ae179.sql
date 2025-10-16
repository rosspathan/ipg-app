-- Week 1 Day 1-2: BSK System Setup
-- Task 1.2: Update BSK Rate to ₹1.00
-- Task 1.3: Create Admin BSK Mint Function

-- Update BSK rate to 1.00 INR
UPDATE bonus_prices 
SET price = 1.0, base_symbol = 'INR', recorded_at = now()
WHERE asset_id = (SELECT id FROM bonus_assets WHERE symbol = 'BSK');

-- Update team referral settings with new rate
UPDATE team_referral_settings 
SET bsk_inr_rate = 1.0, updated_at = now()
WHERE id IS NOT NULL;

-- Create function for admin to update BSK rate
CREATE OR REPLACE FUNCTION admin_update_bsk_rate(
  p_admin_id UUID,
  p_new_rate NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bsk_asset_id UUID;
  v_old_rate NUMERIC;
BEGIN
  -- Check admin permission
  IF NOT has_role(p_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can update BSK rate';
  END IF;
  
  IF p_new_rate <= 0 THEN
    RAISE EXCEPTION 'Rate must be positive';
  END IF;
  
  SELECT id INTO v_bsk_asset_id FROM bonus_assets WHERE symbol = 'BSK';
  
  -- Get old rate
  SELECT price INTO v_old_rate FROM bonus_prices WHERE asset_id = v_bsk_asset_id;
  
  -- Update rate
  UPDATE bonus_prices 
  SET price = p_new_rate, recorded_at = now()
  WHERE asset_id = v_bsk_asset_id;
  
  -- Update team referral settings
  UPDATE team_referral_settings 
  SET bsk_inr_rate = p_new_rate, updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true, 
    'old_rate', v_old_rate,
    'new_rate', p_new_rate,
    'updated_at', now()
  );
END;
$$ LANGUAGE plpgsql;

-- Create table for admin BSK operations audit
CREATE TABLE IF NOT EXISTS bsk_admin_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('mint', 'burn', 'transfer', 'rate_change')),
  amount NUMERIC,
  destination TEXT,
  recipient_id UUID,
  config_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bsk_admin_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view operations" ON bsk_admin_operations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create operations" ON bsk_admin_operations
  FOR INSERT WITH CHECK (true);

-- Create mint function
CREATE OR REPLACE FUNCTION admin_mint_bsk(
  p_admin_id UUID,
  p_amount NUMERIC,
  p_destination TEXT,
  p_recipient_id UUID DEFAULT NULL,
  p_config_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bsk_asset_id UUID;
  v_result JSONB;
BEGIN
  -- Check admin permission
  IF NOT has_role(p_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can mint BSK';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  SELECT id INTO v_bsk_asset_id FROM bonus_assets WHERE symbol = 'BSK';
  
  -- Mint to destination
  IF p_destination = 'user' THEN
    IF p_recipient_id IS NULL THEN
      RAISE EXCEPTION 'Recipient ID required for user destination';
    END IF;
    
    -- Credit user withdrawable BSK balance
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (p_recipient_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + p_amount,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + p_amount;
    
    -- Create bonus ledger entry
    INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
    VALUES (p_recipient_id, 'admin_mint', p_amount, jsonb_build_object('notes', p_notes, 'minted_by', p_admin_id));
      
  ELSIF p_destination = 'lucky_draw' THEN
    IF p_config_id IS NULL THEN
      RAISE EXCEPTION 'Config ID required for lucky draw destination';
    END IF;
    
    -- Update draw template prize pool
    UPDATE draw_templates 
    SET 
      first_place_prize = COALESCE(first_place_prize, 0) + (p_amount * 0.5),
      second_place_prize = COALESCE(second_place_prize, 0) + (p_amount * 0.3),
      third_place_prize = COALESCE(third_place_prize, 0) + (p_amount * 0.2)
    WHERE id = p_config_id;
    
  END IF;
  
  -- Log mint event
  INSERT INTO bsk_admin_operations (
    admin_id, operation_type, amount, destination, recipient_id, config_id, notes
  ) VALUES (
    p_admin_id, 'mint', p_amount, p_destination, p_recipient_id, p_config_id, p_notes
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'amount_minted', p_amount,
    'destination', p_destination,
    'recipient_id', p_recipient_id,
    'config_id', p_config_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;