-- Create trade_settlements table to track on-chain asset transfers
CREATE TABLE public.trade_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  base_amount NUMERIC NOT NULL,
  quote_amount NUMERIC NOT NULL,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  base_tx_hash TEXT,
  quote_tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'base_settled', 'quote_settled', 'completed', 'failed', 'partial')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  gas_used_base NUMERIC,
  gas_used_quote NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_trade_settlements_trade_id ON public.trade_settlements(trade_id);
CREATE INDEX idx_trade_settlements_status ON public.trade_settlements(status);
CREATE INDEX idx_trade_settlements_buyer_id ON public.trade_settlements(buyer_id);
CREATE INDEX idx_trade_settlements_seller_id ON public.trade_settlements(seller_id);
CREATE INDEX idx_trade_settlements_created_at ON public.trade_settlements(created_at DESC);

-- Enable RLS
ALTER TABLE public.trade_settlements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own settlements
CREATE POLICY "Users can view their own settlements"
ON public.trade_settlements
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Policy: Service role can manage all settlements
CREATE POLICY "Service role can manage settlements"
ON public.trade_settlements
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.trade_settlements IS 'Tracks on-chain token transfers between buyer and seller after trade execution';