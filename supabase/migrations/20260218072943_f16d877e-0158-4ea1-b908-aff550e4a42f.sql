
-- Drop the constraint (not index) first
ALTER TABLE public.onchain_transactions DROP CONSTRAINT IF EXISTS unique_onchain_tx;

-- Recreate as a unique index with COALESCE to handle NULL log_index
CREATE UNIQUE INDEX unique_onchain_tx ON public.onchain_transactions (tx_hash, COALESCE(log_index, 0), user_id, direction);
