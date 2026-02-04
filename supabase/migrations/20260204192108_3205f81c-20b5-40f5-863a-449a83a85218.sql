-- Fix installments for closed loans that still show unpaid status
-- These loans were settled but the installments weren't marked as paid

UPDATE bsk_loan_installments
SET 
  status = 'paid',
  paid_at = COALESCE(paid_at, NOW()),
  paid_bsk = COALESCE(paid_bsk, emi_bsk)
WHERE loan_id IN (
  'e467cf1f-0c36-4c80-abe9-11aab6aeea25',
  '758bf33f-6ad0-455a-b72d-4ef195736337',
  'edf61b2c-dbe8-4995-ae9a-1dee68df8afb',
  'f1628055-3fc6-4aab-a0fd-5d5b0809f4bd',
  '290a4b1d-0321-4315-ad83-d077a2cd7432'
)
AND status IN ('due', 'overdue');