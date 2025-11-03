
-- Add amount column to referral_commissions if it doesn't exist for better tracking
-- This will store the INR/USD equivalent value at time of commission
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_commissions' 
    AND column_name = 'amount_inr'
  ) THEN
    ALTER TABLE referral_commissions 
    ADD COLUMN amount_inr numeric DEFAULT 0;
    
    COMMENT ON COLUMN referral_commissions.amount_inr IS 'INR value of commission at time of creation';
  END IF;
END $$;

-- Create index for better query performance on commission history
CREATE INDEX IF NOT EXISTS idx_referral_commissions_earner_created 
ON referral_commissions(earner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_payer_created 
ON referral_commissions(payer_id, created_at DESC);
