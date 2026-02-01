
-- =====================================================================
-- BSK On-Chain Migration System
-- Tracks migration of internal BSK balances to on-chain BEP-20 tokens
-- =====================================================================

-- Migration batches (admin-initiated)
CREATE TABLE public.bsk_onchain_migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  initiated_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed', 'cancelled')),
  
  -- Aggregate stats
  total_users INTEGER NOT NULL DEFAULT 0,
  processed_users INTEGER NOT NULL DEFAULT 0,
  successful_users INTEGER NOT NULL DEFAULT 0,
  failed_users INTEGER NOT NULL DEFAULT 0,
  
  -- Amounts
  total_bsk_requested NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_bsk_migrated NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_gas_deducted_bsk NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_gas_spent_bnb NUMERIC(20, 8) NOT NULL DEFAULT 0,
  
  -- Config snapshot
  min_amount_bsk NUMERIC(20, 8) NOT NULL DEFAULT 100,
  gas_price_gwei NUMERIC(10, 2),
  bsk_per_gas_unit NUMERIC(20, 8),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Admin notes
  notes TEXT
);

-- Individual migration records (per user)
CREATE TABLE public.bsk_onchain_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.bsk_onchain_migration_batches(id),
  user_id UUID NOT NULL,
  
  -- Wallet info
  wallet_address TEXT NOT NULL,
  
  -- Amounts (all in BSK, 8 decimals precision)
  internal_balance_snapshot NUMERIC(20, 8) NOT NULL,
  amount_requested NUMERIC(20, 8) NOT NULL,
  gas_deduction_bsk NUMERIC(20, 8) NOT NULL DEFAULT 0,
  net_amount_migrated NUMERIC(20, 8) NOT NULL DEFAULT 0,
  
  -- Ledger reconciliation
  ledger_sum_at_snapshot NUMERIC(20, 8),
  balance_matches_ledger BOOLEAN DEFAULT true,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'validating',
    'debiting',
    'signing',
    'broadcasting',
    'confirming',
    'completed',
    'failed',
    'rolled_back'
  )),
  
  -- On-chain details
  tx_hash TEXT,
  block_number BIGINT,
  gas_used BIGINT,
  gas_price_gwei NUMERIC(10, 2),
  actual_gas_cost_bnb NUMERIC(20, 8),
  confirmations INTEGER DEFAULT 0,
  
  -- Idempotency
  idempotency_key TEXT NOT NULL UNIQUE,
  ledger_debit_tx_id TEXT,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  debited_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  broadcasted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  
  -- Audit
  admin_notes TEXT,
  
  UNIQUE(batch_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_bsk_onchain_migrations_batch_id ON public.bsk_onchain_migrations(batch_id);
CREATE INDEX idx_bsk_onchain_migrations_user_id ON public.bsk_onchain_migrations(user_id);
CREATE INDEX idx_bsk_onchain_migrations_status ON public.bsk_onchain_migrations(status);
CREATE INDEX idx_bsk_onchain_migrations_tx_hash ON public.bsk_onchain_migrations(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_bsk_onchain_migration_batches_status ON public.bsk_onchain_migration_batches(status);

-- Enable RLS (access controlled via service role in edge function)
ALTER TABLE public.bsk_onchain_migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_onchain_migrations ENABLE ROW LEVEL SECURITY;

-- Service role bypass (edge functions use service role key)
-- Users can view their own migration status only
CREATE POLICY "Users can view own migrations"
  ON public.bsk_onchain_migrations FOR SELECT
  USING (user_id = auth.uid());

-- Add migration settings to system_settings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'bsk_contract_address'
  ) THEN
    ALTER TABLE public.system_settings 
      ADD COLUMN bsk_contract_address TEXT DEFAULT '0x742575866C0eb1B6b6350159D536447477085ceF';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'bsk_migration_enabled'
  ) THEN
    ALTER TABLE public.system_settings 
      ADD COLUMN bsk_migration_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'bsk_migration_min_amount'
  ) THEN
    ALTER TABLE public.system_settings 
      ADD COLUMN bsk_migration_min_amount NUMERIC(20, 8) DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'bsk_migration_gas_multiplier'
  ) THEN
    ALTER TABLE public.system_settings 
      ADD COLUMN bsk_migration_gas_multiplier NUMERIC(5, 2) DEFAULT 1.2;
  END IF;
END $$;

COMMENT ON TABLE public.bsk_onchain_migration_batches IS 'Admin-initiated batch migrations of internal BSK to on-chain';
COMMENT ON TABLE public.bsk_onchain_migrations IS 'Individual user migration records with full audit trail';
