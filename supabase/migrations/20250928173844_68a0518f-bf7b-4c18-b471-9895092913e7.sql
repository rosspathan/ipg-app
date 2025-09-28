-- BSK Loan Module Database Schema
-- All amounts in INR but settled in BSK using admin-set rates

-- Global loan settings table
CREATE TABLE IF NOT EXISTS bsk_loan_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  min_amount_inr NUMERIC NOT NULL DEFAULT 100,
  max_amount_inr NUMERIC NOT NULL DEFAULT 50000,
  default_tenor_weeks INTEGER NOT NULL DEFAULT 16,
  interest_type TEXT NOT NULL DEFAULT 'flat' CHECK (interest_type IN ('flat', 'reducing_balance')),
  default_interest_rate_weekly NUMERIC NOT NULL DEFAULT 0.0,
  origination_fee_percent NUMERIC NOT NULL DEFAULT 0.0,
  late_fee_percent NUMERIC NOT NULL DEFAULT 0.0,
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  schedule_denomination TEXT NOT NULL DEFAULT 'fixed_bsk' CHECK (schedule_denomination IN ('fixed_bsk', 'inr_pegged')),
  max_concurrent_loans_per_user INTEGER NOT NULL DEFAULT 1,
  prepayment_allowed BOOLEAN NOT NULL DEFAULT true,
  prepayment_penalty_percent NUMERIC NOT NULL DEFAULT 0.0,
  autopay_enabled BOOLEAN NOT NULL DEFAULT false,
  kyc_required BOOLEAN NOT NULL DEFAULT true,
  region_restrictions JSONB NOT NULL DEFAULT '["IN"]',
  min_account_age_days INTEGER NOT NULL DEFAULT 0,
  badge_limits JSONB NOT NULL DEFAULT '{"Silver": 5000, "Gold": 10000, "Platinum": 20000, "Diamond": 35000, "VIP": 50000}',
  per_user_exposure_cap_inr NUMERIC,
  global_exposure_cap_inr NUMERIC,
  daily_disbursal_cap_inr NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Main loans table
CREATE TABLE IF NOT EXISTS bsk_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  loan_number TEXT NOT NULL UNIQUE,
  amount_inr NUMERIC NOT NULL CHECK (amount_inr > 0),
  disbursal_rate_snapshot NUMERIC NOT NULL,
  principal_bsk NUMERIC NOT NULL CHECK (principal_bsk > 0),
  tenor_weeks INTEGER NOT NULL DEFAULT 16,
  interest_type TEXT NOT NULL DEFAULT 'flat',
  interest_rate_weekly NUMERIC NOT NULL DEFAULT 0.0,
  origination_fee_percent NUMERIC NOT NULL DEFAULT 0.0,
  origination_fee_bsk NUMERIC NOT NULL DEFAULT 0.0,
  late_fee_percent NUMERIC NOT NULL DEFAULT 0.0,
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  schedule_denomination TEXT NOT NULL DEFAULT 'fixed_bsk',
  net_disbursed_bsk NUMERIC NOT NULL,
  total_due_bsk NUMERIC NOT NULL,
  paid_bsk NUMERIC NOT NULL DEFAULT 0.0,
  outstanding_bsk NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'in_arrears', 'closed', 'written_off')),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  disbursed_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  next_due_date DATE,
  days_past_due INTEGER NOT NULL DEFAULT 0,
  region TEXT NOT NULL DEFAULT 'IN',
  user_badge TEXT,
  policy_snapshot JSONB NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID,
  disbursed_by UUID
);

-- Installment schedule table
CREATE TABLE IF NOT EXISTS bsk_loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES bsk_loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  emi_bsk NUMERIC, -- For fixed_bsk schedule
  emi_inr NUMERIC, -- For inr_pegged schedule
  principal_bsk NUMERIC NOT NULL DEFAULT 0,
  interest_bsk NUMERIC NOT NULL DEFAULT 0,
  late_fee_bsk NUMERIC NOT NULL DEFAULT 0,
  total_due_bsk NUMERIC NOT NULL,
  paid_bsk NUMERIC NOT NULL DEFAULT 0,
  payment_rate_snapshot NUMERIC,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'late', 'waived', 'written_off')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(loan_id, installment_number)
);

-- BSK Loan ledger for all transactions
CREATE TABLE IF NOT EXISTS bsk_loan_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  loan_id UUID REFERENCES bsk_loans(id),
  installment_id UUID REFERENCES bsk_loan_installments(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'loan_disbursal', 'origination_fee', 'loan_repayment', 'late_fee', 
    'prepayment', 'write_off', 'fee_waiver', 'schedule_adjustment'
  )),
  amount_bsk NUMERIC NOT NULL,
  amount_inr NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,
  balance_type TEXT NOT NULL DEFAULT 'withdrawable' CHECK (balance_type IN ('withdrawable', 'holding')),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  reference_id TEXT,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_by UUID,
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bsk_loans_user_id ON bsk_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_bsk_loans_status ON bsk_loans(status);
CREATE INDEX IF NOT EXISTS idx_bsk_loans_next_due_date ON bsk_loans(next_due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bsk_loan_installments_loan_id ON bsk_loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_bsk_loan_installments_due_date ON bsk_loan_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_bsk_loan_ledger_user_id ON bsk_loan_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_bsk_loan_ledger_loan_id ON bsk_loan_ledger(loan_id);

-- Enable RLS
ALTER TABLE bsk_loan_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsk_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsk_loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsk_loan_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage loan settings" ON bsk_loan_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view loan settings" ON bsk_loan_settings
FOR SELECT USING (true);

CREATE POLICY "Admin can manage all loans" ON bsk_loans
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own loans" ON bsk_loans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own loan applications" ON bsk_loans
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all installments" ON bsk_loan_installments
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own loan installments" ON bsk_loan_installments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bsk_loans l 
    WHERE l.id = loan_id AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can view all loan ledger" ON bsk_loan_ledger
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own loan ledger" ON bsk_loan_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create loan ledger entries" ON bsk_loan_ledger
FOR INSERT WITH CHECK (true);

-- Insert default settings
INSERT INTO bsk_loan_settings (
  system_enabled, min_amount_inr, max_amount_inr, default_tenor_weeks,
  interest_type, default_interest_rate_weekly, origination_fee_percent,
  late_fee_percent, grace_period_days, schedule_denomination,
  max_concurrent_loans_per_user, prepayment_allowed, prepayment_penalty_percent,
  autopay_enabled, kyc_required, region_restrictions, min_account_age_days,
  badge_limits, created_by
) VALUES (
  true, 100, 50000, 16,
  'flat', 0.0, 0.0,
  0.0, 3, 'fixed_bsk',
  1, true, 0.0,
  false, true, '["IN"]', 0,
  '{"Silver": 5000, "Gold": 10000, "Platinum": 20000, "Diamond": 35000, "VIP": 50000}',
  (SELECT id FROM auth.users WHERE email = 'rosspathan@gmail.com' LIMIT 1)
) ON CONFLICT DO NOTHING;