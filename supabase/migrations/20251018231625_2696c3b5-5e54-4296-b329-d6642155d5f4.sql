-- Part 1: Weekly Auto-Debit System - Add tracking columns to installments

-- Add auto-debit processing metadata to loan installments
ALTER TABLE bsk_loan_installments 
ADD COLUMN IF NOT EXISTS auto_debit_attempted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_debit_failed_reason TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create auto-debit processing log table
CREATE TABLE IF NOT EXISTS bsk_loan_auto_debit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  installment_id UUID REFERENCES bsk_loan_installments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  loan_id UUID REFERENCES bsk_loans(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  amount_bsk NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'insufficient_balance', 'error', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on auto-debit log
ALTER TABLE bsk_loan_auto_debit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all auto-debit logs
CREATE POLICY "Admin can view all auto-debit logs"
ON bsk_loan_auto_debit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own auto-debit logs
CREATE POLICY "Users can view own auto-debit logs"
ON bsk_loan_auto_debit_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert auto-debit logs
CREATE POLICY "System can insert auto-debit logs"
ON bsk_loan_auto_debit_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_auto_debit_log_batch ON bsk_loan_auto_debit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_auto_debit_log_user ON bsk_loan_auto_debit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_debit_log_scheduled_date ON bsk_loan_auto_debit_log(scheduled_date);

-- Create index on installments for auto-debit queries
CREATE INDEX IF NOT EXISTS idx_loan_installments_due_status ON bsk_loan_installments(due_date, status) WHERE status IN ('due', 'overdue');