-- Fix: Allow multiple users to use the same sponsor code
-- This removes the unique constraint that was preventing sponsors from having multiple direct referrals

-- Drop the unique constraint that blocks multiple uses of the same sponsor code
ALTER TABLE public.referral_links_new 
DROP CONSTRAINT IF EXISTS referral_links_new_referral_code_key;

-- Create a non-unique index for performance on lookups
CREATE INDEX IF NOT EXISTS idx_referral_links_new_referral_code 
ON public.referral_links_new (sponsor_code_used) 
WHERE sponsor_code_used IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_referral_links_new_referral_code IS 'Non-unique index for sponsor code lookups - allows multiple users per sponsor';
