-- Phase 10 Part 1: Loan Prepayment Schema

-- Add prepayment tracking to loans
ALTER TABLE bsk_loans 
ADD COLUMN IF NOT EXISTS prepaid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prepayment_discount_bsk NUMERIC DEFAULT 0;

-- Create prepayment transactions table
CREATE TABLE IF NOT EXISTS bsk_loan_prepayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES bsk_loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prepayment_amount_bsk NUMERIC NOT NULL,
  outstanding_before_bsk NUMERIC NOT NULL,
  discount_applied_bsk NUMERIC DEFAULT 0,
  installments_cleared INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_by UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE bsk_loan_prepayments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own prepayments"
  ON bsk_loan_prepayments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all prepayments"
  ON bsk_loan_prepayments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create prepayments"
  ON bsk_loan_prepayments FOR INSERT
  WITH CHECK (true);

-- Phase 10 Part 2: Late Fee System

-- Add late fee tracking to installments
ALTER TABLE bsk_loan_installments
ADD COLUMN IF NOT EXISTS late_fee_bsk NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_applied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- Create late fee configuration table
CREATE TABLE IF NOT EXISTS bsk_loan_late_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grace_period_days INTEGER DEFAULT 3,
  late_fee_percent NUMERIC DEFAULT 5,
  max_late_fee_bsk NUMERIC DEFAULT 100,
  compound_daily BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE bsk_loan_late_fee_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage late fee config"
  ON bsk_loan_late_fee_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view late fee config"
  ON bsk_loan_late_fee_config FOR SELECT
  USING (is_active = true);

-- Insert default configuration
INSERT INTO bsk_loan_late_fee_config (grace_period_days, late_fee_percent, max_late_fee_bsk)
VALUES (3, 5, 100)
ON CONFLICT DO NOTHING;

-- Create late fee log table
CREATE TABLE IF NOT EXISTS bsk_loan_late_fee_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES bsk_loan_installments(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES bsk_loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  late_fee_bsk NUMERIC NOT NULL,
  days_overdue INTEGER NOT NULL,
  calculation_date DATE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE bsk_loan_late_fee_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own late fees"
  ON bsk_loan_late_fee_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all late fees"
  ON bsk_loan_late_fee_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create late fee logs"
  ON bsk_loan_late_fee_log FOR INSERT
  WITH CHECK (true);

-- Phase 10 Part 3: Loan Notifications

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS bsk_loan_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  remind_3_days_before BOOLEAN DEFAULT true,
  remind_1_day_before BOOLEAN DEFAULT true,
  remind_on_due_date BOOLEAN DEFAULT true,
  remind_overdue BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE bsk_loan_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own notification preferences"
  ON bsk_loan_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Create notification log table
CREATE TABLE IF NOT EXISTS bsk_loan_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  loan_id UUID REFERENCES bsk_loans(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES bsk_loan_installments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE bsk_loan_notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notification logs"
  ON bsk_loan_notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
  ON bsk_loan_notification_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create notification logs"
  ON bsk_loan_notification_log FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prepayments_user ON bsk_loan_prepayments(user_id);
CREATE INDEX IF NOT EXISTS idx_prepayments_loan ON bsk_loan_prepayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_log_user ON bsk_loan_late_fee_log(user_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_log_installment ON bsk_loan_late_fee_log(installment_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON bsk_loan_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_overdue ON bsk_loan_installments(due_date, status) WHERE status = 'overdue';