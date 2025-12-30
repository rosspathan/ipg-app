-- ============================================================
-- CRITICAL SECURITY FIX: Crypto Transfer Security & Audit Trail
-- ============================================================

-- Step 1: Create crypto_internal_transfers table for full audit trail
CREATE TABLE IF NOT EXISTS public.crypto_internal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  sender_balance_before NUMERIC NOT NULL,
  sender_balance_after NUMERIC NOT NULL,
  recipient_balance_before NUMERIC NOT NULL,
  recipient_balance_after NUMERIC NOT NULL,
  transaction_ref TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create crypto_supply_ledger to track all crypto movements
CREATE TABLE IF NOT EXISTS public.crypto_supply_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  user_id UUID NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('credit', 'debit', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'admin_adjustment', 'genesis_import')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC,
  balance_after NUMERIC,
  source TEXT, -- 'internal_transfer', 'on_chain_deposit', 'trade', 'admin', etc.
  reference_id TEXT, -- transfer_id, deposit_id, etc.
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_crypto_internal_transfers_sender ON public.crypto_internal_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_crypto_internal_transfers_recipient ON public.crypto_internal_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_crypto_internal_transfers_created ON public.crypto_internal_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_supply_ledger_user_asset ON public.crypto_supply_ledger(user_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_crypto_supply_ledger_created ON public.crypto_supply_ledger(created_at DESC);

-- Step 4: Enable RLS on new tables
ALTER TABLE public.crypto_internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_supply_ledger ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS policies for crypto_internal_transfers
CREATE POLICY "users_see_own_transfers" ON public.crypto_internal_transfers
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "admins_see_all_transfers" ON public.crypto_internal_transfers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- No direct INSERT/UPDATE/DELETE - only through SECURITY DEFINER functions

-- Step 6: RLS policies for crypto_supply_ledger
CREATE POLICY "users_see_own_ledger" ON public.crypto_supply_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admins_see_all_ledger" ON public.crypto_supply_ledger
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: DROP dangerous wallet_balances policy
DROP POLICY IF EXISTS "System can manage balances" ON public.wallet_balances;

-- Step 8: Create strict RLS policies for wallet_balances
-- Users can only READ their own balance
DROP POLICY IF EXISTS "users_read_own_wallet_balance" ON public.wallet_balances;
CREATE POLICY "users_read_own_wallet_balance" ON public.wallet_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all balances
DROP POLICY IF EXISTS "admins_read_all_wallet_balances" ON public.wallet_balances;
CREATE POLICY "admins_read_all_wallet_balances" ON public.wallet_balances
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Step 9: Update execute_internal_crypto_transfer with ledger logging
CREATE OR REPLACE FUNCTION public.execute_internal_crypto_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_sender_balance_before NUMERIC;
  v_sender_balance_after NUMERIC;
  v_recipient_balance_before NUMERIC := 0;
  v_recipient_balance_after NUMERIC;
  v_net_amount NUMERIC;
  v_transfer_ref TEXT;
  v_transfer_id UUID;
BEGIN
  v_net_amount := p_amount - p_fee;
  v_transfer_ref := 'CTX' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(gen_random_uuid()::text, 1, 8);
  
  -- Get sender's current balance
  SELECT available INTO v_sender_balance_before
  FROM public.wallet_balances
  WHERE user_id = p_sender_id AND asset_id = p_asset_id
  FOR UPDATE;
  
  IF v_sender_balance_before IS NULL OR v_sender_balance_before < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient sender balance'
    );
  END IF;
  
  -- Get recipient's current balance (may not exist)
  SELECT available INTO v_recipient_balance_before
  FROM public.wallet_balances
  WHERE user_id = p_recipient_id AND asset_id = p_asset_id
  FOR UPDATE;
  
  v_recipient_balance_before := COALESCE(v_recipient_balance_before, 0);
  
  -- Deduct from sender
  UPDATE public.wallet_balances
  SET available = available - p_amount,
      updated_at = now()
  WHERE user_id = p_sender_id 
    AND asset_id = p_asset_id
    AND available >= p_amount
  RETURNING available INTO v_sender_balance_after;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Balance update failed - concurrent modification'
    );
  END IF;
  
  -- Credit recipient (upsert)
  INSERT INTO public.wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_recipient_id, p_asset_id, v_net_amount, 0)
  ON CONFLICT (user_id, asset_id) 
  DO UPDATE SET 
    available = wallet_balances.available + v_net_amount,
    updated_at = now()
  RETURNING available INTO v_recipient_balance_after;
  
  -- Log the transfer in crypto_internal_transfers
  INSERT INTO public.crypto_internal_transfers (
    sender_id, recipient_id, asset_id,
    amount, fee, net_amount,
    sender_balance_before, sender_balance_after,
    recipient_balance_before, recipient_balance_after,
    transaction_ref, status
  ) VALUES (
    p_sender_id, p_recipient_id, p_asset_id,
    p_amount, p_fee, v_net_amount,
    v_sender_balance_before, v_sender_balance_after,
    v_recipient_balance_before, v_recipient_balance_after,
    v_transfer_ref, 'completed'
  ) RETURNING id INTO v_transfer_id;
  
  -- Log sender debit in supply ledger
  INSERT INTO public.crypto_supply_ledger (
    asset_id, user_id, tx_type, amount,
    balance_before, balance_after,
    source, reference_id
  ) VALUES (
    p_asset_id, p_sender_id, 'transfer_out', p_amount,
    v_sender_balance_before, v_sender_balance_after,
    'internal_transfer', v_transfer_id::text
  );
  
  -- Log recipient credit in supply ledger
  INSERT INTO public.crypto_supply_ledger (
    asset_id, user_id, tx_type, amount,
    balance_before, balance_after,
    source, reference_id
  ) VALUES (
    p_asset_id, p_recipient_id, 'transfer_in', v_net_amount,
    v_recipient_balance_before, v_recipient_balance_after,
    'internal_transfer', v_transfer_id::text
  );
  
  -- Log fee (if any) in supply ledger
  IF p_fee > 0 THEN
    INSERT INTO public.crypto_supply_ledger (
      asset_id, user_id, tx_type, amount,
      balance_before, balance_after,
      source, reference_id, notes
    ) VALUES (
      p_asset_id, p_sender_id, 'fee', p_fee,
      v_sender_balance_before, v_sender_balance_after,
      'internal_transfer_fee', v_transfer_id::text, 'Transfer fee'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transaction_ref', v_transfer_ref,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after,
    'net_amount', v_net_amount,
    'fee', p_fee
  );
END;
$$;

-- Step 10: Create function for admins to reconcile balances
CREATE OR REPLACE FUNCTION public.admin_get_crypto_balance_discrepancies()
RETURNS TABLE (
  user_id UUID,
  asset_id UUID,
  asset_symbol TEXT,
  wallet_balance NUMERIC,
  ledger_balance NUMERIC,
  discrepancy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    wb.user_id,
    wb.asset_id,
    a.symbol,
    wb.available AS wallet_balance,
    COALESCE(ledger.total, 0) AS ledger_balance,
    wb.available - COALESCE(ledger.total, 0) AS discrepancy
  FROM public.wallet_balances wb
  JOIN public.assets a ON a.id = wb.asset_id
  LEFT JOIN (
    SELECT 
      csl.user_id,
      csl.asset_id,
      SUM(CASE 
        WHEN csl.tx_type IN ('credit', 'deposit', 'transfer_in', 'genesis_import') THEN csl.amount
        WHEN csl.tx_type IN ('debit', 'withdrawal', 'transfer_out', 'fee') THEN -csl.amount
        ELSE 0
      END) AS total
    FROM public.crypto_supply_ledger csl
    GROUP BY csl.user_id, csl.asset_id
  ) ledger ON ledger.user_id = wb.user_id AND ledger.asset_id = wb.asset_id
  WHERE wb.available != COALESCE(ledger.total, 0)
  ORDER BY ABS(wb.available - COALESCE(ledger.total, 0)) DESC;
END;
$$;

-- Step 11: Create function to import existing balances as genesis entries
CREATE OR REPLACE FUNCTION public.admin_import_genesis_crypto_balances()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imported INTEGER := 0;
  v_balance RECORD;
BEGIN
  -- Only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  -- Import all existing balances that don't have ledger entries
  FOR v_balance IN
    SELECT wb.user_id, wb.asset_id, wb.available, a.symbol
    FROM public.wallet_balances wb
    JOIN public.assets a ON a.id = wb.asset_id
    WHERE wb.available > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.crypto_supply_ledger csl
        WHERE csl.user_id = wb.user_id 
          AND csl.asset_id = wb.asset_id
      )
  LOOP
    INSERT INTO public.crypto_supply_ledger (
      asset_id, user_id, tx_type, amount,
      balance_before, balance_after,
      source, notes, created_by
    ) VALUES (
      v_balance.asset_id, v_balance.user_id, 'genesis_import', v_balance.available,
      0, v_balance.available,
      'genesis_import', 'Initial balance import from existing wallet_balances',
      auth.uid()
    );
    
    v_imported := v_imported + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'imported_count', v_imported,
    'message', format('Imported %s genesis balance entries', v_imported)
  );
END;
$$;