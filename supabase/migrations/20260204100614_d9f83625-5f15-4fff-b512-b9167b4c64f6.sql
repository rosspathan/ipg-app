-- Atomic, exactly-once custodial deposit crediting + scan state

-- 1) Scan state table to avoid missed deposits when the monitor is down
CREATE TABLE IF NOT EXISTS public.custodial_deposit_scan_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text NOT NULL DEFAULT 'BSC',
  hot_wallet_address text NOT NULL,
  last_scanned_block bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, hot_wallet_address)
);

ALTER TABLE public.custodial_deposit_scan_state ENABLE ROW LEVEL SECURITY;

-- Deny all direct access (service role bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='custodial_deposit_scan_state'
      AND policyname='Deny all access'
  ) THEN
    CREATE POLICY "Deny all access"
    ON public.custodial_deposit_scan_state
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- 2) Idempotency: ensure one ledger row per (reference_type, reference_id)
-- (reference_id can be NULL for some ledger entries, so we scope uniqueness to non-null)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_trading_balance_ledger_ref
ON public.trading_balance_ledger (reference_type, reference_id)
WHERE reference_id IS NOT NULL;

-- 3) Atomic credit function (single source of truth for balance + ledger + deposit status)
CREATE OR REPLACE FUNCTION public.credit_custodial_deposit(p_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep public.custodial_deposits%ROWTYPE;
  v_symbol text;
  v_balance public.wallet_balances%ROWTYPE;
  v_new_available numeric;
  v_new_locked numeric;
BEGIN
  -- Lock the deposit row to prevent double-credit under concurrency
  SELECT * INTO v_dep
  FROM public.custodial_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'deposit_not_found');
  END IF;

  IF v_dep.status = 'credited' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_credited');
  END IF;

  -- Resolve asset symbol for ledger readability
  SELECT symbol INTO v_symbol
  FROM public.assets
  WHERE id = v_dep.asset_id;

  IF v_symbol IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found');
  END IF;

  -- Lock (or create) the wallet balance row
  SELECT * INTO v_balance
  FROM public.wallet_balances
  WHERE user_id = v_dep.user_id
    AND asset_id = v_dep.asset_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.wallet_balances
    SET
      available = available + v_dep.amount,
      total = (available + v_dep.amount) + locked,
      updated_at = now()
    WHERE id = v_balance.id
    RETURNING available, locked INTO v_new_available, v_new_locked;
  ELSE
    INSERT INTO public.wallet_balances (
      user_id,
      asset_id,
      available,
      locked,
      total,
      created_at,
      updated_at
    ) VALUES (
      v_dep.user_id,
      v_dep.asset_id,
      v_dep.amount,
      0,
      v_dep.amount,
      now(),
      now()
    )
    RETURNING available, locked INTO v_new_available, v_new_locked;
  END IF;

  -- Ledger entry (idempotent via unique index)
  INSERT INTO public.trading_balance_ledger (
    user_id,
    asset_symbol,
    delta_available,
    delta_locked,
    balance_available_after,
    balance_locked_after,
    entry_type,
    reference_type,
    reference_id,
    notes,
    created_at
  ) VALUES (
    v_dep.user_id,
    v_symbol,
    v_dep.amount,
    0,
    v_new_available,
    v_new_locked,
    'DEPOSIT',
    'custodial_deposit',
    v_dep.id,
    'Auto-credited from on-chain deposit',
    now()
  ) ON CONFLICT (reference_type, reference_id) DO NOTHING;

  -- Mark deposit credited
  UPDATE public.custodial_deposits
  SET
    status = 'credited',
    credited_at = COALESCE(credited_at, now()),
    updated_at = now()
  WHERE id = v_dep.id;

  -- Best-effort: link to the oldest matching awaiting_deposit transfer
  WITH candidate AS (
    SELECT id
    FROM public.trading_balance_transfers
    WHERE user_id = v_dep.user_id
      AND asset_id = v_dep.asset_id
      AND status = 'awaiting_deposit'
      AND tx_hash IS NULL
      AND amount = v_dep.amount
    ORDER BY created_at ASC
    LIMIT 1
  )
  UPDATE public.trading_balance_transfers t
  SET
    status = 'completed',
    tx_hash = v_dep.tx_hash,
    from_address = v_dep.from_address,
    completed_at = now(),
    updated_at = now()
  FROM candidate
  WHERE t.id = candidate.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'credited',
    'user_id', v_dep.user_id,
    'asset_symbol', v_symbol,
    'amount', v_dep.amount,
    'balance_available_after', v_new_available,
    'balance_locked_after', v_new_locked
  );
END;
$$;