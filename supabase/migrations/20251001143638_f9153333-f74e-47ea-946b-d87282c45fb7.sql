-- Update BSK Loan maximum amount to 25,000 INR
UPDATE bsk_loan_settings
SET max_amount_inr = 25000
WHERE max_amount_inr = 50000;