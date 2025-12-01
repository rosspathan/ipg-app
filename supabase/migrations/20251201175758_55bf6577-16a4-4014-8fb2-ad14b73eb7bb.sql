-- Add completion bonus columns to bsk_loan_settings
ALTER TABLE bsk_loan_settings 
ADD COLUMN IF NOT EXISTS completion_bonus_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_bonus_percent numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS completion_bonus_destination text DEFAULT 'holding';

COMMENT ON COLUMN bsk_loan_settings.completion_bonus_enabled IS 'Enable completion bonus for users who repay loans on time';
COMMENT ON COLUMN bsk_loan_settings.completion_bonus_percent IS 'Percentage of principal amount as completion bonus';
COMMENT ON COLUMN bsk_loan_settings.completion_bonus_destination IS 'Balance destination for bonus: holding or withdrawable';