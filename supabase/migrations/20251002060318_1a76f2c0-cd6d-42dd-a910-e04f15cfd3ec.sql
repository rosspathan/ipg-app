-- Update badge_thresholds to use BSK instead of INR
ALTER TABLE badge_thresholds 
  DROP COLUMN IF EXISTS inr_threshold,
  DROP COLUMN IF EXISTS vip_bonus_inr;

ALTER TABLE badge_thresholds 
  ADD COLUMN bsk_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN bonus_bsk_holding NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN description TEXT;

-- Add balance_type to team_income_levels
ALTER TABLE team_income_levels 
  ADD COLUMN balance_type TEXT NOT NULL DEFAULT 'withdrawable' CHECK (balance_type IN ('withdrawable', 'holding'));

-- Clear existing data and insert the exact configuration
TRUNCATE TABLE team_income_levels CASCADE;
TRUNCATE TABLE badge_thresholds CASCADE;
TRUNCATE TABLE vip_milestones CASCADE;

-- Insert 50-level referral income structure
-- Level 1: 5 BSK (holding balance)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active) 
VALUES (1, 5.0, 'holding', true);

-- Levels 2-10: 0.5 BSK (withdrawable)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active)
SELECT generate_series(2, 10), 0.5, 'withdrawable', true;

-- Levels 11-20: 0.4 BSK (withdrawable)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active)
SELECT generate_series(11, 20), 0.4, 'withdrawable', true;

-- Levels 21-30: 0.3 BSK (withdrawable)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active)
SELECT generate_series(21, 30), 0.3, 'withdrawable', true;

-- Levels 31-40: 0.2 BSK (withdrawable)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active)
SELECT generate_series(31, 40), 0.2, 'withdrawable', true;

-- Levels 41-50: 0.1 BSK (withdrawable)
INSERT INTO team_income_levels (level, bsk_reward, balance_type, is_active)
SELECT generate_series(41, 50), 0.1, 'withdrawable', true;

-- Insert badge thresholds
INSERT INTO badge_thresholds (badge_name, bsk_threshold, unlock_levels, bonus_bsk_holding, is_active, description) VALUES
  ('Silver', 1000, 10, 0, true, 'Unlocks L2-L10 referral income'),
  ('Gold', 2000, 20, 0, true, 'Unlocks L11-L20 referral income'),
  ('Platinum', 3000, 30, 0, true, 'Unlocks L21-L30 referral income'),
  ('Diamond', 4000, 40, 0, true, 'Unlocks L31-L40 referral income'),
  ('i-Smart VIP', 5000, 50, 10000, true, 'Unlocks L41-L50 referral income + 10,000 BSK bonus');

-- Insert VIP milestones (for i-Smart VIP members)
INSERT INTO vip_milestones (vip_count_threshold, reward_type, reward_inr_value, reward_description, requires_kyc, is_active) VALUES
  (10, 'bsk', 10000, '10,000 BSK for 10 VIP referrals', false, true),
  (50, 'bsk', 50000, '50,000 BSK for 50 VIP referrals', false, true),
  (100, 'bsk', 100000, '100,000 BSK for 100 VIP referrals', false, true),
  (250, 'bsk', 200000, '200,000 BSK for 250 VIP referrals', false, true),
  (500, 'bsk', 500000, '500,000 BSK for 500 VIP referrals', false, true);

-- Ensure team_referral_settings has default values
INSERT INTO team_referral_settings (
  enabled, trigger_event, spillover_to_next_eligible_upline,
  direct_referral_percent, cooloff_hours, bsk_inr_rate
) VALUES (
  true, 'badge_purchase_or_upgrade', false,
  10.0, 24, 1.0
)
ON CONFLICT DO NOTHING;