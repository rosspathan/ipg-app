-- Convert loan settings from INR to BSK
ALTER TABLE public.bsk_loan_settings
ADD COLUMN IF NOT EXISTS min_amount_bsk NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_amount_bsk NUMERIC DEFAULT 10000;

-- Update column comments
COMMENT ON COLUMN public.bsk_loan_settings.min_amount_bsk IS 'Minimum loan amount in BSK';
COMMENT ON COLUMN public.bsk_loan_settings.max_amount_bsk IS 'Maximum loan amount in BSK';

-- Migrate existing INR values to BSK (assuming 1 BSK = 1 INR as placeholder, admin will update)
UPDATE public.bsk_loan_settings
SET min_amount_bsk = min_amount_inr,
    max_amount_bsk = max_amount_inr
WHERE min_amount_bsk = 100 AND max_amount_bsk = 10000;