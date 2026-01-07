-- Create escrow_balances table to track user deposits in the trading escrow
CREATE TABLE public.escrow_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_symbol TEXT NOT NULL,
    deposited DECIMAL(24,8) NOT NULL DEFAULT 0,
    locked DECIMAL(24,8) NOT NULL DEFAULT 0,
    available DECIMAL(24,8) GENERATED ALWAYS AS (deposited - locked) STORED,
    escrow_address TEXT,
    last_deposit_tx TEXT,
    last_deposit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, asset_symbol)
);

-- Create escrow_deposits table to track individual deposits
CREATE TABLE public.escrow_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_symbol TEXT NOT NULL,
    amount DECIMAL(24,8) NOT NULL,
    tx_hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    confirmations INT NOT NULL DEFAULT 0,
    required_confirmations INT NOT NULL DEFAULT 12,
    credited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create escrow_withdrawals table to track withdrawal requests
CREATE TABLE public.escrow_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_symbol TEXT NOT NULL,
    amount DECIMAL(24,8) NOT NULL,
    to_address TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    gas_used DECIMAL(24,8),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Create escrow_contract_config table
CREATE TABLE public.escrow_contract_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'BSC',
    chain_id INT NOT NULL DEFAULT 56,
    deployed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    relayer_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_contract_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow_balances
CREATE POLICY "Users can view their own escrow balances"
ON public.escrow_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage escrow balances"
ON public.escrow_balances FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for escrow_deposits
CREATE POLICY "Users can view their own escrow deposits"
ON public.escrow_deposits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage escrow deposits"
ON public.escrow_deposits FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for escrow_withdrawals
CREATE POLICY "Users can view their own escrow withdrawals"
ON public.escrow_withdrawals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests"
ON public.escrow_withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage escrow withdrawals"
ON public.escrow_withdrawals FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for escrow_contract_config (public read, admin write)
CREATE POLICY "Anyone can view escrow contract config"
ON public.escrow_contract_config FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_escrow_balances_user ON public.escrow_balances(user_id);
CREATE INDEX idx_escrow_balances_asset ON public.escrow_balances(asset_symbol);
CREATE INDEX idx_escrow_deposits_user ON public.escrow_deposits(user_id);
CREATE INDEX idx_escrow_deposits_status ON public.escrow_deposits(status);
CREATE INDEX idx_escrow_deposits_tx ON public.escrow_deposits(tx_hash);
CREATE INDEX idx_escrow_withdrawals_user ON public.escrow_withdrawals(user_id);
CREATE INDEX idx_escrow_withdrawals_status ON public.escrow_withdrawals(status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_escrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_escrow_balances_updated_at
BEFORE UPDATE ON public.escrow_balances
FOR EACH ROW EXECUTE FUNCTION public.update_escrow_updated_at();

CREATE TRIGGER update_escrow_deposits_updated_at
BEFORE UPDATE ON public.escrow_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_escrow_updated_at();

CREATE TRIGGER update_escrow_contract_config_updated_at
BEFORE UPDATE ON public.escrow_contract_config
FOR EACH ROW EXECUTE FUNCTION public.update_escrow_updated_at();