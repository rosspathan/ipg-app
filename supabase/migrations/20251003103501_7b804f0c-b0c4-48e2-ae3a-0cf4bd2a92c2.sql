-- Add BSK betting columns to spin wheel configuration
ALTER TABLE public.ismart_spin_config
ADD COLUMN IF NOT EXISTS min_bet_bsk NUMERIC NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_bet_bsk NUMERIC NOT NULL DEFAULT 1000;

-- Update existing records to use current INR values as BSK values (1:1 initial migration)
UPDATE public.ismart_spin_config
SET min_bet_bsk = COALESCE(min_bet_inr, 10),
    max_bet_bsk = COALESCE(max_bet_inr, 1000);

-- Add comments for clarity
COMMENT ON COLUMN public.ismart_spin_config.min_bet_bsk IS 'Minimum bet amount in BSK tokens';
COMMENT ON COLUMN public.ismart_spin_config.max_bet_bsk IS 'Maximum bet amount in BSK tokens';
COMMENT ON COLUMN public.ismart_spin_config.min_bet_inr IS 'Legacy minimum bet in INR - deprecated, use min_bet_bsk';
COMMENT ON COLUMN public.ismart_spin_config.max_bet_inr IS 'Legacy maximum bet in INR - deprecated, use max_bet_bsk';