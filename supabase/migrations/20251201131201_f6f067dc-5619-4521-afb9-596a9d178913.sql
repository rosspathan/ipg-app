-- Add consecutive_missed_weeks_for_cancel to bsk_loan_settings
ALTER TABLE bsk_loan_settings 
ADD COLUMN IF NOT EXISTS consecutive_missed_weeks_for_cancel INTEGER DEFAULT 4
CHECK (consecutive_missed_weeks_for_cancel >= 1 AND consecutive_missed_weeks_for_cancel <= 16);

COMMENT ON COLUMN bsk_loan_settings.consecutive_missed_weeks_for_cancel IS 'Number of consecutive missed weeks before loan auto-cancellation';