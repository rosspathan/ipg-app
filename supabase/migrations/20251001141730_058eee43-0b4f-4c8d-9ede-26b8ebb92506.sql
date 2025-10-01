-- Add missing ad subscription tiers to complete 100-10,000 INR range
-- Spec: Subscriptions 100-10,000 BSK tiers (actually INR, not BSK)
-- Formula: Daily payout = (tier_inr/100) BSK for 100 days → Withdrawable

-- Add tiers from 1,100 to 10,000 INR
INSERT INTO ad_subscription_tiers (tier_inr, daily_bsk, duration_days, is_active)
VALUES
  -- 1,100 - 2,000 (intervals of 100)
  (1100, 11, 100, true),
  (1200, 12, 100, true),
  (1300, 13, 100, true),
  (1400, 14, 100, true),
  (1500, 15, 100, true),
  (1600, 16, 100, true),
  (1700, 17, 100, true),
  (1800, 18, 100, true),
  (1900, 19, 100, true),
  (2000, 20, 100, true),
  -- 2,500 - 5,000 (intervals of 500)
  (2500, 25, 100, true),
  (3000, 30, 100, true),
  (3500, 35, 100, true),
  (4000, 40, 100, true),
  (4500, 45, 100, true),
  (5000, 50, 100, true),
  -- 6,000 - 10,000 (intervals of 1000)
  (6000, 60, 100, true),
  (7000, 70, 100, true),
  (8000, 80, 100, true),
  (9000, 90, 100, true),
  (10000, 100, 100, true)
ON CONFLICT (tier_inr) DO NOTHING;