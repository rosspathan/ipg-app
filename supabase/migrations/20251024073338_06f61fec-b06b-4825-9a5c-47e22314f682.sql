-- Update minimum deposit from 100,000 to 100
UPDATE fiat_settings_inr 
SET min_deposit = 100, 
    updated_at = now();

-- Add indexes for fast transaction history queries
CREATE INDEX IF NOT EXISTS idx_fiat_deposits_user_created 
ON fiat_deposits(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_user_created 
ON fiat_withdrawals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_to_inr_user_created 
ON crypto_to_inr_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposits_user_created 
ON deposits(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created 
ON withdrawals(user_id, created_at DESC);

-- Add indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_fiat_deposits_status_created 
ON fiat_deposits(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_status_created 
ON fiat_withdrawals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_to_inr_status_created 
ON crypto_to_inr_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposits_status_created 
ON deposits(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created 
ON withdrawals(status, created_at DESC);

-- Add function to get transaction statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_transaction_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pending_deposits_count', (
      SELECT COUNT(*) FROM fiat_deposits WHERE status = 'pending'
    ) + (
      SELECT COUNT(*) FROM crypto_to_inr_requests WHERE status = 'pending'
    ) + (
      SELECT COUNT(*) FROM deposits WHERE status = 'pending'
    ),
    'pending_deposits_amount', (
      SELECT COALESCE(SUM(amount), 0) FROM fiat_deposits WHERE status = 'pending'
    ) + (
      SELECT COALESCE(SUM(net_inr_credit), 0) FROM crypto_to_inr_requests WHERE status = 'pending'
    ),
    'pending_withdrawals_count', (
      SELECT COUNT(*) FROM fiat_withdrawals WHERE status = 'pending'
    ) + (
      SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'
    ),
    'pending_withdrawals_amount', (
      SELECT COALESCE(SUM(amount), 0) FROM fiat_withdrawals WHERE status = 'pending'
    ),
    'approved_today_count', (
      SELECT COUNT(*) FROM fiat_deposits 
      WHERE status = 'approved' AND DATE(decided_at) = CURRENT_DATE
    ) + (
      SELECT COUNT(*) FROM crypto_to_inr_requests 
      WHERE status = 'approved' AND DATE(decided_at) = CURRENT_DATE
    ),
    'fees_collected_today', (
      SELECT COALESCE(SUM(fee), 0) FROM fiat_deposits 
      WHERE status = 'approved' AND DATE(decided_at) = CURRENT_DATE
    ) + (
      SELECT COALESCE(SUM(total_fee), 0) FROM crypto_to_inr_requests 
      WHERE status = 'approved' AND DATE(decided_at) = CURRENT_DATE
    ),
    'fees_collected_month', (
      SELECT COALESCE(SUM(fee), 0) FROM fiat_deposits 
      WHERE status = 'approved' AND DATE_TRUNC('month', decided_at) = DATE_TRUNC('month', CURRENT_DATE)
    ) + (
      SELECT COALESCE(SUM(total_fee), 0) FROM crypto_to_inr_requests 
      WHERE status = 'approved' AND DATE_TRUNC('month', decided_at) = DATE_TRUNC('month', CURRENT_DATE)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transaction_stats() TO authenticated;