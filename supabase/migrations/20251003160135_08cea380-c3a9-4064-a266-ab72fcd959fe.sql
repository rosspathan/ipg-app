-- Add new columns for loan processing fee options
ALTER TABLE public.bsk_loan_settings
ADD COLUMN IF NOT EXISTS processing_fee_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_fee_fixed_bsk NUMERIC DEFAULT 0;

-- Update column comments
COMMENT ON COLUMN public.bsk_loan_settings.default_interest_rate_weekly IS 'Interest rate per week (%) - UI shows annual rate, backend converts';
COMMENT ON COLUMN public.bsk_loan_settings.processing_fee_percent IS 'Loan processing fee as percentage of loan amount';
COMMENT ON COLUMN public.bsk_loan_settings.processing_fee_fixed_bsk IS 'Loan processing fee as fixed BSK amount (alternative to percentage)';
COMMENT ON COLUMN public.bsk_loan_settings.late_fee_percent IS 'Late payment fee as percentage of weekly payment amount';

-- Migrate existing origination_fee_percent to processing_fee_percent
UPDATE public.bsk_loan_settings
SET processing_fee_percent = origination_fee_percent
WHERE processing_fee_percent = 0 AND origination_fee_percent > 0;