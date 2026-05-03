
INSERT INTO public.system_settings (key, value, description)
VALUES ('bsc_required_confirmations', '3', 'Confirmations required to credit BSC custodial deposits')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

UPDATE public.custodial_deposits
SET required_confirmations = 3, updated_at = now()
WHERE status IN ('pending','confirmed') AND required_confirmations > 3;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='custodial_deposits_tx_hash_uniq') THEN
    CREATE UNIQUE INDEX custodial_deposits_tx_hash_uniq ON public.custodial_deposits (lower(tx_hash));
  END IF;
END $$;

ALTER TABLE public.custodial_deposits ADD COLUMN IF NOT EXISTS linked_internal_transfer_id uuid;
ALTER TABLE public.internal_balance_transfers ADD COLUMN IF NOT EXISTS linked_deposit_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ibt_tx_hash_to_trading_uniq') THEN
    CREATE UNIQUE INDEX ibt_tx_hash_to_trading_uniq
      ON public.internal_balance_transfers (lower(tx_hash))
      WHERE tx_hash IS NOT NULL AND direction = 'to_trading';
  END IF;
END $$;

ALTER TABLE public.platform_hot_wallet ADD COLUMN IF NOT EXISTS purpose text;

ALTER TABLE public.platform_hot_wallet DISABLE TRIGGER USER;
UPDATE public.platform_hot_wallet
SET purpose = 'trading'
WHERE chain = 'BSC' AND is_active = true AND label ILIKE '%Trading%';
ALTER TABLE public.platform_hot_wallet ENABLE TRIGGER USER;
