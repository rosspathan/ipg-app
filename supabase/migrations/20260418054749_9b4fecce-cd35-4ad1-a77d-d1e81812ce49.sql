-- Wallet signer audit log: records every withdrawal attempt with displayed vs signer address mismatch info
CREATE TABLE IF NOT EXISTS public.withdrawal_signer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  displayed_wallet_address text,
  signer_wallet_address text,
  addresses_match boolean NOT NULL DEFAULT false,
  asset_symbol text,
  network text,
  amount_requested numeric(38, 18),
  signer_live_balance numeric(38, 18),
  signer_bnb_balance numeric(38, 18),
  outcome text NOT NULL,                -- 'signer_mismatch' | 'insufficient_balance' | 'insufficient_gas' | 'broadcast_failed' | 'success' | 'aborted'
  error_reason text,
  tx_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawal_signer_audit_user_idx ON public.withdrawal_signer_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_signer_audit_outcome_idx ON public.withdrawal_signer_audit (outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_signer_audit_match_idx ON public.withdrawal_signer_audit (addresses_match, created_at DESC);

ALTER TABLE public.withdrawal_signer_audit ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit rows
DROP POLICY IF EXISTS "Users read own signer audit" ON public.withdrawal_signer_audit;
CREATE POLICY "Users read own signer audit"
  ON public.withdrawal_signer_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own audit rows (the client logs from the withdraw screen)
DROP POLICY IF EXISTS "Users insert own signer audit" ON public.withdrawal_signer_audit;
CREATE POLICY "Users insert own signer audit"
  ON public.withdrawal_signer_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read everything for diagnostic reports
DROP POLICY IF EXISTS "Admins read all signer audit" ON public.withdrawal_signer_audit;
CREATE POLICY "Admins read all signer audit"
  ON public.withdrawal_signer_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));