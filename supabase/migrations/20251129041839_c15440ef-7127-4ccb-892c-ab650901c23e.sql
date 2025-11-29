-- Manual VIP Milestone Credit: 10,000 BSK for 10 VIP milestone
-- Users: nuelglobal1@gmail.com (5e7cb72d-b256-4442-b08c-1fcc520c7a79) and rrama94338@gmail.com (bd0cb96d-a31c-4367-9a15-e95ceb6fe1bb)
-- Milestone ID: d8ed6ea2-c4b7-4225-9f58-e7ade60b8804 (10 VIPs = 10,000 BSK)

-- 1. Insert ledger entries for both users
INSERT INTO bsk_withdrawable_ledger (
  user_id, idempotency_key, tx_type, tx_subtype, 
  amount_bsk, amount_inr, rate_snapshot, balance_before, balance_after, metadata
)
VALUES 
  ('5e7cb72d-b256-4442-b08c-1fcc520c7a79', 
   'manual_vip_milestone_10_nuelglobal1', 'credit', 'vip_milestone_reward',
   10000, 10000, 1.0, 0, 10000,
   '{"milestone_id": "d8ed6ea2-c4b7-4225-9f58-e7ade60b8804", "vip_count": 10, "manual_credit": true, "reason": "Retroactive credit for 10 VIP milestone"}'::jsonb),
  ('bd0cb96d-a31c-4367-9a15-e95ceb6fe1bb', 
   'manual_vip_milestone_10_rrama94338', 'credit', 'vip_milestone_reward',
   10000, 10000, 1.0, 0, 10000,
   '{"milestone_id": "d8ed6ea2-c4b7-4225-9f58-e7ade60b8804", "vip_count": 10, "manual_credit": true, "reason": "Retroactive credit for 10 VIP milestone"}'::jsonb);

-- 2. Create/update BSK balance records
INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
VALUES 
  ('5e7cb72d-b256-4442-b08c-1fcc520c7a79', 10000, 10000),
  ('bd0cb96d-a31c-4367-9a15-e95ceb6fe1bb', 10000, 10000)
ON CONFLICT (user_id) DO UPDATE SET
  withdrawable_balance = user_bsk_balances.withdrawable_balance + 10000,
  total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + 10000,
  updated_at = NOW();

-- 3. Record milestone claims
INSERT INTO user_vip_milestone_claims (
  user_id, milestone_id, vip_count_at_claim, bsk_rewarded, claimed_at
)
VALUES 
  ('5e7cb72d-b256-4442-b08c-1fcc520c7a79', 'd8ed6ea2-c4b7-4225-9f58-e7ade60b8804', 10, 10000, NOW()),
  ('bd0cb96d-a31c-4367-9a15-e95ceb6fe1bb', 'd8ed6ea2-c4b7-4225-9f58-e7ade60b8804', 10, 10000, NOW());