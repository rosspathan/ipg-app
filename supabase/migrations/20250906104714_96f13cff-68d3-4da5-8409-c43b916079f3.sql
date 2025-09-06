-- Update fiat_settings_inr to match requirements
ALTER TABLE public.fiat_settings_inr
ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- Update fiat_deposits to add route_id
ALTER TABLE public.fiat_deposits
ADD COLUMN IF NOT EXISTS route_id uuid,
ADD COLUMN IF NOT EXISTS method text CHECK(method IN ('BANK','UPI'));

-- Create fiat_bank_accounts table
CREATE TABLE IF NOT EXISTS public.fiat_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  ifsc text NOT NULL,
  notes text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create fiat_upi_accounts table
CREATE TABLE IF NOT EXISTS public.fiat_upi_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  upi_id text NOT NULL,
  upi_name text NOT NULL,
  notes text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.fiat_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_upi_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for fiat_bank_accounts
CREATE POLICY "Admin can manage fiat_bank_accounts" 
ON public.fiat_bank_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active fiat_bank_accounts" 
ON public.fiat_bank_accounts 
FOR SELECT 
USING (is_active = true);

-- RLS policies for fiat_upi_accounts
CREATE POLICY "Admin can manage fiat_upi_accounts" 
ON public.fiat_upi_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active fiat_upi_accounts" 
ON public.fiat_upi_accounts 
FOR SELECT 
USING (is_active = true);

-- Enable realtime for new tables
ALTER TABLE public.fiat_bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_upi_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_settings_inr REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_upi_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_settings_inr;

-- Insert demo data if tables are empty
INSERT INTO public.fiat_settings_inr (enabled, min_deposit, fee_percent, fee_fixed)
SELECT true, 100, 0.5, 5
WHERE NOT EXISTS (SELECT 1 FROM public.fiat_settings_inr);

INSERT INTO public.fiat_bank_accounts (label, bank_name, account_name, account_number, ifsc, notes, is_active, is_default)
SELECT 'Demo Bank', 'I-SMART Bank', 'I SMART TECH', '1234567890', 'ISMT0000123', 'Demo bank account for testing', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.fiat_bank_accounts);

INSERT INTO public.fiat_upi_accounts (label, upi_id, upi_name, notes, is_active, is_default)
SELECT 'Demo UPI', 'ismart@upi', 'I SMART TECH', 'Demo UPI account for testing', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.fiat_upi_accounts);