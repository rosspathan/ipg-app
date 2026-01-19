-- Create comprehensive on-chain transaction history table for BEP-20
-- This table stores both SEND and RECEIVE transactions for each user
CREATE TABLE IF NOT EXISTS public.onchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 56, -- BSC mainnet
  
  -- Token info
  token_contract TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  token_decimals INTEGER NOT NULL DEFAULT 18,
  token_logo_url TEXT,
  
  -- Transaction direction & counterparty
  direction TEXT NOT NULL CHECK (direction IN ('SEND', 'RECEIVE', 'SELF')),
  counterparty_address TEXT NOT NULL,
  
  -- Amounts
  amount_raw TEXT NOT NULL, -- Raw value from chain (as string to avoid overflow)
  amount_formatted NUMERIC(38, 18) NOT NULL, -- Converted using decimals
  
  -- Transaction status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'DROPPED')),
  confirmations INTEGER NOT NULL DEFAULT 0,
  required_confirmations INTEGER NOT NULL DEFAULT 12,
  
  -- Chain data
  block_number BIGINT,
  tx_hash TEXT NOT NULL,
  log_index INTEGER, -- For uniqueness with tx_hash
  gas_fee_wei TEXT, -- Gas in wei
  gas_fee_formatted NUMERIC(38, 18), -- Gas in native token
  nonce INTEGER,
  
  -- Metadata
  source TEXT NOT NULL DEFAULT 'ONCHAIN' CHECK (source IN ('ONCHAIN', 'INTERNAL', 'MANUAL')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  
  -- Unique constraint: one entry per tx_hash + log_index + user_id + direction
  CONSTRAINT unique_onchain_tx UNIQUE (tx_hash, log_index, user_id, direction)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_onchain_tx_user_id ON public.onchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_wallet ON public.onchain_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_hash ON public.onchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_status ON public.onchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_created ON public.onchain_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_token ON public.onchain_transactions(token_contract);
CREATE INDEX IF NOT EXISTS idx_onchain_tx_direction ON public.onchain_transactions(direction);

-- Enable RLS
ALTER TABLE public.onchain_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own onchain transactions"
  ON public.onchain_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow inserts from service role / edge functions only (no user direct insert)
CREATE POLICY "Service can insert onchain transactions"
  ON public.onchain_transactions
  FOR INSERT
  WITH CHECK (true);

-- Allow updates from service role / edge functions only
CREATE POLICY "Service can update onchain transactions"
  ON public.onchain_transactions
  FOR UPDATE
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_onchain_tx_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_onchain_tx ON public.onchain_transactions;
CREATE TRIGGER trigger_update_onchain_tx
  BEFORE UPDATE ON public.onchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onchain_tx_updated_at();

-- Enable realtime for instant UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.onchain_transactions;