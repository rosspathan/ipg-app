-- Remove duplicate VIP badge bonus credit
DO $$
DECLARE
  v_current_rate NUMERIC;
  v_current_balance NUMERIC;
  v_duplicate_ledger_id UUID;
BEGIN
  -- Get current BSK rate
  SELECT rate_inr_per_bsk INTO v_current_rate FROM bsk_rates ORDER BY created_at DESC LIMIT 1;
  
  -- Get user's current holding balance
  SELECT holding_balance INTO v_current_balance 
  FROM user_bsk_balances 
  WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae';
  
  -- Find the most recent duplicate ledger entry
  SELECT id INTO v_duplicate_ledger_id
  FROM bsk_holding_ledger
  WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae'
    AND tx_type = 'badge_bonus'
    AND amount_bsk = 10000
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Deduct duplicate 10,000 BSK
  UPDATE user_bsk_balances
  SET 
    holding_balance = holding_balance - 10000,
    total_earned_holding = total_earned_holding - 10000,
    updated_at = NOW()
  WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae';
  
  -- Create correction ledger entry
  INSERT INTO bsk_holding_ledger (
    user_id,
    amount_bsk,
    amount_inr,
    rate_snapshot,
    balance_before,
    balance_after,
    tx_type,
    notes,
    created_at
  ) VALUES (
    '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae',
    -10000,
    -10000 * v_current_rate,
    v_current_rate,
    v_current_balance,
    v_current_balance - 10000,
    'correction',
    'Removed duplicate VIP badge bonus (migration ran twice)',
    NOW()
  );
  
  -- Mark the duplicate entry with metadata
  UPDATE bsk_holding_ledger
  SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{is_duplicate}', 'true')
  WHERE id = v_duplicate_ledger_id;
END $$;