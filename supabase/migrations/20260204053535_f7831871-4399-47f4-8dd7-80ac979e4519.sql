-- =====================================================
-- BSK On-Chain Migration Settings Table
-- =====================================================

-- Create admin settings table for migration configuration
CREATE TABLE IF NOT EXISTS public.bsk_migration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Feature toggle
  migration_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Fee configuration
  migration_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  
  -- Gas fee model: 'fixed' or 'dynamic'
  gas_fee_model TEXT NOT NULL DEFAULT 'dynamic' CHECK (gas_fee_model IN ('fixed', 'dynamic')),
  fixed_gas_fee_bsk NUMERIC(18,8) NOT NULL DEFAULT 5.00000000,
  
  -- Limits
  min_amount_bsk NUMERIC(18,8) NOT NULL DEFAULT 100.00000000,
  max_amount_bsk NUMERIC(18,8) DEFAULT NULL,
  
  -- Confirmations required before marking complete
  required_confirmations INTEGER NOT NULL DEFAULT 3 CHECK (required_confirmations >= 1 AND required_confirmations <= 50),
  
  -- RPC configuration
  primary_rpc_url TEXT NOT NULL DEFAULT 'https://bsc-dataseed.binance.org',
  fallback_rpc_url TEXT DEFAULT 'https://bsc-dataseed1.binance.org',
  
  -- Decimals for precision (BSK uses 18 decimals)
  token_decimals INTEGER NOT NULL DEFAULT 18,
  
  -- Health check thresholds
  min_hot_wallet_bsk NUMERIC(18,8) NOT NULL DEFAULT 1000.00000000,
  min_gas_balance_bnb NUMERIC(18,8) NOT NULL DEFAULT 0.05,
  
  -- Daily limits
  daily_migration_limit_bsk NUMERIC(18,8) DEFAULT NULL,
  per_user_daily_limit_bsk NUMERIC(18,8) DEFAULT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bsk_migration_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write (using user_roles table with only 'admin' role)
CREATE POLICY "Admins can read migration settings"
  ON public.bsk_migration_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update migration settings"
  ON public.bsk_migration_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO public.bsk_migration_settings (
  migration_enabled,
  migration_fee_percent,
  gas_fee_model,
  fixed_gas_fee_bsk,
  min_amount_bsk,
  required_confirmations,
  min_hot_wallet_bsk,
  min_gas_balance_bnb
) VALUES (
  true,
  5.00,
  'dynamic',
  5.00000000,
  100.00000000,
  3,
  1000.00000000,
  0.05
) ON CONFLICT DO NOTHING;

-- =====================================================
-- Add refunded_at to migrations table if missing
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bsk_onchain_migrations' 
    AND column_name = 'refunded_at'
  ) THEN
    ALTER TABLE public.bsk_onchain_migrations ADD COLUMN refunded_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- Create migration health check function
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_migration_health_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
  wallet_record RECORD;
  result JSON;
BEGIN
  -- Get settings
  SELECT * INTO settings_record FROM public.bsk_migration_settings LIMIT 1;
  
  -- Get hot wallet
  SELECT * INTO wallet_record 
  FROM public.platform_hot_wallet 
  WHERE label = 'Migration Hot Wallet' AND is_active = true 
  LIMIT 1;
  
  result := json_build_object(
    'migration_enabled', COALESCE(settings_record.migration_enabled, false),
    'wallet_configured', (wallet_record.address IS NOT NULL),
    'wallet_address', wallet_record.address,
    'migration_fee_percent', COALESCE(settings_record.migration_fee_percent, 5),
    'min_amount_bsk', COALESCE(settings_record.min_amount_bsk, 100),
    'required_confirmations', COALESCE(settings_record.required_confirmations, 3),
    'gas_fee_model', COALESCE(settings_record.gas_fee_model, 'dynamic'),
    'fixed_gas_fee_bsk', COALESCE(settings_record.fixed_gas_fee_bsk, 5)
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- Update trigger for settings
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_migration_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_migration_settings_timestamp ON public.bsk_migration_settings;
CREATE TRIGGER update_migration_settings_timestamp
  BEFORE UPDATE ON public.bsk_migration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_migration_settings_timestamp();