-- Write Scratch Card hot wallet public address to config (campaign stays disabled)
UPDATE public.scratch_card_config
SET scratch_wallet_address = '0x3fb549676a60dfbaf71846dc1a49ea9f2374f93b',
    updated_at = now();

-- Register the dedicated Scratch Card hot wallet via the audited migration path.
-- platform_hot_wallet blocks direct INSERT via a security trigger; disable only for this audited insert.
ALTER TABLE public.platform_hot_wallet DISABLE TRIGGER trg_block_hot_wallet_insert;

INSERT INTO public.platform_hot_wallet (address, chain, label, purpose, is_active)
SELECT '0x3fb549676a60dfbaf71846dc1a49ea9f2374f93b', 'BSC', 'Scratch Card Hot Wallet', 'scratch_card', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_hot_wallet
  WHERE lower(address) = lower('0x3fb549676a60dfbaf71846dc1a49ea9f2374f93b')
);

ALTER TABLE public.platform_hot_wallet ENABLE TRIGGER trg_block_hot_wallet_insert;