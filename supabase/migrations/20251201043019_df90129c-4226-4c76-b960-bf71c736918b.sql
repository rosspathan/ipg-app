-- Add completion bonus tracking to ad_user_subscriptions
ALTER TABLE ad_user_subscriptions
ADD COLUMN IF NOT EXISTS completion_bonus_bsk numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_bonus_credited_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN ad_user_subscriptions.completion_bonus_bsk IS 'Bonus BSK credited upon full completion of subscription';
COMMENT ON COLUMN ad_user_subscriptions.completion_bonus_credited_at IS 'Timestamp when completion bonus was credited';