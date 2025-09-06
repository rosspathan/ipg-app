-- INR Fiat Settings (Admin-managed configuration)
CREATE TABLE public.fiat_settings_inr (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  bank_account_name TEXT,
  bank_account_number TEXT,
  ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT,
  upi_name TEXT,
  notes TEXT,
  min_deposit NUMERIC DEFAULT 0,
  min_withdraw NUMERIC DEFAULT 0,
  fee_percent NUMERIC DEFAULT 0,
  fee_fixed NUMERIC DEFAULT 0,
  withdraw_fee_percent NUMERIC DEFAULT 0,
  withdraw_fee_fixed NUMERIC DEFAULT 0,
  processing_hours TEXT DEFAULT '24-48 hours',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- INR Deposits (User creates, Admin approves)
CREATE TABLE public.fiat_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('BANK', 'UPI')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  fee NUMERIC DEFAULT 0,
  net_credit NUMERIC DEFAULT 0,
  reference TEXT,
  proof_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'canceled')) DEFAULT 'pending',
  admin_notes TEXT,
  decided_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE
);

-- INR Withdrawals (User requests, Admin processes) 
CREATE TABLE public.fiat_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('BANK', 'UPI')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  fee NUMERIC DEFAULT 0,
  net_payout NUMERIC DEFAULT 0,
  beneficiary JSONB NOT NULL, -- {account_name, account_number, ifsc, bank_name} OR {upi_id, upi_name}
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'canceled', 'processing', 'paid')) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  payout_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Optional Ledger for transparency (tracks all INR movements)
CREATE TABLE public.fiat_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit', 'withdraw', 'fee', 'reversal')),
  ref_id UUID, -- Reference to fiat_deposits or fiat_withdrawals
  direction TEXT NOT NULL CHECK(direction IN ('credit', 'debit')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fiat_settings_inr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fiat_settings_inr
CREATE POLICY "Admin can manage fiat_settings_inr" 
ON public.fiat_settings_inr 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view fiat_settings_inr" 
ON public.fiat_settings_inr 
FOR SELECT 
USING (true);

-- RLS Policies for fiat_deposits
CREATE POLICY "Admin can manage fiat_deposits" 
ON public.fiat_deposits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own deposits" 
ON public.fiat_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposits" 
ON public.fiat_deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to cancel their own pending deposits
CREATE POLICY "Users can cancel own pending deposits" 
ON public.fiat_deposits 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- RLS Policies for fiat_withdrawals  
CREATE POLICY "Admin can manage fiat_withdrawals" 
ON public.fiat_withdrawals 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own withdrawals" 
ON public.fiat_withdrawals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals" 
ON public.fiat_withdrawals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to cancel their own pending withdrawals
CREATE POLICY "Users can cancel own pending withdrawals" 
ON public.fiat_withdrawals 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- RLS Policies for fiat_ledger
CREATE POLICY "Admin can manage fiat_ledger" 
ON public.fiat_ledger 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own ledger entries" 
ON public.fiat_ledger 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert ledger entries" 
ON public.fiat_ledger 
FOR INSERT 
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_fiat_settings_inr_updated_at
BEFORE UPDATE ON public.fiat_settings_inr
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for all tables
ALTER TABLE public.fiat_settings_inr REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_deposits REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_ledger REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_settings_inr;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_ledger;

-- Insert initial settings row (disabled by default)
INSERT INTO public.fiat_settings_inr (
  enabled,
  notes,
  min_deposit,
  min_withdraw,
  fee_percent,
  fee_fixed,
  withdraw_fee_percent,
  withdraw_fee_fixed,
  processing_hours
) VALUES (
  false,
  'INR deposits and withdrawals are currently under maintenance',
  100,
  500,
  0.5,
  0,
  1.0,
  10,
  '24-48 hours'
);