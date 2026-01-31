
-- ================================================================
-- REFUND: Duplicate Loan Foreclosure Deductions
-- ================================================================
-- Two users were affected by duplicate balance deductions when 
-- clicking "Settle Loan" button multiple times before the fix.
-- This migration credits back the excess amounts.
-- ================================================================

-- Refund User 1: rajeshkumarchiluka74@gmail.com
-- Loan: BSK34748908S02D | Charged 4x instead of 1x
-- Correct: 17,187.50 BSK | Total deducted: 68,750.00 BSK | Refund: 51,562.50 BSK
INSERT INTO unified_bsk_ledger (
  user_id,
  tx_type,
  tx_subtype,
  balance_type,
  amount_bsk,
  idempotency_key,
  notes,
  meta_json,
  status
) VALUES (
  '0ab93b1a-0103-47a9-bf73-0d8222eaf9c1',
  'credit',
  'admin_refund',
  'withdrawable',
  51562.50,
  'refund_dup_foreclosure_BSK34748908S02D_v1',
  'Refund for duplicate loan foreclosure deductions - loan BSK34748908S02D (charged 4x instead of 1x)',
  jsonb_build_object(
    'reason', 'Duplicate foreclosure deduction refund',
    'loan_number', 'BSK34748908S02D',
    'loan_id', '290a4b1d-0321-4315-ad83-d077a2cd7432',
    'original_deduction_count', 4,
    'correct_amount_bsk', 17187.50,
    'total_incorrectly_deducted_bsk', 68750.00,
    'refund_amount_bsk', 51562.50,
    'affected_transaction_ids', ARRAY['71b34c62-ab54-45aa-a02a-f64204db9674', 'ecd98dcc-61a6-4679-8ad0-0ef9733284a1', '3476c049-acc3-45f9-b96a-3cd401612163', '95471c9a-98b1-412a-995d-cd8d30a371c0']
  ),
  'completed'
);

-- Refund User 2: rambabukillo20@gmail.com
-- Loan: BSK89220756YONR | Charged 5x instead of 1x
-- Correct: 500.00 BSK | Total deducted: 2,500.00 BSK | Refund: 2,000.00 BSK
INSERT INTO unified_bsk_ledger (
  user_id,
  tx_type,
  tx_subtype,
  balance_type,
  amount_bsk,
  idempotency_key,
  notes,
  meta_json,
  status
) VALUES (
  '178484c4-5de6-4e95-98d4-8c142c834dda',
  'credit',
  'admin_refund',
  'withdrawable',
  2000.00,
  'refund_dup_foreclosure_BSK89220756YONR_v1',
  'Refund for duplicate loan foreclosure deductions - loan BSK89220756YONR (charged 5x instead of 1x)',
  jsonb_build_object(
    'reason', 'Duplicate foreclosure deduction refund',
    'loan_number', 'BSK89220756YONR',
    'loan_id', 'e467cf1f-0c36-4c80-abe9-11aab6aeea25',
    'original_deduction_count', 5,
    'correct_amount_bsk', 500.00,
    'total_incorrectly_deducted_bsk', 2500.00,
    'refund_amount_bsk', 2000.00,
    'affected_transaction_ids', ARRAY['465c3826-ceac-4f23-86dd-a25671e39b83', 'f954c13d-a4c7-4c9b-af01-c4bb36e4210c', '7b2998f5-7354-409f-af3f-83c821af543e', '352a2fbf-a2c3-4795-a835-6977c54bd7b7', 'bae4c8f2-3fe2-4a35-a82f-44018cc5b5c6']
  ),
  'completed'
);

-- Refresh the materialized view to update balances
REFRESH MATERIALIZED VIEW mv_user_bsk_balances;

-- Sync to UI table
UPDATE user_bsk_balances ub
SET 
  withdrawable_balance = mv.withdrawable_balance,
  holding_balance = mv.holding_balance,
  updated_at = now()
FROM mv_user_bsk_balances mv
WHERE ub.user_id = mv.user_id
  AND ub.user_id IN ('0ab93b1a-0103-47a9-bf73-0d8222eaf9c1', '178484c4-5de6-4e95-98d4-8c142c834dda');
