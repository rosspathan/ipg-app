-- ============================================
-- EMERGENCY FIX: Remove RPC Function Overload Ambiguity
-- ============================================

-- Drop the 8-parameter version of record_bsk_transaction
-- Keep only the comprehensive 10-parameter version
DROP FUNCTION IF EXISTS public.record_bsk_transaction(
  p_user_id uuid,
  p_idempotency_key text,
  p_tx_type text,
  p_tx_subtype text,
  p_balance_type text,
  p_amount_bsk numeric,
  p_related_user_id uuid,
  p_meta_json jsonb
);

-- The 10-parameter version remains:
-- public.record_bsk_transaction(
--   p_user_id uuid,
--   p_idempotency_key text,
--   p_tx_type text,
--   p_tx_subtype text,
--   p_balance_type text,
--   p_amount_bsk numeric,
--   p_notes text,
--   p_meta_json jsonb,
--   p_related_user_id uuid,
--   p_related_transaction_id uuid
-- )

COMMENT ON FUNCTION public.record_bsk_transaction IS 'Atomic BSK transaction recorder - ambiguity resolved by keeping only 10-param version';