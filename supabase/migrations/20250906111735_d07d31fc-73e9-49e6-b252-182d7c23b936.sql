-- Enable INR deposits and set proper fee structure
UPDATE fiat_settings_inr 
SET 
  enabled = true,
  min_deposit = 100,
  fee_percent = 0.5,
  fee_fixed = 5,
  updated_at = now()
WHERE id = '73d77ce1-8547-4caf-95ac-c095cbfd5318';