-- Add status column to unified_bsk_ledger for tracking transaction status
ALTER TABLE public.unified_bsk_ledger 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed', 'failed'));

-- Add index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_status ON public.unified_bsk_ledger(status);

-- Add index for reference ID search
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_idempotency_key ON public.unified_bsk_ledger(idempotency_key);

-- Add index for related_user_id for from/to user queries
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_related_user_id ON public.unified_bsk_ledger(related_user_id);

-- Drop and recreate the unified_bsk_transactions view with enhanced fields
DROP VIEW IF EXISTS public.unified_bsk_transactions;

CREATE VIEW public.unified_bsk_transactions AS
SELECT 
  l.id,
  l.user_id,
  l.created_at,
  abs(l.amount_bsk) as amount,
  l.balance_type,
  l.tx_type as transaction_type,
  l.tx_subtype as transaction_subtype,
  -- Calculate balance_after from the ledger
  (
    SELECT COALESCE(SUM(amount_bsk), 0)
    FROM public.unified_bsk_ledger sub
    WHERE sub.user_id = l.user_id 
      AND sub.balance_type = l.balance_type
      AND sub.created_at <= l.created_at
  ) as balance_after,
  -- Description based on tx_subtype
  CASE 
    WHEN l.tx_subtype = 'transfer_in' THEN 'Received from ' || COALESCE((l.meta_json->>'sender_name')::text, 'User')
    WHEN l.tx_subtype = 'transfer_out' THEN 'Sent to ' || COALESCE((l.meta_json->>'recipient_name')::text, 'User')
    WHEN l.tx_subtype = 'admin_credit' THEN 'Admin Credit'
    WHEN l.tx_subtype = 'admin_debit' THEN 'Admin Debit'
    WHEN l.tx_subtype = 'badge_purchase' THEN 'Badge Purchase'
    WHEN l.tx_subtype = 'badge_bonus' THEN 'Badge Bonus'
    WHEN l.tx_subtype = 'referral_commission_l1' THEN 'Direct Referral Commission'
    WHEN l.tx_subtype = 'referral_commission_multi' THEN 'Multi-Level Commission'
    WHEN l.tx_subtype = 'spin_win' THEN 'Spin Wheel Win'
    WHEN l.tx_subtype = 'spin_bet' THEN 'Spin Wheel Bet'
    WHEN l.tx_subtype = 'loan_disbursement' THEN 'Loan Disbursement'
    WHEN l.tx_subtype = 'loan_repayment' THEN 'Loan Repayment'
    WHEN l.tx_subtype = 'kyc_completion' THEN 'KYC Completion Bonus'
    WHEN l.tx_subtype = 'one_time_purchase' THEN 'One-Time Purchase'
    WHEN l.tx_subtype = 'one_time_purchase_bonus' THEN 'Purchase Bonus'
    WHEN l.tx_subtype = 'vip_milestone_reward' THEN 'VIP Milestone Reward'
    WHEN l.tx_subtype = 'staking_payout' THEN 'Staking Payout'
    WHEN l.tx_subtype = 'insurance_payout' THEN 'Insurance Payout'
    ELSE COALESCE(initcap(replace(l.tx_subtype, '_', ' ')), 'Transaction')
  END as description,
  -- Related user (sender/recipient)
  COALESCE(
    (l.meta_json->>'sender_name')::text,
    (l.meta_json->>'recipient_name')::text,
    (l.meta_json->>'admin_email')::text
  ) as sender_recipient,
  -- Related user ID for joins
  l.related_user_id,
  -- Reference ID (idempotency key is the reference)
  l.idempotency_key as reference_id,
  l.idempotency_key as transaction_id,
  l.meta_json as metadata,
  l.notes,
  l.status,
  l.amount_bsk > 0 as is_credit,
  -- From/To user info from metadata
  CASE 
    WHEN l.tx_subtype = 'transfer_out' THEN l.user_id
    WHEN l.tx_subtype = 'transfer_in' THEN l.related_user_id
    WHEN l.tx_subtype IN ('admin_credit', 'admin_debit') THEN (l.meta_json->>'admin_user_id')::uuid
    ELSE l.user_id
  END as from_user_id,
  CASE 
    WHEN l.tx_subtype = 'transfer_out' THEN l.related_user_id
    WHEN l.tx_subtype = 'transfer_in' THEN l.user_id
    WHEN l.tx_subtype IN ('admin_credit', 'admin_debit') THEN l.user_id
    ELSE NULL
  END as to_user_id,
  -- Transfer type classification
  CASE 
    WHEN l.tx_subtype IN ('transfer_in', 'transfer_out') THEN 'user_to_user'
    WHEN l.tx_subtype = 'admin_credit' THEN 'admin_to_user'
    WHEN l.tx_subtype = 'admin_debit' THEN 'user_to_admin'
    WHEN l.tx_subtype IN ('referral_commission_l1', 'referral_commission_multi') THEN 'referral_reward'
    WHEN l.tx_subtype IN ('spin_win', 'spin_bet') THEN 'spin_wheel'
    WHEN l.tx_subtype IN ('badge_purchase', 'badge_upgrade', 'badge_bonus') THEN 'badge_system'
    WHEN l.tx_subtype IN ('loan_disbursement', 'loan_repayment', 'loan_processing_fee') THEN 'loan'
    WHEN l.tx_subtype IN ('staking_payout', 'insurance_payout', 'vip_milestone_reward') THEN 'reward'
    WHEN l.tx_subtype IN ('one_time_purchase', 'one_time_purchase_bonus', 'one_time_purchase_refund') THEN 'purchase'
    ELSE 'system'
  END as transfer_category,
  l.created_by
FROM public.unified_bsk_ledger l
ORDER BY l.created_at DESC;

-- Grant select permissions
GRANT SELECT ON public.unified_bsk_transactions TO authenticated;
GRANT SELECT ON public.unified_bsk_transactions TO anon;

-- Create RLS policy for the base table if not exists (view inherits from base table)
-- The view already respects the RLS on unified_bsk_ledger