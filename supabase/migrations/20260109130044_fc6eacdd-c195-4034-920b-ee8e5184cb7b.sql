-- Trading Balances table (separate from wallet_balances)
-- Holds funds in platform hot wallet for exchange trading
CREATE TABLE public.trading_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  available NUMERIC NOT NULL DEFAULT 0 CHECK (available >= 0),
  locked NUMERIC NOT NULL DEFAULT 0 CHECK (locked >= 0),
  total NUMERIC GENERATED ALWAYS AS (available + locked) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.trading_balances ENABLE ROW LEVEL SECURITY;

-- Users can view their own trading balances
CREATE POLICY "Users can view own trading balances"
  ON public.trading_balances FOR SELECT
  USING (auth.uid() = user_id);

-- Trading balance transfers table (tracks wallet <-> trading transfers)
CREATE TABLE public.trading_balance_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('to_trading', 'from_trading')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tx_hash TEXT,
  from_address TEXT,
  to_address TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.trading_balance_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers
CREATE POLICY "Users can view own transfers"
  ON public.trading_balance_transfers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create transfers (validation in edge function)
CREATE POLICY "Users can create transfers"
  ON public.trading_balance_transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Platform hot wallet configuration
CREATE TABLE public.platform_hot_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_gas_balance NUMERIC NOT NULL DEFAULT 0.01,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chain, address)
);

-- Enable RLS (admin only via user_roles table)
ALTER TABLE public.platform_hot_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view hot wallet config"
  ON public.platform_hot_wallet FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at on trading_balances
CREATE TRIGGER update_trading_balances_updated_at
  BEFORE UPDATE ON public.trading_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on trading_balance_transfers
CREATE TRIGGER update_trading_balance_transfers_updated_at
  BEFORE UPDATE ON public.trading_balance_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_trading_balances_user_id ON public.trading_balances(user_id);
CREATE INDEX idx_trading_balance_transfers_user_id ON public.trading_balance_transfers(user_id);
CREATE INDEX idx_trading_balance_transfers_status ON public.trading_balance_transfers(status);