-- Drop existing view
DROP VIEW IF EXISTS public.unified_bsk_transactions;

-- Recreate unified_bsk_transactions view with security_invoker = true
CREATE VIEW public.unified_bsk_transactions
WITH (security_invoker = true)
AS
-- BSK Withdrawable Ledger
SELECT 
  id,
  user_id,
  created_at,
  'withdrawable' as balance_type,
  COALESCE(tx_type, type) as transaction_type,
  amount_bsk as amount,
  CASE 
    WHEN tx_type = 'earn' OR type = 'earn' THEN 'Earned BSK'
    WHEN tx_type = 'spend' OR type = 'spend' THEN 'Spent BSK'
    WHEN tx_type = 'bonus' OR type = 'bonus' THEN 'Bonus Reward'
    WHEN tx_type = 'adjustment' OR type = 'adjustment' THEN 'Balance Adjustment'
    ELSE COALESCE(tx_type, type, 'Transaction')
  END as description,
  metadata,
  balance_after
FROM public.bsk_withdrawable_ledger

UNION ALL

-- BSK Holding Ledger
SELECT 
  id,
  user_id,
  created_at,
  'holding' as balance_type,
  COALESCE(tx_type, type) as transaction_type,
  amount_bsk as amount,
  CASE 
    WHEN tx_type = 'earn' OR type = 'earn' THEN 'Earned BSK (Holding)'
    WHEN tx_type = 'spend' OR type = 'spend' THEN 'Spent BSK (Holding)'
    WHEN tx_type = 'bonus' OR type = 'bonus' THEN 'Bonus Reward (Holding)'
    WHEN tx_type = 'adjustment' OR type = 'adjustment' THEN 'Balance Adjustment (Holding)'
    ELSE COALESCE(tx_type, type, 'Transaction') || ' (Holding)'
  END as description,
  metadata,
  balance_after
FROM public.bsk_holding_ledger

UNION ALL

-- BSK Transfers (Sender perspective)
SELECT 
  id,
  sender_id as user_id,
  created_at,
  'withdrawable' as balance_type,
  'transfer_out' as transaction_type,
  -amount_bsk as amount,
  'Transfer Sent' || COALESCE(' - ' || notes, '') as description,
  jsonb_build_object(
    'transfer_id', id,
    'recipient_id', recipient_id,
    'notes', notes,
    'transaction_ref', transaction_ref,
    'original_metadata', metadata
  ) as metadata,
  sender_balance_after as balance_after
FROM public.bsk_transfers
WHERE status = 'completed'

UNION ALL

-- BSK Transfers (Recipient perspective)
SELECT 
  id,
  recipient_id as user_id,
  created_at,
  'withdrawable' as balance_type,
  'transfer_in' as transaction_type,
  amount_bsk as amount,
  'Transfer Received' || COALESCE(' - ' || notes, '') as description,
  jsonb_build_object(
    'transfer_id', id,
    'sender_id', sender_id,
    'notes', notes,
    'transaction_ref', transaction_ref,
    'original_metadata', metadata
  ) as metadata,
  recipient_balance_after as balance_after
FROM public.bsk_transfers
WHERE status = 'completed'

UNION ALL

-- Bonus Ledger (includes referral commissions, badge bonuses, etc.)
SELECT 
  id,
  user_id,
  created_at,
  CASE 
    WHEN meta_json->>'destination' = 'holding' THEN 'holding'
    ELSE 'withdrawable'
  END as balance_type,
  type as transaction_type,
  amount_bsk as amount,
  CASE 
    WHEN type = 'referral_badge_purchase' THEN 
      'Referral Commission' || 
      COALESCE(' - ' || (meta_json->>'badge_name')::text, '') ||
      COALESCE(' (Level ' || (meta_json->>'level')::text || ')', '')
    WHEN type = 'badge_bonus' THEN 
      'Badge Bonus' || 
      COALESCE(' - ' || (meta_json->>'badge_name')::text, '')
    WHEN type = 'badge_purchase' THEN 
      'Badge Purchase' || 
      COALESCE(' - ' || (meta_json->>'badge_name')::text, '')
    WHEN type = 'purchase_bonus' THEN
      'Purchase Bonus' ||
      COALESCE(' - ' || (meta_json->>'campaign_name')::text, '')
    WHEN type = 'kyc_approval' THEN 'KYC Approval Bonus'
    WHEN type = 'promotion' THEN 'Promotional Bonus'
    WHEN type = 'manual_credit' THEN 'Manual Credit'
    WHEN type = 'manual_debit' THEN 'Manual Debit'
    ELSE type
  END as description,
  meta_json as metadata,
  NULL::numeric as balance_after
FROM public.bonus_ledger

UNION ALL

-- BSK Withdrawal Requests
SELECT 
  id,
  user_id,
  created_at,
  'withdrawable' as balance_type,
  CASE 
    WHEN status = 'completed' THEN 'withdrawal_completed'
    WHEN status = 'pending' THEN 'withdrawal_pending'
    WHEN status = 'rejected' THEN 'withdrawal_rejected'
    ELSE 'withdrawal_' || status
  END as transaction_type,
  -amount_bsk as amount,
  'BSK Withdrawal' ||
  CASE 
    WHEN status = 'completed' THEN ' - Completed'
    WHEN status = 'pending' THEN ' - Pending'
    WHEN status = 'rejected' THEN ' - Rejected'
    ELSE ' - ' || status
  END ||
  CASE 
    WHEN withdrawal_type = 'bank' THEN ' (Bank Transfer)'
    WHEN withdrawal_type = 'crypto' THEN ' (Crypto)'
    ELSE ''
  END as description,
  jsonb_build_object(
    'withdrawal_id', id,
    'withdrawal_type', withdrawal_type,
    'status', status,
    'bank_name', bank_name,
    'account_number', account_number,
    'crypto_address', crypto_address,
    'crypto_network', crypto_network,
    'crypto_symbol', crypto_symbol
  ) as metadata,
  NULL::numeric as balance_after
FROM public.bsk_withdrawal_requests

UNION ALL

-- BSK Loan Ledger
SELECT 
  id,
  user_id,
  processed_at as created_at,
  balance_type,
  transaction_type,
  amount_bsk as amount,
  CASE 
    WHEN transaction_type = 'loan_disbursed' THEN 'Loan Disbursed'
    WHEN transaction_type = 'loan_repayment' THEN 'Loan Repayment'
    WHEN transaction_type = 'interest_charged' THEN 'Interest Charged'
    ELSE transaction_type
  END as description,
  metadata,
  NULL::numeric as balance_after
FROM public.bsk_loan_ledger

UNION ALL

-- Referral Ledger (for future when new referral system is active)
SELECT 
  id,
  user_id,
  created_at,
  'withdrawable' as balance_type,
  'referral_commission' as transaction_type,
  bsk_amount as amount,
  'Referral Commission' ||
  COALESCE(' - Depth ' || depth::text, '') ||
  COALESCE(' (' || trigger_type || ')', '') as description,
  jsonb_build_object(
    'depth', depth,
    'source_user_id', source_user_id,
    'referrer_id', referrer_id,
    'ledger_type', ledger_type,
    'badge_at_event', badge_at_event,
    'trigger_type', trigger_type,
    'inr_amount_snapshot', inr_amount_snapshot,
    'bsk_rate_snapshot', bsk_rate_snapshot,
    'status', status,
    'tx_refs', tx_refs
  ) as metadata,
  NULL::numeric as balance_after
FROM public.referral_ledger
WHERE status = 'settled'

ORDER BY created_at DESC;

-- Grant access
GRANT SELECT ON public.unified_bsk_transactions TO authenticated;

-- Add comment
COMMENT ON VIEW public.unified_bsk_transactions IS 'Unified view of all BSK transactions across all ledgers with proper security context';