-- Phase 1: Currency Control Center Database Schema

-- =============================================
-- Table: bsk_supply_ledger
-- Purpose: Track all BSK minting, burning, and major supply changes
-- =============================================
CREATE TABLE IF NOT EXISTS public.bsk_supply_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('mint', 'burn', 'transfer', 'adjustment', 'release')),
  amount NUMERIC NOT NULL,
  total_supply_before NUMERIC NOT NULL,
  total_supply_after NUMERIC NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_bsk_supply_ledger_event_type ON public.bsk_supply_ledger(event_type);
CREATE INDEX idx_bsk_supply_ledger_created_at ON public.bsk_supply_ledger(created_at DESC);
CREATE INDEX idx_bsk_supply_ledger_performed_by ON public.bsk_supply_ledger(performed_by);

ALTER TABLE public.bsk_supply_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view BSK supply ledger"
  ON public.bsk_supply_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin can insert BSK supply ledger"
  ON public.bsk_supply_ledger FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =============================================
-- Table: user_inr_balances
-- Purpose: Track INR balances for each user
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_inr_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0 NOT NULL CHECK (balance >= 0),
  locked NUMERIC DEFAULT 0 NOT NULL CHECK (locked >= 0),
  total_deposited NUMERIC DEFAULT 0 NOT NULL,
  total_withdrawn NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_inr_balances_user_id ON public.user_inr_balances(user_id);
CREATE INDEX idx_user_inr_balances_balance ON public.user_inr_balances(balance DESC);

ALTER TABLE public.user_inr_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own INR balance"
  ON public.user_inr_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all INR balances"
  ON public.user_inr_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin can manage INR balances"
  ON public.user_inr_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_inr_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_inr_balances_updated_at
  BEFORE UPDATE ON public.user_inr_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inr_balance_updated_at();

-- =============================================
-- Table: bsk_rate_history
-- Purpose: Track historical BSK to INR exchange rates
-- =============================================
CREATE TABLE IF NOT EXISTS public.bsk_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_inr_per_bsk NUMERIC NOT NULL CHECK (rate_inr_per_bsk > 0),
  effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  effective_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_bsk_rate_history_effective_from ON public.bsk_rate_history(effective_from DESC);
CREATE INDEX idx_bsk_rate_history_status ON public.bsk_rate_history(status);

ALTER TABLE public.bsk_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage BSK rates"
  ON public.bsk_rate_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can view active BSK rates"
  ON public.bsk_rate_history FOR SELECT
  USING (status = 'active');

-- =============================================
-- Function: Get current BSK rate
-- =============================================
CREATE OR REPLACE FUNCTION public.get_current_bsk_rate()
RETURNS NUMERIC AS $$
DECLARE
  current_rate NUMERIC;
BEGIN
  SELECT rate_inr_per_bsk INTO current_rate
  FROM public.bsk_rate_history
  WHERE status = 'active'
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW())
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Fallback to team_referral_settings if no rate in history
  IF current_rate IS NULL THEN
    SELECT bsk_inr_rate INTO current_rate
    FROM public.team_referral_settings
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(current_rate, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Get total BSK in circulation
-- =============================================
CREATE OR REPLACE FUNCTION public.get_total_bsk_circulation()
RETURNS TABLE(
  total_withdrawable NUMERIC,
  total_holding NUMERIC,
  total_supply NUMERIC,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(withdrawable_balance), 0) as total_withdrawable,
    COALESCE(SUM(holding_balance), 0) as total_holding,
    COALESCE(SUM(withdrawable_balance + holding_balance), 0) as total_supply,
    COUNT(DISTINCT user_id) as user_count
  FROM public.user_bsk_balances
  WHERE withdrawable_balance > 0 OR holding_balance > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Get INR stats
-- =============================================
CREATE OR REPLACE FUNCTION public.get_inr_stats()
RETURNS TABLE(
  total_balance NUMERIC,
  total_locked NUMERIC,
  total_deposited NUMERIC,
  total_withdrawn NUMERIC,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(balance), 0) as total_balance,
    COALESCE(SUM(locked), 0) as total_locked,
    COALESCE(SUM(total_deposited), 0) as total_deposited,
    COALESCE(SUM(total_withdrawn), 0) as total_withdrawn,
    COUNT(DISTINCT user_id) as user_count
  FROM public.user_inr_balances
  WHERE balance > 0 OR locked > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;