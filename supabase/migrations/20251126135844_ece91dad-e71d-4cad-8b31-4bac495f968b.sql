-- Update execute_bsk_transfer to store complete user profile information
CREATE OR REPLACE FUNCTION public.execute_bsk_transfer(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance numeric;
  v_recipient_balance numeric;
  v_transaction_ref text;
  v_sender_profile RECORD;
  v_recipient_profile RECORD;
BEGIN
  -- Validate inputs
  IF p_sender_id IS NULL OR p_recipient_id IS NULL OR p_amount IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  -- Generate unique transaction reference
  v_transaction_ref := 'TXN-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- Fetch sender profile
  SELECT 
    COALESCE(display_name, full_name, username, email) as display_name,
    email,
    username,
    full_name
  INTO v_sender_profile
  FROM profiles
  WHERE user_id = p_sender_id;

  -- Fetch recipient profile
  SELECT 
    COALESCE(display_name, full_name, username, email) as display_name,
    email,
    username,
    full_name
  INTO v_recipient_profile
  FROM profiles
  WHERE user_id = p_recipient_id;

  -- Lock sender's balance row and check sufficient balance
  SELECT withdrawable_balance INTO v_sender_balance
  FROM user_bsk_balances
  WHERE user_id = p_sender_id
  FOR UPDATE;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from sender
  UPDATE user_bsk_balances
  SET withdrawable_balance = withdrawable_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Add to recipient
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance)
  VALUES (p_recipient_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + p_amount,
    updated_at = now();

  -- Get updated balances
  SELECT withdrawable_balance INTO v_sender_balance
  FROM user_bsk_balances
  WHERE user_id = p_sender_id;

  SELECT withdrawable_balance INTO v_recipient_balance
  FROM user_bsk_balances
  WHERE user_id = p_recipient_id;

  -- Record transaction for sender (outgoing)
  INSERT INTO unified_bsk_ledger (
    user_id,
    tx_type,
    tx_subtype,
    amount_bsk,
    balance_type,
    idempotency_key,
    meta_json
  ) VALUES (
    p_sender_id,
    'debit',
    'transfer_out',
    p_amount,
    'withdrawable',
    v_transaction_ref || '-OUT',
    jsonb_build_object(
      'to_user_id', p_recipient_id,
      'recipient_name', v_recipient_profile.display_name,
      'recipient_email', v_recipient_profile.email,
      'recipient_username', v_recipient_profile.username,
      'transaction_ref', v_transaction_ref,
      'balance_after', v_sender_balance
    )
  );

  -- Record transaction for recipient (incoming)
  INSERT INTO unified_bsk_ledger (
    user_id,
    tx_type,
    tx_subtype,
    amount_bsk,
    balance_type,
    idempotency_key,
    meta_json
  ) VALUES (
    p_recipient_id,
    'credit',
    'transfer_in',
    p_amount,
    'withdrawable',
    v_transaction_ref || '-IN',
    jsonb_build_object(
      'from_user_id', p_sender_id,
      'sender_name', v_sender_profile.display_name,
      'sender_email', v_sender_profile.email,
      'sender_username', v_sender_profile.username,
      'transaction_ref', v_transaction_ref,
      'balance_after', v_recipient_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_ref', v_transaction_ref,
    'sender_balance_after', v_sender_balance,
    'recipient_balance_after', v_recipient_balance
  );
END;
$$;