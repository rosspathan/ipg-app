
-- Disable triggers during backfill to prevent balance recalculation
ALTER TABLE public.unified_bsk_ledger DISABLE TRIGGER after_bsk_transaction_refresh;
ALTER TABLE public.unified_bsk_ledger DISABLE TRIGGER trg_mirror_bsk_to_trading;

-- Backfill holding debit entries
INSERT INTO public.unified_bsk_ledger (
  id, user_id, idempotency_key, tx_type, tx_subtype, balance_type,
  amount_bsk, notes, meta_json, created_at, processed_at, created_by, status
)
SELECT
  gen_random_uuid(),
  r.user_id,
  'sunset_holding_debit_' || r.user_id || '_' || r.event_id,
  'debit',
  'global_sunset_unlock',
  'holding',
  r.locked_bsk_before,
  format('Locked BSK sunset: %s BSK converted at 3:1, %s remainder burned', r.tradable_bsk_credited * 3, r.remainder_bsk),
  jsonb_build_object(
    'event_id', r.event_id,
    'conversion_ratio', 3,
    'locked_before', r.locked_bsk_before,
    'tradable_credited', r.tradable_bsk_credited,
    'remainder_burned', r.remainder_bsk
  ),
  e.completed_at,
  e.completed_at,
  e.admin_user_id,
  'completed'
FROM public.bsk_unlock_user_records r
JOIN public.bsk_global_unlock_events e ON e.id = r.event_id
WHERE r.status = 'completed' AND e.status = 'completed'
ON CONFLICT (idempotency_key) DO NOTHING;

-- Backfill withdrawable credit entries
INSERT INTO public.unified_bsk_ledger (
  id, user_id, idempotency_key, tx_type, tx_subtype, balance_type,
  amount_bsk, notes, meta_json, created_at, processed_at, created_by, status
)
SELECT
  gen_random_uuid(),
  r.user_id,
  'sunset_withdrawable_credit_' || r.user_id || '_' || r.event_id,
  'credit',
  'global_sunset_unlock',
  'withdrawable',
  r.tradable_bsk_credited,
  format('Locked BSK sunset: %s tradable BSK from 3:1 conversion', r.tradable_bsk_credited),
  jsonb_build_object(
    'event_id', r.event_id,
    'conversion_ratio', 3,
    'locked_before', r.locked_bsk_before,
    'tradable_credited', r.tradable_bsk_credited,
    'remainder_burned', r.remainder_bsk
  ),
  e.completed_at,
  e.completed_at,
  e.admin_user_id,
  'completed'
FROM public.bsk_unlock_user_records r
JOIN public.bsk_global_unlock_events e ON e.id = r.event_id
WHERE r.status = 'completed' AND e.status = 'completed'
AND r.tradable_bsk_credited > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Re-enable triggers
ALTER TABLE public.unified_bsk_ledger ENABLE TRIGGER after_bsk_transaction_refresh;
ALTER TABLE public.unified_bsk_ledger ENABLE TRIGGER trg_mirror_bsk_to_trading;

-- Update the view to include sunset descriptions
CREATE OR REPLACE VIEW public.unified_bsk_transactions AS
SELECT id,
    user_id,
    created_at,
    abs(amount_bsk) AS amount,
    balance_type,
    tx_type AS transaction_type,
    tx_subtype AS transaction_subtype,
    ( SELECT COALESCE(sum(
                CASE
                    WHEN (sub.tx_type = 'credit'::text) THEN sub.amount_bsk
                    ELSE (- sub.amount_bsk)
                END), (0)::numeric) AS "coalesce"
           FROM unified_bsk_ledger sub
          WHERE ((sub.user_id = l.user_id) AND (sub.balance_type = l.balance_type) AND (sub.created_at <= l.created_at))) AS balance_after,
        CASE
            WHEN (tx_subtype = 'transfer_in'::text) THEN ('Received from '::text || COALESCE((meta_json ->> 'sender_name'::text), 'User'::text))
            WHEN (tx_subtype = 'transfer_out'::text) THEN ('Sent to '::text || COALESCE((meta_json ->> 'recipient_name'::text), 'User'::text))
            WHEN (tx_subtype = 'admin_credit'::text) THEN 'Admin Credit'::text
            WHEN (tx_subtype = 'admin_debit'::text) THEN 'Admin Debit'::text
            WHEN (tx_subtype = 'badge_purchase'::text) THEN 'Badge Purchase'::text
            WHEN (tx_subtype = 'badge_bonus'::text) THEN 'Badge Bonus'::text
            WHEN (tx_subtype = 'referral_commission_l1'::text) THEN 'Direct Referral Commission'::text
            WHEN (tx_subtype = 'referral_commission_multi'::text) THEN 'Multi-Level Commission'::text
            WHEN (tx_subtype = 'spin_win'::text) THEN 'Spin Wheel Win'::text
            WHEN (tx_subtype = 'spin_bet'::text) THEN 'Spin Wheel Bet'::text
            WHEN (tx_subtype = 'loan_disbursement'::text) THEN 'Loan Disbursement'::text
            WHEN (tx_subtype = 'loan_repayment'::text) THEN 'Loan Repayment'::text
            WHEN (tx_subtype = 'kyc_completion'::text) THEN 'KYC Completion Bonus'::text
            WHEN (tx_subtype = 'kyc_referral_bonus'::text) THEN 'KYC Referral Bonus'::text
            WHEN (tx_subtype = 'one_time_purchase'::text) THEN 'One-Time Purchase'::text
            WHEN (tx_subtype = 'one_time_purchase_bonus'::text) THEN 'Purchase Bonus'::text
            WHEN (tx_subtype = 'vip_milestone_reward'::text) THEN 'VIP Milestone Reward'::text
            WHEN (tx_subtype = 'staking_payout'::text) THEN 'Staking Payout'::text
            WHEN (tx_subtype = 'insurance_payout'::text) THEN 'Insurance Payout'::text
            WHEN (tx_subtype = 'onchain_migration'::text) THEN 'Onchain Migration'::text
            WHEN (tx_subtype = 'migration_refund'::text) THEN 'Migration Refund'::text
            WHEN (tx_subtype = 'global_sunset_unlock'::text AND tx_type = 'debit'::text) THEN 'Locked BSK Sunset (Removed)'::text
            WHEN (tx_subtype = 'global_sunset_unlock'::text AND tx_type = 'credit'::text) THEN 'Locked BSK → Tradable (3:1 Conversion)'::text
            ELSE COALESCE(initcap(replace(tx_subtype, '_'::text, ' '::text)), 'Transaction'::text)
        END AS description,
    COALESCE((meta_json ->> 'sender_name'::text), (meta_json ->> 'recipient_name'::text), (meta_json ->> 'admin_email'::text)) AS sender_recipient,
    related_user_id,
    idempotency_key AS reference_id,
    idempotency_key AS transaction_id,
    meta_json AS metadata,
    notes,
    status,
    (tx_type = 'credit'::text) AS is_credit,
        CASE
            WHEN (tx_subtype = 'transfer_out'::text) THEN user_id
            WHEN (tx_subtype = 'transfer_in'::text) THEN related_user_id
            WHEN (tx_subtype = ANY (ARRAY['admin_credit'::text, 'admin_debit'::text])) THEN ((meta_json ->> 'admin_user_id'::text))::uuid
            ELSE user_id
        END AS from_user_id,
        CASE
            WHEN (tx_subtype = 'transfer_out'::text) THEN related_user_id
            WHEN (tx_subtype = 'transfer_in'::text) THEN user_id
            WHEN (tx_subtype = ANY (ARRAY['admin_credit'::text, 'admin_debit'::text])) THEN user_id
            ELSE NULL::uuid
        END AS to_user_id,
        CASE
            WHEN (tx_subtype = ANY (ARRAY['transfer_in'::text, 'transfer_out'::text])) THEN 'user_to_user'::text
            WHEN (tx_subtype = 'admin_credit'::text) THEN 'admin_to_user'::text
            WHEN (tx_subtype = 'admin_debit'::text) THEN 'user_to_admin'::text
            WHEN (tx_subtype = ANY (ARRAY['referral_commission_l1'::text, 'referral_commission_multi'::text])) THEN 'referral_reward'::text
            WHEN (tx_subtype = ANY (ARRAY['spin_win'::text, 'spin_bet'::text])) THEN 'spin_wheel'::text
            WHEN (tx_subtype = ANY (ARRAY['badge_purchase'::text, 'badge_upgrade'::text, 'badge_bonus'::text])) THEN 'badge_system'::text
            WHEN (tx_subtype = ANY (ARRAY['loan_disbursement'::text, 'loan_repayment'::text, 'loan_processing_fee'::text])) THEN 'loan'::text
            WHEN (tx_subtype = ANY (ARRAY['staking_payout'::text, 'insurance_payout'::text, 'vip_milestone_reward'::text])) THEN 'reward'::text
            WHEN (tx_subtype = ANY (ARRAY['one_time_purchase'::text, 'one_time_purchase_bonus'::text, 'one_time_purchase_refund'::text])) THEN 'purchase'::text
            WHEN (tx_subtype = ANY (ARRAY['onchain_migration'::text, 'migration_refund'::text])) THEN 'migration'::text
            WHEN (tx_subtype = 'global_sunset_unlock'::text) THEN 'sunset_conversion'::text
            ELSE 'system'::text
        END AS transfer_category,
    created_by
   FROM unified_bsk_ledger l
  ORDER BY created_at DESC;
