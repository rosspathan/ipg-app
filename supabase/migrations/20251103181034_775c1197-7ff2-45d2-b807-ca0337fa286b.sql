-- Add idempotency_key to referral_commissions for duplicate prevention
ALTER TABLE referral_commissions 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_commissions_idempotency 
ON referral_commissions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN referral_commissions.idempotency_key IS 'Unique key to prevent duplicate commission entries from retries or duplicate events';
