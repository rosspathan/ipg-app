-- Extend unified_bsk_transactions view to include withdrawal requests
-- Corrected with all proper column names from schema

DROP VIEW IF EXISTS unified_bsk_transactions;

CREATE OR REPLACE VIEW unified_bsk_transactions 
WITH (security_invoker = true) AS

-- Withdrawable Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  COALESCE(tx_type, type) as transaction_type,
  tx_subtype as transaction_subtype,
  'withdrawable' as balance_type,
  reference_id::text as reference_id,
  COALESCE(notes, 'BSK transaction') as description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_withdrawable_ledger' as source_table
FROM bsk_withdrawable_ledger

UNION ALL

-- Holding Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  COALESCE(tx_type, type) as transaction_type,
  tx_subtype as transaction_subtype,
  'holding' as balance_type,
  reference_id::text as reference_id,
  COALESCE(notes, 'BSK transaction') as description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_holding_ledger' as source_table
FROM bsk_holding_ledger

UNION ALL

-- Insurance BSK Ledger
SELECT 
  id,
  user_id,
  created_at,
  bsk_amount as amount_bsk,
  type as transaction_type,
  plan_type as transaction_subtype,
  destination as balance_type,
  claim_id::text as reference_id,
  'Insurance BSK reward' as description,
  metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  idempotency_key,
  'insurance_bsk_ledger' as source_table
FROM insurance_bsk_ledger

UNION ALL

-- Referral Commissions (using earner_id as user_id)
SELECT 
  id,
  earner_id as user_id,
  created_at,
  bsk_amount as amount_bsk,
  'referral_commission' as transaction_type,
  commission_type as transaction_subtype,
  destination as balance_type,
  payer_id::text as reference_id,
  'Referral commission - Level ' || level::text as description,
  jsonb_build_object(
    'commission_type', commission_type,
    'level', level,
    'payer_id', payer_id,
    'event_type', event_type,
    'status', status
  ) as metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  NULL::text as idempotency_key,
  'referral_commissions' as source_table
FROM referral_commissions

UNION ALL

-- Legacy Bonus Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  type as transaction_type,
  NULL::text as transaction_subtype,
  'withdrawable' as balance_type,
  NULL::text as reference_id,
  COALESCE(meta_json->>'description', 'BSK bonus') as description,
  meta_json as metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  NULL::text as idempotency_key,
  'bonus_ledger' as source_table
FROM bonus_ledger

UNION ALL

-- Withdrawal Requests (NEW)
SELECT 
  id,
  user_id,
  created_at,
  -amount_bsk as amount_bsk,  -- Negative for outflow
  'withdrawal' as transaction_type,
  status as transaction_subtype,
  'withdrawable' as balance_type,
  id::text as reference_id,
  CASE 
    WHEN status = 'completed' THEN 'BSK withdrawal completed'
    WHEN status = 'pending' THEN 'BSK withdrawal pending'
    WHEN status = 'processing' THEN 'BSK withdrawal processing'
    WHEN status = 'rejected' THEN 'BSK withdrawal rejected'
    ELSE 'BSK withdrawal - ' || status
  END as description,
  jsonb_build_object(
    'withdrawal_type', withdrawal_type,
    'status', status,
    'bank_name', bank_name,
    'account_number', account_number,
    'ifsc_code', ifsc_code,
    'crypto_symbol', crypto_symbol,
    'crypto_address', crypto_address,
    'crypto_network', crypto_network,
    'processed_at', processed_at,
    'admin_notes', admin_notes
  ) as metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  NULL::text as idempotency_key,
  'bsk_withdrawal_requests' as source_table
FROM bsk_withdrawal_requests
WHERE status IN ('completed', 'processing', 'rejected', 'pending')

ORDER BY created_at DESC;

-- Grant access
GRANT SELECT ON unified_bsk_transactions TO authenticated;