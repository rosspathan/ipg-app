ALTER TABLE public.onchain_transactions DROP CONSTRAINT IF EXISTS onchain_transactions_source_check;
ALTER TABLE public.onchain_transactions ADD CONSTRAINT onchain_transactions_source_check
  CHECK (source = ANY (ARRAY['ONCHAIN'::text, 'INTERNAL'::text, 'MANUAL'::text, 'scratch_card_reward'::text]));