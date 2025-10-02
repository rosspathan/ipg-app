-- Add premium frequency field to insurance_bsk_plans
ALTER TABLE public.insurance_bsk_plans
ADD COLUMN IF NOT EXISTS premium_frequency TEXT NOT NULL DEFAULT 'annual' CHECK (premium_frequency IN ('one_time', 'annual'));

-- Update the column name to be more generic
ALTER TABLE public.insurance_bsk_plans
RENAME COLUMN annual_premium_bsk TO premium_bsk;

-- Add comment for clarity
COMMENT ON COLUMN public.insurance_bsk_plans.premium_frequency IS 'Payment frequency: one_time or annual';
COMMENT ON COLUMN public.insurance_bsk_plans.premium_bsk IS 'Premium amount in BSK (frequency determined by premium_frequency column)';