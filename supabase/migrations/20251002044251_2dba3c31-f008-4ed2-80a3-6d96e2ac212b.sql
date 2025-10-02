-- Add new fields to ismart_spin_config for BSK fees and winning fee percentage
ALTER TABLE public.ismart_spin_config
ADD COLUMN IF NOT EXISTS post_free_fee_bsk NUMERIC NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS winning_fee_percent NUMERIC NOT NULL DEFAULT 5;

-- Add comment for clarity
COMMENT ON COLUMN public.ismart_spin_config.post_free_fee_bsk IS 'Fee in BSK charged per spin after free spins are exhausted';
COMMENT ON COLUMN public.ismart_spin_config.winning_fee_percent IS 'Percentage fee deducted from winning amount';