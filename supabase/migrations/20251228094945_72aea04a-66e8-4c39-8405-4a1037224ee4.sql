-- Update trading_engine_settings to use 0.5% fee for both maker and taker
UPDATE public.trading_engine_settings 
SET maker_fee_percent = 0.5, 
    taker_fee_percent = 0.5;

-- Add admin_fee_wallet column if not exists
ALTER TABLE public.trading_engine_settings 
ADD COLUMN IF NOT EXISTS admin_fee_wallet TEXT DEFAULT '0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1';

-- Create trading_fees_collected ledger table
CREATE TABLE IF NOT EXISTS public.trading_fees_collected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  fee_asset TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  fee_percent NUMERIC NOT NULL DEFAULT 0.5,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  admin_wallet TEXT NOT NULL DEFAULT '0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1',
  status TEXT DEFAULT 'collected' CHECK (status IN ('collected', 'transferred', 'pending_transfer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_fees_collected ENABLE ROW LEVEL SECURITY;

-- Admin can view all fees
CREATE POLICY "Admins can view all trading fees"
  ON public.trading_fees_collected
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can view their own fees
CREATE POLICY "Users can view their own trading fees"
  ON public.trading_fees_collected
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trading_fees_collected_user_id ON public.trading_fees_collected(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_fees_collected_trade_id ON public.trading_fees_collected(trade_id);
CREATE INDEX IF NOT EXISTS idx_trading_fees_collected_created_at ON public.trading_fees_collected(created_at DESC);