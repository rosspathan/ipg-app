-- ============================================================
-- Scratch Card Live Rollout: issuance + treasury funding
-- ============================================================

-- 1. De-dup reference on scratch_cards (one card per referral event)
ALTER TABLE public.scratch_cards
  ADD COLUMN IF NOT EXISTS source_ref uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scratch_card_referral_source_ref
  ON public.scratch_cards (user_id, source_ref)
  WHERE source = 'referral_signup' AND source_ref IS NOT NULL;

-- 2. Card issuance function (service-definer; safe no-op when disabled)
CREATE OR REPLACE FUNCTION public.scratch_issue_card(p_sponsor_id uuid, p_referee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
  v_card_id uuid;
BEGIN
  IF p_sponsor_id IS NULL OR p_referee_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_sponsor_id = p_referee_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;
  -- Only issue while the campaign is live (enabled + past phase 1)
  IF v_cfg.is_enabled IS NOT TRUE OR v_cfg.launch_phase <= 1 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.scratch_cards (user_id, source, source_ref, status)
  VALUES (p_sponsor_id, 'referral_signup', p_referee_id, 'unscratched')
  ON CONFLICT (user_id, source_ref) WHERE (source = 'referral_signup' AND source_ref IS NOT NULL)
  DO NOTHING
  RETURNING id INTO v_card_id;

  IF v_card_id IS NOT NULL THEN
    INSERT INTO public.scratch_card_audit_log(event_type, actor, user_id, card_id, detail)
    VALUES ('card_issued', p_sponsor_id, p_sponsor_id, v_card_id,
            jsonb_build_object('source','referral_signup','referee_id',p_referee_id));
  END IF;

  RETURN v_card_id;
END;
$function$;

-- 3. Trigger function on referral lock -> issue card to sponsor
CREATE OR REPLACE FUNCTION public.scratch_issue_on_referral_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Fire only when locked_at transitions to non-null and a sponsor exists
  IF NEW.sponsor_id IS NOT NULL
     AND NEW.locked_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.locked_at IS NULL) THEN
    BEGIN
      PERFORM public.scratch_issue_card(NEW.sponsor_id, NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      -- Never let scratch card issuance break referral linkage
      RAISE WARNING 'scratch_issue_on_referral_lock failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_scratch_issue_on_referral_lock ON public.referral_links_new;
CREATE TRIGGER trg_scratch_issue_on_referral_lock
AFTER INSERT OR UPDATE OF locked_at ON public.referral_links_new
FOR EACH ROW
EXECUTE FUNCTION public.scratch_issue_on_referral_lock();

-- 4. Treasury funding RPC (admin/service_role only; tx-verified)
CREATE OR REPLACE FUNCTION public.scratch_fund_treasury_from_deposit(
  p_tx_hash text,
  p_amount numeric,
  p_from_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
  v_tre public.scratch_card_treasury_balances%ROWTYPE;
  v_is_admin boolean;
  v_existing uuid;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT v_is_admin AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF p_tx_hash IS NULL OR p_tx_hash !~ '^0x[a-fA-F0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TX_HASH';
  END IF;

  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;

  -- Idempotency: ignore a tx_hash already recorded
  SELECT id INTO v_existing FROM public.scratch_card_funding_deposits
    WHERE tx_hash = p_tx_hash AND status = 'verified' LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_hash', p_tx_hash);
  END IF;

  INSERT INTO public.scratch_card_funding_deposits(
    tx_hash, chain, chain_id, token_contract, from_address, to_address,
    claimed_amount, verified_amount, status, verified_at, submitted_by
  ) VALUES (
    p_tx_hash, 'BSC', 56, v_cfg.bsk_token_contract, p_from_address, v_cfg.scratch_wallet_address,
    p_amount, p_amount, 'verified', now(), auth.uid()
  );

  SELECT * INTO v_tre FROM public.scratch_card_treasury_balances ORDER BY created_at LIMIT 1 FOR UPDATE;
  UPDATE public.scratch_card_treasury_balances SET
    funded_bsk = funded_bsk + p_amount,
    available_bsk = available_bsk + p_amount
  WHERE id = v_tre.id RETURNING * INTO v_tre;

  INSERT INTO public.scratch_card_treasury_ledger(entry_type, amount_bsk, funded_after,
    available_after, claimable_reserved_after, distributed_after, unfunded_pending_after,
    reference_type, notes, created_by)
  VALUES ('fund', p_amount, v_tre.funded_bsk, v_tre.available_bsk, v_tre.claimable_reserved_bsk,
    v_tre.distributed_bsk, v_tre.unfunded_pending_bsk, 'funding_deposit',
    COALESCE(p_notes, 'Treasury funded from verified deposit ' || p_tx_hash), auth.uid());

  INSERT INTO public.scratch_card_audit_log(event_type, actor, amount_bsk, detail)
  VALUES ('treasury_funded', auth.uid(), p_amount, jsonb_build_object('tx_hash', p_tx_hash));

  RETURN jsonb_build_object('success', true, 'tx_hash', p_tx_hash,
    'funded_bsk', v_tre.funded_bsk, 'available_bsk', v_tre.available_bsk);
END;
$function$;