-- Update ad mining settings to allow only 1 ad per day per subscription tier
UPDATE ad_mining_settings 
SET max_subscription_payout_per_day_per_tier = 1,
    updated_at = NOW()
WHERE id IN (SELECT id FROM ad_mining_settings ORDER BY created_at DESC LIMIT 1);

COMMENT ON COLUMN ad_mining_settings.max_subscription_payout_per_day_per_tier IS 'Maximum number of ads that can be watched per day per active subscription tier (1 ad = 1 daily payout)';
COMMENT ON COLUMN ad_mining_settings.free_daily_reward_bsk IS 'BSK reward for free daily ad views (credited to holding balance)';

-- Add comment to clarify subscription mechanics
COMMENT ON TABLE ad_subscription_tiers IS 'Subscription tiers for ad mining. Users pay tier_inr (BSK at 1:1 rate) and receive daily_bsk per day for duration_days (100 days). Daily BSK is 1% of tier_inr value, credited to withdrawable balance. Users can watch 1 ad per active subscription per day.';
COMMENT ON COLUMN ad_subscription_tiers.daily_bsk IS '1% of tier_inr value, released daily to withdrawable balance for 100 days';
COMMENT ON COLUMN ad_subscription_tiers.duration_days IS 'Total days subscription is active (100 days). User watches 1 ad per day to earn daily_bsk';