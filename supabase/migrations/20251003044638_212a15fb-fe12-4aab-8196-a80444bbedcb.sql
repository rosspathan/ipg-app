-- BSK Loan Program Tables

-- 1) Create enum for loan status
DO $$ BEGIN
  CREATE TYPE public.bsk_loan_status AS ENUM ('pending', 'approved', 'active', 'completed', 'rejected', 'defaulted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create bsk_loan_configs table for admin settings
CREATE TABLE IF NOT EXISTS public.bsk_loan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_loan_amount NUMERIC NOT NULL DEFAULT 100,
  max_loan_amount NUMERIC NOT NULL DEFAULT 25000,
  duration_weeks INTEGER NOT NULL DEFAULT 16,
  interest_rate_percent NUMERIC NOT NULL DEFAULT 10,
  processing_fee_percent NUMERIC NOT NULL DEFAULT 2,
  late_payment_fee NUMERIC NOT NULL DEFAULT 50,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 3) Create bsk_loan_applications table
CREATE TABLE IF NOT EXISTS public.bsk_loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config_id UUID REFERENCES public.bsk_loan_configs(id),
  loan_amount NUMERIC NOT NULL,
  duration_weeks INTEGER NOT NULL,
  interest_rate_percent NUMERIC NOT NULL,
  processing_fee NUMERIC NOT NULL,
  total_repayment NUMERIC NOT NULL,
  weekly_payment NUMERIC NOT NULL,
  status public.bsk_loan_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  disbursed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Create bsk_loan_payments table
CREATE TABLE IF NOT EXISTS public.bsk_loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.bsk_loan_applications(id),
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  payment_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  late_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Create bsk_loan_ledger for tracking BSK movements
CREATE TABLE IF NOT EXISTS public.bsk_loan_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.bsk_loan_applications(id),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  bsk_amount NUMERIC NOT NULL,
  balance_type TEXT NOT NULL DEFAULT 'withdrawable',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Enable RLS on all tables
ALTER TABLE public.bsk_loan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_loan_ledger ENABLE ROW LEVEL SECURITY;

-- 7) RLS Policies for bsk_loan_configs
DO $$ BEGIN
  CREATE POLICY "Admin can manage loan configs"
  ON public.bsk_loan_configs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view active loan config"
  ON public.bsk_loan_configs FOR SELECT
  USING (is_enabled = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8) RLS Policies for bsk_loan_applications
DO $$ BEGIN
  CREATE POLICY "Admin can manage all loan applications"
  ON public.bsk_loan_applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own loan applications"
  ON public.bsk_loan_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own loan applications"
  ON public.bsk_loan_applications FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9) RLS Policies for bsk_loan_payments
DO $$ BEGIN
  CREATE POLICY "Admin can manage all payments"
  ON public.bsk_loan_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own payments"
  ON public.bsk_loan_payments FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10) RLS Policies for bsk_loan_ledger
DO $$ BEGIN
  CREATE POLICY "Admin can view all ledger"
  ON public.bsk_loan_ledger FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own ledger"
  ON public.bsk_loan_ledger FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System can insert ledger entries"
  ON public.bsk_loan_ledger FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 11) Triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_bsk_loan_configs_updated_at
  BEFORE UPDATE ON public.bsk_loan_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bsk_loan_applications_updated_at
  BEFORE UPDATE ON public.bsk_loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bsk_loan_payments_updated_at
  BEFORE UPDATE ON public.bsk_loan_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12) Insert default loan configuration
INSERT INTO public.bsk_loan_configs (
  min_loan_amount,
  max_loan_amount,
  duration_weeks,
  interest_rate_percent,
  processing_fee_percent,
  late_payment_fee,
  is_enabled
) VALUES (
  100,
  25000,
  16,
  10,
  2,
  50,
  true
) ON CONFLICT DO NOTHING;