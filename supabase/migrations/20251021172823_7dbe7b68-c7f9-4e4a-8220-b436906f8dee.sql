-- Create atomic BSK transfer function
CREATE OR REPLACE FUNCTION public.execute_bsk_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_recipient_balance NUMERIC;
  v_sender_balance_after NUMERIC;
  v_recipient_balance_after NUMERIC;
  v_transaction_ref TEXT;
BEGIN
  -- Lock rows for update to prevent race conditions
  SELECT withdrawable_balance INTO v_sender_balance
  FROM public.user_bsk_balances
  WHERE user_id = p_sender_id
  FOR UPDATE;
  
  -- Check if sender has record
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sender balance not found'
    );
  END IF;
  
  -- Check sufficient balance
  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;
  
  -- Get recipient balance (create if doesn't exist)
  SELECT withdrawable_balance INTO v_recipient_balance
  FROM public.user_bsk_balances
  WHERE user_id = p_recipient_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create recipient balance
    INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, holding_balance)
    VALUES (p_recipient_id, 0, 0);
    v_recipient_balance := 0;
  END IF;
  
  -- Calculate new balances
  v_sender_balance_after := v_sender_balance - p_amount;
  v_recipient_balance_after := v_recipient_balance + p_amount;
  
  -- Update sender balance
  UPDATE public.user_bsk_balances
  SET withdrawable_balance = v_sender_balance_after,
      updated_at = now()
  WHERE user_id = p_sender_id;
  
  -- Update recipient balance
  UPDATE public.user_bsk_balances
  SET withdrawable_balance = v_recipient_balance_after,
      total_earned_withdrawable = total_earned_withdrawable + p_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;
  
  -- Generate transaction reference
  v_transaction_ref := 'TXN-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
  
  -- Record transfer
  INSERT INTO public.bsk_transfers (
    sender_id,
    recipient_id,
    amount_bsk,
    sender_balance_before,
    sender_balance_after,
    recipient_balance_before,
    recipient_balance_after,
    transaction_ref,
    status
  ) VALUES (
    p_sender_id,
    p_recipient_id,
    p_amount,
    v_sender_balance,
    v_sender_balance_after,
    v_recipient_balance,
    v_recipient_balance_after,
    v_transaction_ref,
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_ref', v_transaction_ref,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;