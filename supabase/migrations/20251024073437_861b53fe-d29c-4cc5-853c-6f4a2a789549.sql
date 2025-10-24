-- Fix search_path for get_transaction_stats function
CREATE OR REPLACE FUNCTION get_transaction_stats()
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;