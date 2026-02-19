
-- =====================================================
-- PHASE 1: CRITICAL DATABASE SECURITY HARDENING
-- =====================================================

-- 1A. Enable RLS on unprotected table
ALTER TABLE public.wallet_balances_cleanup_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup audit"
ON public.wallet_balances_cleanup_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert cleanup audit"
ON public.wallet_balances_cleanup_audit FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1B. Fix SECURITY DEFINER views → SECURITY INVOKER

-- order_book
DROP VIEW IF EXISTS public.order_book;
CREATE VIEW public.order_book WITH (security_invoker = true) AS
SELECT symbol, side, price,
  sum(remaining_amount) AS total_quantity,
  count(*) AS order_count
FROM orders
WHERE status IN ('pending', 'partially_filled')
  AND order_type = 'limit' AND price IS NOT NULL
GROUP BY symbol, side, price;

-- user_trade_fills
DROP VIEW IF EXISTS public.user_trade_fills;
CREATE VIEW public.user_trade_fills WITH (security_invoker = true) AS
SELECT t.id AS trade_id, t.symbol AS pair, t.buyer_id AS user_id,
  'buy'::text AS side, 'taker'::text AS role, t.price, t.quantity AS amount,
  t.total_value AS total, t.buyer_fee AS fee, t.fee_asset,
  t.buy_order_id AS order_id, t.trade_time AS executed_at, t.created_at
FROM trades t
UNION ALL
SELECT t.id AS trade_id, t.symbol AS pair, t.seller_id AS user_id,
  'sell'::text AS side, 'maker'::text AS role, t.price, t.quantity AS amount,
  t.total_value AS total, t.seller_fee AS fee, t.fee_asset,
  t.sell_order_id AS order_id, t.trade_time AS executed_at, t.created_at
FROM trades t;

-- crypto_transactions
DROP VIEW IF EXISTS public.crypto_transactions;
CREATE VIEW public.crypto_transactions WITH (security_invoker = true) AS
SELECT d.id, d.user_id, d.created_at, d.amount, a.symbol, a.name AS asset_name, a.logo_url,
  'deposit'::text AS transaction_type, d.status, d.tx_hash, d.network,
  d.confirmations, d.required_confirmations, NULL::text AS to_address, NULL::numeric AS fee,
  d.credited_at AS completed_at
FROM deposits d LEFT JOIN assets a ON d.asset_id = a.id
UNION ALL
SELECT w.id, w.user_id, w.created_at, w.amount, a.symbol, a.name AS asset_name, a.logo_url,
  'withdrawal'::text AS transaction_type, w.status, w.tx_hash, w.network,
  NULL::integer AS confirmations, 12 AS required_confirmations, w.to_address, w.fee,
  w.approved_at AS completed_at
FROM withdrawals w LEFT JOIN assets a ON w.asset_id = a.id;

-- badge_commission_health
DROP VIEW IF EXISTS public.badge_commission_health;
CREATE VIEW public.badge_commission_health WITH (security_invoker = true) AS
SELECT ubh.user_id, ubh.current_badge, ubh.price_bsk, ubh.purchased_at,
  rt.ancestor_id AS sponsor_id,
  CASE WHEN rt.ancestor_id IS NULL THEN 'NO_SPONSOR'
       WHEN rc.id IS NULL THEN 'MISSING_COMMISSION' ELSE 'OK' END AS status,
  rc.bsk_amount AS commission_paid, (ubh.price_bsk * 0.10) AS expected_commission
FROM user_badge_holdings ubh
LEFT JOIN referral_tree rt ON rt.user_id = ubh.user_id AND rt.level = 1
LEFT JOIN referral_commissions rc ON rc.payer_id = ubh.user_id AND rc.commission_type = 'badge_subscription'
WHERE ubh.purchased_at IS NOT NULL AND ubh.price_bsk > 0
ORDER BY ubh.purchased_at DESC;

-- referral_relationships
DROP VIEW IF EXISTS public.referral_relationships;
CREATE VIEW public.referral_relationships WITH (security_invoker = true) AS
SELECT p1.user_id AS referee_id, p1.username AS referee_username, p1.referral_code AS referee_code,
  rl.sponsor_id, p2.username AS sponsor_username, p2.referral_code AS sponsor_code,
  rl.sponsor_code_used, rl.locked_at, rl.first_touch_at, rl.source
FROM referral_links_new rl
JOIN profiles p1 ON rl.user_id = p1.user_id
LEFT JOIN profiles p2 ON rl.sponsor_id = p2.user_id;

-- kyc_admin_summary
DROP VIEW IF EXISTS public.kyc_admin_summary;
CREATE VIEW public.kyc_admin_summary WITH (security_invoker = true) AS
SELECT DISTINCT ON (kp.user_id) kp.id, kp.user_id, kp.level, kp.status, kp.data_json,
  kp.full_name_computed, kp.email_computed, kp.phone_computed,
  kp.submitted_at, kp.reviewed_at, kp.reviewer_id, kp.rejection_reason,
  kp.review_notes, kp.created_at, kp.updated_at,
  p.email AS profile_email, p.display_name, p.username
FROM kyc_profiles_new kp LEFT JOIN profiles p ON p.user_id = kp.user_id
WHERE kp.status NOT IN ('none', 'draft')
ORDER BY kp.user_id,
  CASE WHEN kp.status = 'submitted' THEN 1 WHEN kp.status = 'pending' THEN 2
       WHEN kp.status = 'in_review' THEN 3 WHEN kp.status = 'rejected' THEN 4
       WHEN kp.status = 'approved' THEN 5 ELSE 6 END,
  kp.submitted_at DESC NULLS LAST;

-- unified_bsk_transactions
DROP VIEW IF EXISTS public.unified_bsk_transactions;
CREATE VIEW public.unified_bsk_transactions WITH (security_invoker = true) AS
SELECT id, user_id, created_at, abs(amount_bsk) AS amount, balance_type,
  tx_type AS transaction_type, tx_subtype AS transaction_subtype,
  (SELECT COALESCE(sum(CASE WHEN sub.tx_type = 'credit' THEN sub.amount_bsk ELSE -sub.amount_bsk END), 0)
   FROM unified_bsk_ledger sub
   WHERE sub.user_id = l.user_id AND sub.balance_type = l.balance_type AND sub.created_at <= l.created_at) AS balance_after,
  CASE
    WHEN tx_subtype = 'transfer_in' THEN 'Received from ' || COALESCE(meta_json->>'sender_name', 'User')
    WHEN tx_subtype = 'transfer_out' THEN 'Sent to ' || COALESCE(meta_json->>'recipient_name', 'User')
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
  COALESCE(meta_json->>'sender_name', meta_json->>'recipient_name', meta_json->>'admin_email') AS sender_recipient,
  related_user_id,
  idempotency_key AS reference_id, idempotency_key AS transaction_id,
  meta_json AS metadata, notes, status,
  (tx_type = 'credit') AS is_credit,
  CASE WHEN tx_subtype = 'transfer_out' THEN user_id
       WHEN tx_subtype = 'transfer_in' THEN related_user_id
       WHEN tx_subtype IN ('admin_credit','admin_debit') THEN (meta_json->>'admin_user_id')::uuid
       ELSE user_id END AS from_user_id,
  CASE WHEN tx_subtype = 'transfer_out' THEN related_user_id
       WHEN tx_subtype = 'transfer_in' THEN user_id
       WHEN tx_subtype IN ('admin_credit','admin_debit') THEN user_id
       ELSE NULL::uuid END AS to_user_id,
  CASE WHEN tx_subtype IN ('transfer_in','transfer_out') THEN 'user_to_user'
       WHEN tx_subtype = 'admin_credit' THEN 'admin_to_user'
       WHEN tx_subtype = 'admin_debit' THEN 'user_to_admin'
       WHEN tx_subtype IN ('referral_commission_l1','referral_commission_multi') THEN 'referral_reward'
       WHEN tx_subtype IN ('spin_win','spin_bet') THEN 'spin_wheel'
       WHEN tx_subtype IN ('badge_purchase','badge_upgrade','badge_bonus') THEN 'badge_system'
       WHEN tx_subtype IN ('loan_disbursement','loan_repayment','loan_processing_fee') THEN 'loan'
       WHEN tx_subtype IN ('staking_payout','insurance_payout','vip_milestone_reward') THEN 'reward'
       WHEN tx_subtype IN ('one_time_purchase','one_time_purchase_bonus','one_time_purchase_refund') THEN 'purchase'
       WHEN tx_subtype IN ('onchain_migration','migration_refund') THEN 'migration'
       ELSE 'system' END AS transfer_category,
  created_by
FROM unified_bsk_ledger l
ORDER BY created_at DESC;

-- 1C. Fix all functions without search_path
ALTER FUNCTION public.auto_disable_bsk_transfers_on_offer() SET search_path = public;
ALTER FUNCTION public.auto_disable_expired_offers() SET search_path = public;
ALTER FUNCTION public.create_kyc_admin_notification() SET search_path = public;
ALTER FUNCTION public.credit_custodial_deposit(uuid) SET search_path = public;
ALTER FUNCTION public.find_users_missing_referral_tree() SET search_path = public;
ALTER FUNCTION public.get_program_flag(text) SET search_path = public;
ALTER FUNCTION public.get_program_flags() SET search_path = public;
ALTER FUNCTION public.initialize_program_milestones(uuid, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.prevent_banking_updates() SET search_path = public;
ALTER FUNCTION public.sync_kyc_approval_status() SET search_path = public;
ALTER FUNCTION public.unlock_banking_details(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_escrow_updated_at() SET search_path = public;
ALTER FUNCTION public.update_migration_settings_timestamp() SET search_path = public;
ALTER FUNCTION public.update_onchain_tx_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.upsert_program_flag(text, boolean) SET search_path = public;
ALTER FUNCTION public.validate_badge_purchase_kyc() SET search_path = public;
