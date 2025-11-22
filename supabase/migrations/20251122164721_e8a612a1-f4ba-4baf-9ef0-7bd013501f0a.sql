-- Phase 1: Fix execute_bsk_transfer function
CREATE OR REPLACE FUNCTION public.execute_bsk_transfer(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_ref text;
  v_recipient_profile record;
  v_sender_profile record;
BEGIN
  v_transaction_ref := 'TXN-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);

  SELECT display_name, email INTO v_sender_profile FROM profiles WHERE user_id = p_sender_id;
  SELECT display_name, email INTO v_recipient_profile FROM profiles WHERE user_id = p_recipient_id;

  INSERT INTO public.unified_bsk_ledger (user_id, idempotency_key, tx_type, tx_subtype, balance_type, amount_bsk, related_user_id, meta_json, created_at)
  VALUES (
    p_sender_id, v_transaction_ref || '_debit', 'debit', 'transfer_out', 'withdrawable', p_amount, p_recipient_id,
    jsonb_build_object('transaction_ref', v_transaction_ref, 'recipient_id', p_recipient_id, 'recipient_name', COALESCE(v_recipient_profile.display_name, v_recipient_profile.email, 'Unknown')),
    NOW()
  );

  INSERT INTO public.unified_bsk_ledger (user_id, idempotency_key, tx_type, tx_subtype, balance_type, amount_bsk, related_user_id, meta_json, created_at)
  VALUES (
    p_recipient_id, v_transaction_ref || '_credit', 'credit', 'transfer_in', 'withdrawable', p_amount, p_sender_id,
    jsonb_build_object('transaction_ref', v_transaction_ref, 'sender_id', p_sender_id, 'sender_name', COALESCE(v_sender_profile.display_name, v_sender_profile.email, 'Unknown')),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'transaction_ref', v_transaction_ref, 'amount', p_amount, 'sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'timestamp', NOW());

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$;