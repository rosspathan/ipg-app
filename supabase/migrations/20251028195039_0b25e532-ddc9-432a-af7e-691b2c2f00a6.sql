-- Drop existing view if exists
DROP VIEW IF EXISTS unified_bsk_transactions;

-- Recreate unified_bsk_transactions view with ALL BSK transaction sources
CREATE VIEW unified_bsk_transactions AS
-- BSK Withdrawable Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  COALESCE(type, tx_type) AS transaction_type,
  COALESCE(tx_subtype, type) AS transaction_subtype,
  'withdrawable' AS balance_type,
  reference_id::text AS reference_id,
  COALESCE(notes, type, 'BSK transaction') AS description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_withdrawable_ledger' AS source_table
FROM bsk_withdrawable_ledger

UNION ALL

-- BSK Holding Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  COALESCE(type, tx_type) AS transaction_type,
  COALESCE(tx_subtype, type) AS transaction_subtype,
  'holding' AS balance_type,
  reference_id::text AS reference_id,
  COALESCE(notes, type, 'BSK transaction') AS description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_holding_ledger' AS source_table
FROM bsk_holding_ledger

UNION ALL

-- BSK Transfers (Sender perspective - outgoing)
SELECT 
  id,
  sender_id AS user_id,
  created_at,
  -amount_bsk AS amount_bsk,
  'transfer_out' AS transaction_type,
  status AS transaction_subtype,
  'withdrawable' AS balance_type,
  recipient_id::text AS reference_id,
  COALESCE(notes, 'BSK transfer sent') AS description,
  jsonb_build_object(
    'recipient_id', recipient_id,
    'transaction_ref', transaction_ref,
    'status', status,
    'sender_balance_before', sender_balance_before,
    'sender_balance_after', sender_balance_after,
    'notes', notes
  ) AS metadata,
  sender_balance_before AS balance_before,
  sender_balance_after AS balance_after,
  transaction_ref AS idempotency_key,
  'bsk_transfers' AS source_table
FROM bsk_transfers

UNION ALL

-- BSK Transfers (Recipient perspective - incoming)
SELECT 
  id,
  recipient_id AS user_id,
  created_at,
  amount_bsk,
  'transfer_in' AS transaction_type,
  status AS transaction_subtype,
  'withdrawable' AS balance_type,
  sender_id::text AS reference_id,
  COALESCE(notes, 'BSK transfer received') AS description,
  jsonb_build_object(
    'sender_id', sender_id,
    'transaction_ref', transaction_ref,
    'status', status,
    'recipient_balance_before', recipient_balance_before,
    'recipient_balance_after', recipient_balance_after,
    'notes', notes
  ) AS metadata,
  recipient_balance_before AS balance_before,
  recipient_balance_after AS balance_after,
  transaction_ref AS idempotency_key,
  'bsk_transfers' AS source_table
FROM bsk_transfers

UNION ALL

-- BSK Withdrawal Requests
SELECT 
  id,
  user_id,
  created_at,
  -amount_bsk AS amount_bsk,
  'withdrawal' AS transaction_type,
  status AS transaction_subtype,
  'withdrawable' AS balance_type,
  id::text AS reference_id,
  CASE 
    WHEN withdrawal_type = 'bank' THEN 'BSK withdrawal to ' || COALESCE(bank_name, 'bank account')
    WHEN withdrawal_type = 'crypto' THEN 'BSK withdrawal to ' || COALESCE(crypto_symbol, 'crypto')
    ELSE 'BSK withdrawal'
  END AS description,
  jsonb_build_object(
    'withdrawal_type', withdrawal_type,
    'bank_name', bank_name,
    'account_number', account_number,
    'ifsc_code', ifsc_code,
    'account_holder_name', account_holder_name,
    'crypto_symbol', crypto_symbol,
    'crypto_address', crypto_address,
    'crypto_network', crypto_network,
    'status', status,
    'admin_notes', admin_notes
  ) AS metadata,
  NULL::numeric AS balance_before,
  NULL::numeric AS balance_after,
  NULL::text AS idempotency_key,
  'bsk_withdrawal_requests' AS source_table
FROM bsk_withdrawal_requests

UNION ALL

-- BSK Loan Ledger
SELECT 
  id,
  user_id,
  processed_at AS created_at,
  amount_bsk,
  transaction_type,
  loan_id::text AS transaction_subtype,
  balance_type,
  reference_id,
  COALESCE(notes, transaction_type || ' - BSK loan') AS description,
  jsonb_build_object(
    'loan_id', loan_id,
    'installment_id', installment_id,
    'transaction_type', transaction_type,
    'direction', direction,
    'amount_inr', amount_inr,
    'rate_snapshot', rate_snapshot
  ) AS metadata,
  NULL::numeric AS balance_before,
  NULL::numeric AS balance_after,
  idempotency_key,
  'bsk_loan_ledger' AS source_table
FROM bsk_loan_ledger

UNION ALL

-- Bonus Ledger (BSK transactions only)
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  type AS transaction_type,
  asset AS transaction_subtype,
  CASE 
    WHEN meta_json->>'destination' = 'holding' THEN 'holding'
    ELSE 'withdrawable'
  END AS balance_type,
  id::text AS reference_id,
  COALESCE(meta_json->>'description', type) AS description,
  meta_json AS metadata,
  NULL::numeric AS balance_before,
  NULL::numeric AS balance_after,
  NULL::text AS idempotency_key,
  'bonus_ledger' AS source_table
FROM bonus_ledger
WHERE asset = 'BSK';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_bsk_user_date 
  ON bsk_withdrawable_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_unified_bsk_holding_user_date 
  ON bsk_holding_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bsk_transfers_sender 
  ON bsk_transfers(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bsk_transfers_recipient 
  ON bsk_transfers(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bsk_withdrawals_user 
  ON bsk_withdrawal_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bonus_ledger_bsk 
  ON bonus_ledger(user_id, created_at DESC) WHERE asset = 'BSK';

CREATE INDEX IF NOT EXISTS idx_bsk_loan_ledger_user 
  ON bsk_loan_ledger(user_id, processed_at DESC);