-- =========================================================
-- Phase 2A: config additions
-- =========================================================
ALTER TABLE public.scratch_card_config
  ADD COLUMN IF NOT EXISTS bsk_token_contract text,
  ADD COLUMN IF NOT EXISTS bsk_token_decimals integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS scratch_wallet_address text;

-- =========================================================
-- Internal: create claim batch (core logic, service-role only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_create_claim_batch_internal(p_user_id uuid, p_card_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
  v_wallet text;
  v_kyc_ok boolean := true;
  v_total numeric := 0;
  v_count integer := 0;
  v_batch_id uuid;
  v_card public.scratch_cards%ROWTYPE;
  v_cid uuid;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_card_ids IS NULL OR array_length(p_card_ids,1) IS NULL THEN RAISE EXCEPTION 'NO_CARDS_SELECTED'; END IF;

  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;

  IF v_cfg.require_kyc THEN
    SELECT EXISTS(SELECT 1 FROM public.kyc_profiles_new WHERE user_id = p_user_id AND status = 'approved')
      INTO v_kyc_ok;
    IF NOT v_kyc_ok THEN RAISE EXCEPTION 'KYC_REQUIRED'; END IF;
  END IF;

  SELECT wallet_address INTO v_wallet FROM public.profiles WHERE user_id = p_user_id;
  IF v_wallet IS NULL OR length(v_wallet) = 0 THEN RAISE EXCEPTION 'WALLET_ADDRESS_MISSING'; END IF;
  IF v_wallet !~ '^0x[a-fA-F0-9]{40}$' THEN RAISE EXCEPTION 'WALLET_ADDRESS_INVALID'; END IF;

  INSERT INTO public.scratch_card_claim_batches(user_id, total_amount_bsk, to_address, status)
  VALUES (p_user_id, 0, v_wallet, 'building')
  RETURNING id INTO v_batch_id;

  FOREACH v_cid IN ARRAY p_card_ids LOOP
    SELECT * INTO v_card FROM public.scratch_cards WHERE id = v_cid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND: %', v_cid; END IF;
    IF v_card.user_id <> p_user_id THEN RAISE EXCEPTION 'NOT_CARD_OWNER: %', v_cid; END IF;
    IF v_card.status <> 'claimable' THEN RAISE EXCEPTION 'CARD_NOT_CLAIMABLE: %', v_cid; END IF;

    UPDATE public.scratch_cards SET status = 'claiming' WHERE id = v_cid;
    UPDATE public.scratch_card_payouts SET status = 'claiming', batch_id = v_batch_id WHERE card_id = v_cid;

    v_total := v_total + COALESCE(v_card.reward_amount_bsk, 0);
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.scratch_card_claim_batches SET total_amount_bsk = v_total WHERE id = v_batch_id;

  INSERT INTO public.scratch_card_audit_log(event_type, actor, user_id, batch_id, amount_bsk, detail)
  VALUES ('claim_batch_created', p_user_id, p_user_id, v_batch_id, v_total, jsonb_build_object('card_count', v_count));

  RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id,
    'total_amount_bsk', v_total, 'card_count', v_count, 'to_address', v_wallet);
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_create_claim_batch_internal(uuid, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_create_claim_batch_internal(uuid, uuid[]) TO service_role;

-- =========================================================
-- Public wrapper: create claim batch as signed-in user
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_card_create_claim_batch(p_card_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.scratch_create_claim_batch_internal(auth.uid(), p_card_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_card_create_claim_batch(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_card_create_claim_batch(uuid[]) TO authenticated, service_role;

-- =========================================================
-- Mark broadcasting: persist tx_hash + ONE pending onchain row
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_card_mark_broadcasting(
  p_batch_id uuid, p_tx_hash text, p_nonce integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_batch public.scratch_card_claim_batches%ROWTYPE;
  v_cfg public.scratch_card_config%ROWTYPE;
  v_amount_raw text;
BEGIN
  SELECT * INTO v_batch FROM public.scratch_card_claim_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BATCH_NOT_FOUND'; END IF;

  -- Idempotency: never re-sign/re-broadcast a batch that already has a hash
  IF v_batch.tx_hash IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_hash', v_batch.tx_hash);
  END IF;
  IF v_batch.status <> 'building' THEN RAISE EXCEPTION 'BATCH_NOT_BUILDABLE'; END IF;

  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;
  IF v_cfg.bsk_token_contract IS NULL THEN RAISE EXCEPTION 'BSK_CONTRACT_NOT_CONFIGURED'; END IF;

  v_amount_raw := trunc(v_batch.total_amount_bsk * power(10::numeric, v_cfg.bsk_token_decimals))::text;

  UPDATE public.scratch_card_claim_batches
    SET tx_hash = p_tx_hash, nonce = p_nonce, status = 'broadcasting', attempts = attempts + 1
    WHERE id = p_batch_id;

  -- Option B: scratch system owns the row FIRST (direction matches scanner's incoming convention 'RECEIVE')
  IF NOT EXISTS (
    SELECT 1 FROM public.onchain_transactions
    WHERE tx_hash = p_tx_hash AND user_id = v_batch.user_id AND direction = 'RECEIVE'
  ) THEN
    INSERT INTO public.onchain_transactions(
      user_id, wallet_address, chain_id, token_contract, token_symbol, token_decimals,
      direction, counterparty_address, amount_raw, amount_formatted, status,
      confirmations, required_confirmations, tx_hash, source
    ) VALUES (
      v_batch.user_id, v_batch.to_address, 56, v_cfg.bsk_token_contract, 'BSK', v_cfg.bsk_token_decimals,
      'RECEIVE', COALESCE(v_cfg.scratch_wallet_address, '0x0000000000000000000000000000000000000000'),
      v_amount_raw, v_batch.total_amount_bsk, 'PENDING',
      0, v_cfg.min_confirmations, p_tx_hash, 'scratch_card_reward'
    );
  END IF;

  INSERT INTO public.scratch_card_audit_log(event_type, user_id, batch_id, amount_bsk, detail)
  VALUES ('claim_broadcasting', v_batch.user_id, p_batch_id, v_batch.total_amount_bsk,
          jsonb_build_object('tx_hash', p_tx_hash, 'nonce', p_nonce));

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'tx_hash', p_tx_hash);
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_card_mark_broadcasting(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_card_mark_broadcasting(uuid, text, integer) TO service_role;

-- =========================================================
-- Confirm batch: reserved -> distributed, cards claimed
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_card_confirm_batch(
  p_batch_id uuid, p_log_index integer DEFAULT 0, p_block_number bigint DEFAULT NULL, p_confirmations integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_batch public.scratch_card_claim_batches%ROWTYPE;
  v_tre public.scratch_card_treasury_balances%ROWTYPE;
BEGIN
  SELECT * INTO v_batch FROM public.scratch_card_claim_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BATCH_NOT_FOUND'; END IF;
  IF v_batch.status = 'confirmed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;
  IF v_batch.status <> 'broadcasting' THEN RAISE EXCEPTION 'BATCH_NOT_BROADCASTING'; END IF;

  SELECT * INTO v_tre FROM public.scratch_card_treasury_balances ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_tre.claimable_reserved_bsk < v_batch.total_amount_bsk THEN RAISE EXCEPTION 'RESERVE_UNDERFLOW'; END IF;

  UPDATE public.scratch_card_treasury_balances SET
    claimable_reserved_bsk = claimable_reserved_bsk - v_batch.total_amount_bsk,
    distributed_bsk = distributed_bsk + v_batch.total_amount_bsk
  WHERE id = v_tre.id RETURNING * INTO v_tre;

  UPDATE public.scratch_cards SET status = 'claimed', claimed_at = now()
    WHERE id IN (SELECT card_id FROM public.scratch_card_payouts WHERE batch_id = p_batch_id);
  UPDATE public.scratch_card_payouts SET status = 'claimed' WHERE batch_id = p_batch_id;

  UPDATE public.onchain_transactions SET
    status = 'CONFIRMED', log_index = p_log_index,
    confirmations = COALESCE(p_confirmations, required_confirmations),
    block_number = p_block_number, confirmed_at = now()
  WHERE tx_hash = v_batch.tx_hash AND user_id = v_batch.user_id
    AND direction = 'RECEIVE' AND source = 'scratch_card_reward';

  UPDATE public.scratch_card_claim_batches SET status = 'confirmed', confirmed_at = now() WHERE id = p_batch_id;

  INSERT INTO public.scratch_card_treasury_ledger(entry_type, amount_bsk, funded_after,
    available_after, claimable_reserved_after, distributed_after, unfunded_pending_after,
    reference_type, reference_id, notes)
  VALUES ('distribute', v_batch.total_amount_bsk, v_tre.funded_bsk, v_tre.available_bsk,
    v_tre.claimable_reserved_bsk, v_tre.distributed_bsk, v_tre.unfunded_pending_bsk,
    'claim_batch', p_batch_id, 'Confirmed claim');

  INSERT INTO public.scratch_card_audit_log(event_type, user_id, batch_id, amount_bsk, detail)
  VALUES ('claim_confirmed', v_batch.user_id, p_batch_id, v_batch.total_amount_bsk,
    jsonb_build_object('tx_hash', v_batch.tx_hash, 'log_index', p_log_index));

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'distributed', v_batch.total_amount_bsk);
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_card_confirm_batch(uuid, integer, bigint, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_card_confirm_batch(uuid, integer, bigint, integer) TO service_role;

-- =========================================================
-- Fail batch: cards back to claimable, reserve retained
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_card_fail_batch(p_batch_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_batch public.scratch_card_claim_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_batch FROM public.scratch_card_claim_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BATCH_NOT_FOUND'; END IF;
  IF v_batch.status NOT IN ('building','broadcasting') THEN RAISE EXCEPTION 'BATCH_NOT_FAILABLE'; END IF;

  UPDATE public.scratch_cards SET status = 'claimable'
    WHERE id IN (SELECT card_id FROM public.scratch_card_payouts WHERE batch_id = p_batch_id);
  UPDATE public.scratch_card_payouts SET status = 'claimable', batch_id = NULL WHERE batch_id = p_batch_id;

  UPDATE public.onchain_transactions SET status = 'FAILED', error_message = COALESCE(p_reason, 'claim failed')
  WHERE tx_hash = v_batch.tx_hash AND user_id = v_batch.user_id
    AND direction = 'RECEIVE' AND source = 'scratch_card_reward';

  UPDATE public.scratch_card_claim_batches SET status = 'failed', last_error = COALESCE(p_reason, 'claim failed')
  WHERE id = p_batch_id;

  INSERT INTO public.scratch_card_audit_log(event_type, user_id, batch_id, amount_bsk, detail)
  VALUES ('claim_failed', v_batch.user_id, p_batch_id, v_batch.total_amount_bsk,
    jsonb_build_object('reason', p_reason));

  -- treasury intentionally UNCHANGED (reserve retained)
  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'reverted_to', 'claimable');
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_card_fail_batch(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_card_fail_batch(uuid, text) TO service_role;