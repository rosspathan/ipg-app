
-- Fix the unified_bsk_transactions view to correctly determine is_credit based on tx_type
-- instead of amount sign (since migration debits store positive amounts)
DROP VIEW IF EXISTS unified_bsk_transactions;

CREATE VIEW unified_bsk_transactions AS
SELECT 
    id,
    user_id,
    created_at,
    abs(amount_bsk) AS amount,
    balance_type,
    tx_type AS transaction_type,
    tx_subtype AS transaction_subtype,
    (
        SELECT COALESCE(sum(
            CASE 
                WHEN sub.tx_type = 'credit' THEN sub.amount_bsk 
                ELSE -sub.amount_bsk 
            END
        ), 0::numeric)
        FROM unified_bsk_ledger sub
        WHERE sub.user_id = l.user_id 
          AND sub.balance_type = l.balance_type 
          AND sub.created_at <= l.created_at
    ) AS balance_after,
    CASE
        WHEN tx_subtype = 'transfer_in' THEN 'Received from ' || COALESCE(meta_json ->> 'sender_name', 'User')
        WHEN tx_subtype = 'transfer_out' THEN 'Sent to ' || COALESCE(meta_json ->> 'recipient_name', 'User')
        WHEN tx_subtype = 'admin_credit' THEN 'Admin Credit'
        WHEN tx_subtype = 'admin_debit' THEN 'Admin Debit'
        WHEN tx_subtype = 'badge_purchase' THEN 'Badge Purchase'
        WHEN tx_subtype = 'badge_bonus' THEN 'Badge Bonus'
        WHEN tx_subtype = 'referral_commission_l1' THEN 'Direct Referral Commission'
        WHEN tx_subtype = 'referral_commission_multi' THEN 'Multi-Level Commission'
        WHEN tx_subtype = 'spin_win' THEN 'Spin Wheel Win'
        WHEN tx_subtype = 'spin_bet' THEN 'Spin Wheel Bet'
        WHEN tx_subtype = 'loan_disbursement' THEN 'Loan Disbursement'
        WHEN tx_subtype = 'loan_repayment' THEN 'Loan Repayment'
        WHEN tx_subtype = 'kyc_completion' THEN 'KYC Completion Bonus'
        WHEN tx_subtype = 'kyc_referral_bonus' THEN 'KYC Referral Bonus'
        WHEN tx_subtype = 'one_time_purchase' THEN 'One-Time Purchase'
        WHEN tx_subtype = 'one_time_purchase_bonus' THEN 'Purchase Bonus'
        WHEN tx_subtype = 'vip_milestone_reward' THEN 'VIP Milestone Reward'
        WHEN tx_subtype = 'staking_payout' THEN 'Staking Payout'
        WHEN tx_subtype = 'insurance_payout' THEN 'Insurance Payout'
        WHEN tx_subtype = 'onchain_migration' THEN 'Onchain Migration'
        WHEN tx_subtype = 'migration_refund' THEN 'Migration Refund'
        ELSE COALESCE(initcap(replace(tx_subtype, '_', ' ')), 'Transaction')
    END AS description,
    COALESCE(meta_json ->> 'sender_name', meta_json ->> 'recipient_name', meta_json ->> 'admin_email') AS sender_recipient,
    related_user_id,
    idempotency_key AS reference_id,
    idempotency_key AS transaction_id,
    meta_json AS metadata,
    notes,
    status,
    -- FIX: Use tx_type to determine credit/debit instead of amount sign
    tx_type = 'credit' AS is_credit,
    CASE
        WHEN tx_subtype = 'transfer_out' THEN user_id
        WHEN tx_subtype = 'transfer_in' THEN related_user_id
        WHEN tx_subtype IN ('admin_credit', 'admin_debit') THEN (meta_json ->> 'admin_user_id')::uuid
        ELSE user_id
    END AS from_user_id,
    CASE
        WHEN tx_subtype = 'transfer_out' THEN related_user_id
        WHEN tx_subtype = 'transfer_in' THEN user_id
        WHEN tx_subtype IN ('admin_credit', 'admin_debit') THEN user_id
        ELSE NULL::uuid
    END AS to_user_id,
    CASE
        WHEN tx_subtype IN ('transfer_in', 'transfer_out') THEN 'user_to_user'
        WHEN tx_subtype = 'admin_credit' THEN 'admin_to_user'
        WHEN tx_subtype = 'admin_debit' THEN 'user_to_admin'
        WHEN tx_subtype IN ('referral_commission_l1', 'referral_commission_multi') THEN 'referral_reward'
        WHEN tx_subtype IN ('spin_win', 'spin_bet') THEN 'spin_wheel'
        WHEN tx_subtype IN ('badge_purchase', 'badge_upgrade', 'badge_bonus') THEN 'badge_system'
        WHEN tx_subtype IN ('loan_disbursement', 'loan_repayment', 'loan_processing_fee') THEN 'loan'
        WHEN tx_subtype IN ('staking_payout', 'insurance_payout', 'vip_milestone_reward') THEN 'reward'
        WHEN tx_subtype IN ('one_time_purchase', 'one_time_purchase_bonus', 'one_time_purchase_refund') THEN 'purchase'
        WHEN tx_subtype IN ('onchain_migration', 'migration_refund') THEN 'migration'
        ELSE 'system'
    END AS transfer_category,
    created_by
FROM unified_bsk_ledger l
ORDER BY created_at DESC;
