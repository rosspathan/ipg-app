-- Create secure recipient verification function that bypasses RLS
CREATE OR REPLACE FUNCTION public.verify_transfer_recipient(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile record;
BEGIN
  -- Lookup profile by email
  SELECT user_id, email, full_name, display_name, username
  INTO v_profile
  FROM profiles 
  WHERE email = p_email
  LIMIT 1;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'User not found');
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_profile.user_id,
    'email', v_profile.email,
    'full_name', COALESCE(v_profile.full_name, v_profile.display_name, v_profile.username, 'User')
  );
END;
$$;

-- Update execute_bsk_transfer to add balance validation at the start
CREATE OR REPLACE FUNCTION public.execute_bsk_transfer(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_balance numeric;
  v_recipient_balance numeric;
  v_transaction_ref text;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Check sender balance FIRST
  SELECT COALESCE(withdrawable_balance, 0) INTO v_sender_balance
  FROM user_bsk_balances
  WHERE user_id = p_sender_id;

  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance',
      'available', v_sender_balance,
      'required', p_amount
    );
  END IF;

  -- Generate unique transaction reference
  v_transaction_ref := 'TXN-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- Deduct from sender
  UPDATE user_bsk_balances
  SET withdrawable_balance = withdrawable_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_sender_id
  RETURNING withdrawable_balance INTO v_sender_balance;

  -- Credit to recipient (create record if doesn't exist)
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance)
  VALUES (p_recipient_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + p_amount,
    updated_at = NOW()
  RETURNING withdrawable_balance INTO v_recipient_balance;

  -- Create ledger entries for both parties
  -- Sender entry (debit)
  INSERT INTO unified_bsk_ledger (
    user_id,
    tx_type,
    tx_subtype,
    bsk_amount,
    balance_type,
    reference_id,
    metadata
  ) VALUES (
    p_sender_id,
    'transfer',
    'transfer_out',
    -p_amount,
    'withdrawable',
    v_transaction_ref,
    jsonb_build_object(
      'transaction_ref', v_transaction_ref,
      'recipient_id', p_recipient_id
    )
  );

  -- Recipient entry (credit)
  INSERT INTO unified_bsk_ledger (
    user_id,
    tx_type,
    tx_subtype,
    bsk_amount,
    balance_type,
    reference_id,
    metadata
  ) VALUES (
    p_recipient_id,
    'transfer',
    'transfer_in',
    p_amount,
    'withdrawable',
    v_transaction_ref,
    jsonb_build_object(
      'transaction_ref', v_transaction_ref,
      'sender_id', p_sender_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_ref', v_transaction_ref,
    'sender_balance_after', v_sender_balance,
    'recipient_balance_after', v_recipient_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;