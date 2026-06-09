CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Shared updated_at trigger for scratch card tables
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1) scratch_card_config (singleton, launch-locked)
-- =========================================================
CREATE TABLE public.scratch_card_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  campaign_start_at timestamptz,
  campaign_end_at timestamptz,
  launch_phase integer NOT NULL DEFAULT 1,
  min_reward_bsk numeric NOT NULL DEFAULT 1,
  max_reward_bsk numeric NOT NULL DEFAULT 5,
  reward_decimals integer NOT NULL DEFAULT 8,
  require_kyc boolean NOT NULL DEFAULT true,
  min_confirmations integer NOT NULL DEFAULT 15,
  bnb_gas_floor numeric NOT NULL DEFAULT 0.005,
  max_claim_attempts integer NOT NULL DEFAULT 5,
  singleton boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_card_config_singleton_uniq UNIQUE (singleton),
  CONSTRAINT scratch_card_config_reward_range CHECK (max_reward_bsk >= min_reward_bsk AND min_reward_bsk >= 0)
);
GRANT SELECT ON public.scratch_card_config TO authenticated;
GRANT ALL ON public.scratch_card_config TO service_role;
ALTER TABLE public.scratch_card_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config readable by authenticated"
  ON public.scratch_card_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config admin manage"
  ON public.scratch_card_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Phase-1 launch lock: cannot enable or set start while launch_phase = 1
CREATE OR REPLACE FUNCTION public.enforce_scratch_config_phase_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.launch_phase = 1 AND (NEW.is_enabled = true OR NEW.campaign_start_at IS NOT NULL) THEN
    RAISE EXCEPTION 'SCRATCH_LAUNCH_LOCKED_IN_PHASE_1';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_scratch_config_phase_lock
  BEFORE INSERT OR UPDATE ON public.scratch_card_config
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scratch_config_phase_lock();
CREATE TRIGGER trg_scratch_config_updated_at
  BEFORE UPDATE ON public.scratch_card_config
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 2) scratch_card_treasury_balances (singleton, zero, invariant)
-- =========================================================
CREATE TABLE public.scratch_card_treasury_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funded_bsk numeric NOT NULL DEFAULT 0,
  available_bsk numeric NOT NULL DEFAULT 0,
  claimable_reserved_bsk numeric NOT NULL DEFAULT 0,
  distributed_bsk numeric NOT NULL DEFAULT 0,
  unfunded_pending_bsk numeric NOT NULL DEFAULT 0,
  last_onchain_bsk_snapshot numeric,
  last_solvency_status text,
  last_solvency_checked_at timestamptz,
  singleton boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_treasury_singleton_uniq UNIQUE (singleton)
);
GRANT SELECT ON public.scratch_card_treasury_balances TO authenticated;
GRANT ALL ON public.scratch_card_treasury_balances TO service_role;
ALTER TABLE public.scratch_card_treasury_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury admin read"
  ON public.scratch_card_treasury_balances FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.enforce_scratch_treasury_invariant()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.funded_bsk < 0 OR NEW.available_bsk < 0 OR NEW.claimable_reserved_bsk < 0
     OR NEW.distributed_bsk < 0 OR NEW.unfunded_pending_bsk < 0 THEN
    RAISE EXCEPTION 'SCRATCH_TREASURY_NEGATIVE_BALANCE';
  END IF;
  IF abs(NEW.funded_bsk - (NEW.available_bsk + NEW.claimable_reserved_bsk + NEW.distributed_bsk)) > 0.00000001 THEN
    RAISE EXCEPTION 'SCRATCH_TREASURY_INVARIANT_VIOLATION: funded(%) <> available(%) + claimable_reserved(%) + distributed(%)',
      NEW.funded_bsk, NEW.available_bsk, NEW.claimable_reserved_bsk, NEW.distributed_bsk;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_scratch_treasury_invariant
  BEFORE INSERT OR UPDATE ON public.scratch_card_treasury_balances
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scratch_treasury_invariant();
CREATE TRIGGER trg_scratch_treasury_updated_at
  BEFORE UPDATE ON public.scratch_card_treasury_balances
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 3) scratch_card_treasury_ledger
-- =========================================================
CREATE TABLE public.scratch_card_treasury_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL,
  source_type text,
  amount_bsk numeric NOT NULL,
  funded_after numeric,
  available_after numeric,
  claimable_reserved_after numeric,
  distributed_after numeric,
  unfunded_pending_after numeric,
  reference_type text,
  reference_id uuid,
  source_deposit_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scratch_card_treasury_ledger TO authenticated;
GRANT ALL ON public.scratch_card_treasury_ledger TO service_role;
ALTER TABLE public.scratch_card_treasury_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury ledger admin read"
  ON public.scratch_card_treasury_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 4) scratch_card_funding_deposits (only source of funded_bsk)
-- =========================================================
CREATE TABLE public.scratch_card_funding_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  chain text NOT NULL DEFAULT 'BSC',
  chain_id integer NOT NULL DEFAULT 56,
  token_contract text NOT NULL,
  from_address text,
  to_address text NOT NULL,
  claimed_amount numeric,
  verified_amount numeric,
  confirmations integer NOT NULL DEFAULT 0,
  required_confirmations integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  rejection_reason text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_funding_tx_hash_uniq UNIQUE (tx_hash),
  CONSTRAINT scratch_funding_status_chk CHECK (status IN ('pending','verified','rejected','consumed'))
);
GRANT SELECT ON public.scratch_card_funding_deposits TO authenticated;
GRANT ALL ON public.scratch_card_funding_deposits TO service_role;
ALTER TABLE public.scratch_card_funding_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funding deposits admin manage"
  ON public.scratch_card_funding_deposits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scratch_funding_updated_at
  BEFORE UPDATE ON public.scratch_card_funding_deposits
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 5) scratch_cards
-- =========================================================
CREATE TABLE public.scratch_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'referral_signup',
  status text NOT NULL DEFAULT 'unscratched',
  reward_amount_bsk numeric,
  revealed_at timestamptz,
  claimed_at timestamptz,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_cards_status_chk CHECK (status IN ('unscratched','claimable','treasury_pending','claiming','claimed','voided'))
);
CREATE INDEX idx_scratch_cards_user_status ON public.scratch_cards(user_id, status);
GRANT SELECT ON public.scratch_cards TO authenticated;
GRANT ALL ON public.scratch_cards TO service_role;
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scratch cards owner read"
  ON public.scratch_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scratch_cards_updated_at
  BEFORE UPDATE ON public.scratch_cards
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 6) scratch_card_claim_batches
-- =========================================================
CREATE TABLE public.scratch_card_claim_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_amount_bsk numeric NOT NULL,
  to_address text,
  tx_hash text,
  nonce integer,
  status text NOT NULL DEFAULT 'building',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_batch_status_chk CHECK (status IN ('building','broadcasting','confirmed','failed'))
);
CREATE UNIQUE INDEX idx_scratch_batch_tx_hash ON public.scratch_card_claim_batches(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_scratch_batch_user_status ON public.scratch_card_claim_batches(user_id, status);
GRANT SELECT ON public.scratch_card_claim_batches TO authenticated;
GRANT ALL ON public.scratch_card_claim_batches TO service_role;
ALTER TABLE public.scratch_card_claim_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim batches owner read"
  ON public.scratch_card_claim_batches FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scratch_batch_updated_at
  BEFORE UPDATE ON public.scratch_card_claim_batches
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 7) scratch_card_payouts (one per card)
-- =========================================================
CREATE TABLE public.scratch_card_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.scratch_cards(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.scratch_card_claim_batches(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  amount_bsk numeric NOT NULL,
  status text NOT NULL DEFAULT 'claimable',
  onchain_tx_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scratch_payout_card_uniq UNIQUE (card_id),
  CONSTRAINT scratch_payout_status_chk CHECK (status IN ('claimable','claiming','claimed','failed'))
);
CREATE INDEX idx_scratch_payout_user_status ON public.scratch_card_payouts(user_id, status);
CREATE INDEX idx_scratch_payout_batch ON public.scratch_card_payouts(batch_id);
GRANT SELECT ON public.scratch_card_payouts TO authenticated;
GRANT ALL ON public.scratch_card_payouts TO service_role;
ALTER TABLE public.scratch_card_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts owner read"
  ON public.scratch_card_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scratch_payout_updated_at
  BEFORE UPDATE ON public.scratch_card_payouts
  FOR EACH ROW EXECUTE FUNCTION public.scratch_set_updated_at();

-- =========================================================
-- 8) scratch_card_audit_log
-- =========================================================
CREATE TABLE public.scratch_card_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor uuid,
  user_id uuid,
  card_id uuid,
  batch_id uuid,
  amount_bsk numeric,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scratch_audit_created ON public.scratch_card_audit_log(created_at DESC);
GRANT SELECT ON public.scratch_card_audit_log TO authenticated;
GRANT ALL ON public.scratch_card_audit_log TO service_role;
ALTER TABLE public.scratch_card_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit log admin read"
  ON public.scratch_card_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- Seed singleton rows (config disabled, treasury zero)
-- =========================================================
INSERT INTO public.scratch_card_config (is_enabled, campaign_start_at, launch_phase)
VALUES (false, NULL, 1);
INSERT INTO public.scratch_card_treasury_balances
  (funded_bsk, available_bsk, claimable_reserved_bsk, distributed_bsk, unfunded_pending_bsk)
VALUES (0,0,0,0,0);

-- =========================================================
-- RPC: admin_update_scratch_card_config (cannot enable in Phase 1)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_update_scratch_card_config(
  p_is_enabled boolean DEFAULT NULL,
  p_campaign_start_at timestamptz DEFAULT NULL,
  p_campaign_end_at timestamptz DEFAULT NULL,
  p_min_reward_bsk numeric DEFAULT NULL,
  p_max_reward_bsk numeric DEFAULT NULL,
  p_require_kyc boolean DEFAULT NULL,
  p_min_confirmations integer DEFAULT NULL,
  p_bnb_gas_floor numeric DEFAULT NULL,
  p_max_claim_attempts integer DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1 FOR UPDATE;

  -- Phase 1 hard lock: enabling the campaign is forbidden
  IF v_cfg.launch_phase = 1 AND (p_is_enabled = true OR p_campaign_start_at IS NOT NULL) THEN
    RAISE EXCEPTION 'SCRATCH_LAUNCH_LOCKED_IN_PHASE_1';
  END IF;

  UPDATE public.scratch_card_config SET
    is_enabled        = COALESCE(p_is_enabled, is_enabled),
    campaign_start_at = COALESCE(p_campaign_start_at, campaign_start_at),
    campaign_end_at   = COALESCE(p_campaign_end_at, campaign_end_at),
    min_reward_bsk    = COALESCE(p_min_reward_bsk, min_reward_bsk),
    max_reward_bsk    = COALESCE(p_max_reward_bsk, max_reward_bsk),
    require_kyc       = COALESCE(p_require_kyc, require_kyc),
    min_confirmations = COALESCE(p_min_confirmations, min_confirmations),
    bnb_gas_floor     = COALESCE(p_bnb_gas_floor, bnb_gas_floor),
    max_claim_attempts= COALESCE(p_max_claim_attempts, max_claim_attempts),
    notes             = COALESCE(p_notes, notes)
  WHERE id = v_cfg.id
  RETURNING * INTO v_cfg;

  INSERT INTO public.scratch_card_audit_log(event_type, actor, detail)
  VALUES ('config_update', auth.uid(), to_jsonb(v_cfg));

  RETURN jsonb_build_object('success', true, 'is_enabled', v_cfg.is_enabled,
    'campaign_start_at', v_cfg.campaign_start_at, 'launch_phase', v_cfg.launch_phase);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_scratch_card_config(boolean,timestamptz,timestamptz,numeric,numeric,boolean,integer,numeric,integer,text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_scratch_card_config(boolean,timestamptz,timestamptz,numeric,numeric,boolean,integer,numeric,integer,text) TO authenticated, service_role;

-- =========================================================
-- RPC: scratch_card_reveal (reserve logic; gated by campaign enabled)
-- =========================================================
CREATE OR REPLACE FUNCTION public.scratch_card_reveal(p_card_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
  v_card public.scratch_cards%ROWTYPE;
  v_tre public.scratch_card_treasury_balances%ROWTYPE;
  v_reward numeric;
  v_rand numeric;
  v_kyc_ok boolean := true;
BEGIN
  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;
  IF v_cfg.is_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'SCRATCH_CAMPAIGN_DISABLED';
  END IF;

  SELECT * INTO v_card FROM public.scratch_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND'; END IF;
  IF v_card.user_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_CARD_OWNER'; END IF;
  IF v_card.status <> 'unscratched' THEN RAISE EXCEPTION 'CARD_NOT_REVEALABLE'; END IF;

  IF v_cfg.require_kyc THEN
    SELECT EXISTS(
      SELECT 1 FROM public.kyc_profiles_new
      WHERE user_id = auth.uid() AND status = 'approved'
    ) INTO v_kyc_ok;
    IF NOT v_kyc_ok THEN RAISE EXCEPTION 'KYC_REQUIRED'; END IF;
  END IF;

  -- crypto-random reward in [min,max], rounded to reward_decimals
  v_rand := (('x'||encode(gen_random_bytes(7),'hex'))::bit(56)::bigint)::numeric / 72057594037927936.0;
  v_reward := round(v_cfg.min_reward_bsk + v_rand * (v_cfg.max_reward_bsk - v_cfg.min_reward_bsk), v_cfg.reward_decimals);

  SELECT * INTO v_tre FROM public.scratch_card_treasury_balances ORDER BY created_at LIMIT 1 FOR UPDATE;

  IF v_tre.available_bsk >= v_reward THEN
    -- Case A: reserve immediately
    UPDATE public.scratch_card_treasury_balances SET
      available_bsk = available_bsk - v_reward,
      claimable_reserved_bsk = claimable_reserved_bsk + v_reward
    WHERE id = v_tre.id RETURNING * INTO v_tre;

    UPDATE public.scratch_cards SET status='claimable', reward_amount_bsk=v_reward, revealed_at=now()
    WHERE id = v_card.id;

    INSERT INTO public.scratch_card_payouts(card_id, user_id, amount_bsk, status)
    VALUES (v_card.id, v_card.user_id, v_reward, 'claimable');

    INSERT INTO public.scratch_card_treasury_ledger(entry_type, amount_bsk, funded_after,
      available_after, claimable_reserved_after, distributed_after, unfunded_pending_after,
      reference_type, reference_id, notes, created_by)
    VALUES ('reserve', v_reward, v_tre.funded_bsk, v_tre.available_bsk, v_tre.claimable_reserved_bsk,
      v_tre.distributed_bsk, v_tre.unfunded_pending_bsk, 'scratch_card', v_card.id, 'Reserved on reveal', auth.uid());

    INSERT INTO public.scratch_card_audit_log(event_type, actor, user_id, card_id, amount_bsk, detail)
    VALUES ('reveal_reserved', auth.uid(), v_card.user_id, v_card.id, v_reward, jsonb_build_object('status','claimable'));

    RETURN jsonb_build_object('success', true, 'status','claimable', 'reward_bsk', v_reward);
  ELSE
    -- Case B: not backed -> treasury_pending
    UPDATE public.scratch_card_treasury_balances SET
      unfunded_pending_bsk = unfunded_pending_bsk + v_reward
    WHERE id = v_tre.id RETURNING * INTO v_tre;

    UPDATE public.scratch_cards SET status='treasury_pending', reward_amount_bsk=v_reward, revealed_at=now()
    WHERE id = v_card.id;

    INSERT INTO public.scratch_card_treasury_ledger(entry_type, amount_bsk, funded_after,
      available_after, claimable_reserved_after, distributed_after, unfunded_pending_after,
      reference_type, reference_id, notes, created_by)
    VALUES ('unfunded_pending_add', v_reward, v_tre.funded_bsk, v_tre.available_bsk, v_tre.claimable_reserved_bsk,
      v_tre.distributed_bsk, v_tre.unfunded_pending_bsk, 'scratch_card', v_card.id, 'Revealed without reserve', auth.uid());

    INSERT INTO public.scratch_card_audit_log(event_type, actor, user_id, card_id, amount_bsk, detail)
    VALUES ('reveal_treasury_pending', auth.uid(), v_card.user_id, v_card.id, v_reward, jsonb_build_object('status','treasury_pending'));

    RETURN jsonb_build_object('success', true, 'status','treasury_pending', 'reward_bsk', v_reward);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.scratch_card_reveal(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.scratch_card_reveal(uuid) TO authenticated, service_role;

-- =========================================================
-- RPC: admin_scratch_card_overview (read-only dashboard summary)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_scratch_card_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.scratch_card_config%ROWTYPE;
  v_tre public.scratch_card_treasury_balances%ROWTYPE;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  SELECT * INTO v_cfg FROM public.scratch_card_config ORDER BY created_at LIMIT 1;
  SELECT * INTO v_tre FROM public.scratch_card_treasury_balances ORDER BY created_at LIMIT 1;

  SELECT jsonb_build_object(
    'config', to_jsonb(v_cfg),
    'treasury', to_jsonb(v_tre),
    'cards', jsonb_build_object(
      'total', (SELECT count(*) FROM public.scratch_cards),
      'claimable', (SELECT count(*) FROM public.scratch_cards WHERE status='claimable'),
      'treasury_pending', (SELECT count(*) FROM public.scratch_cards WHERE status='treasury_pending'),
      'claimed', (SELECT count(*) FROM public.scratch_cards WHERE status='claimed')
    ),
    'funding_deposits', jsonb_build_object(
      'total', (SELECT count(*) FROM public.scratch_card_funding_deposits),
      'verified', (SELECT count(*) FROM public.scratch_card_funding_deposits WHERE status='verified')
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_scratch_card_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_scratch_card_overview() TO authenticated, service_role;