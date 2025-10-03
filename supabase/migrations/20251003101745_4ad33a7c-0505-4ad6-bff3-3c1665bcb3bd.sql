-- Update ad subscription tiers to use BSK instead of INR
-- Add BSK column
ALTER TABLE public.ad_subscription_tiers 
ADD COLUMN tier_bsk NUMERIC NOT NULL DEFAULT 100;

-- Update existing tiers to have BSK values (same as INR values for migration)
UPDATE public.ad_subscription_tiers 
SET tier_bsk = tier_inr;

-- Rename tier_inr to tier_bsk_legacy for reference
ALTER TABLE public.ad_subscription_tiers 
RENAME COLUMN tier_inr TO tier_bsk_legacy;

-- Update settings table to remove INR rate
ALTER TABLE public.ad_mining_settings
DROP COLUMN IF EXISTS bsk_inr_rate;

-- Add helpful comments
COMMENT ON COLUMN public.ad_subscription_tiers.tier_bsk IS 'Subscription tier price in BSK tokens';
COMMENT ON COLUMN public.ad_subscription_tiers.tier_bsk_legacy IS 'Legacy INR column - deprecated, use tier_bsk instead';
COMMENT ON COLUMN public.ad_subscription_tiers.daily_bsk IS 'Daily BSK reward - calculated as 1% of tier_bsk (withdrawable balance)';