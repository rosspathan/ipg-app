
-- Fix the incorrect refund: The first migration was completed on-chain (tx 0xe307887c39...)
-- but a refund was incorrectly issued. We need to reverse this refund.
-- This is a correction entry to fix the balance discrepancy.

INSERT INTO unified_bsk_ledger (
  user_id,
  tx_type,
  tx_subtype,
  balance_type,
  amount_bsk,
  notes,
  meta_json,
  status,
  idempotency_key
) VALUES (
  '74852950-2a85-4079-8d28-877e561c255a',
  'debit',
  'migration_refund_reversal',
  'withdrawable',
  100.00000000,
  'Reversal of incorrect migration refund - first migration (tx 0xe307887c39...) completed on-chain successfully but was incorrectly refunded',
  '{"correction_reason": "Migration completed on-chain but refund was issued in error", "original_refund_id": "194256ad-3f8e-4e5f-9b1b-72db670857b7", "related_tx_hash": "0xe307887c396ece9e93a467217cafdbe7d90cca00b988200309311a04229886e7"}'::jsonb,
  'completed',
  'refund_reversal_' || gen_random_uuid()::text
);
