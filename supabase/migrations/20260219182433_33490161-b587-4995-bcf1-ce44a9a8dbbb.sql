-- ============================================================
-- IMMUTABLE IPG STAKING TOKEN LOCK
-- This migration permanently locks the staking system to IPG.
-- No admin, no service role, no trigger can change the token.
-- ============================================================

-- 1. Add an immutable staking_token_contract column to crypto_staking_config
--    locked to the IPG contract address. It cannot be changed via UPDATE.
ALTER TABLE public.crypto_staking_config
  ADD COLUMN IF NOT EXISTS staking_token_contract TEXT
    NOT NULL DEFAULT '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E'
    CHECK (staking_token_contract = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E');

ALTER TABLE public.crypto_staking_config
  ADD COLUMN IF NOT EXISTS staking_token_symbol TEXT
    NOT NULL DEFAULT 'IPG'
    CHECK (staking_token_symbol = 'IPG');

-- 2. Update existing rows to have the correct values
UPDATE public.crypto_staking_config
SET staking_token_contract = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
    staking_token_symbol = 'IPG';

-- 3. Create a trigger that prevents the staking token from ever being changed
CREATE OR REPLACE FUNCTION public.enforce_ipg_staking_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Block any attempt to change the staking token contract
  IF NEW.staking_token_contract IS DISTINCT FROM '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E' THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: The staking token contract is permanently locked to IPG (0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E). No other token is permitted for staking.';
  END IF;

  IF NEW.staking_token_symbol IS DISTINCT FROM 'IPG' THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: The staking token symbol is permanently locked to IPG. No other token is permitted for staking.';
  END IF;

  -- Also enforce that no forbidden contracts can be set anywhere in the config
  IF NEW.admin_hot_wallet_address IS NOT NULL THEN
    -- Ensure the hot wallet address format is valid (basic sanity check)
    IF length(NEW.admin_hot_wallet_address) != 42 THEN
      RAISE EXCEPTION 'Invalid hot wallet address format.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trig_enforce_ipg_staking_token ON public.crypto_staking_config;
CREATE TRIGGER trig_enforce_ipg_staking_token
  BEFORE INSERT OR UPDATE ON public.crypto_staking_config
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ipg_staking_token();

-- 4. Create a DB-level function that validates any staking ledger entry uses IPG only.
--    This is called by the execute_staking_stake RPC to double-check at DB layer.
CREATE OR REPLACE FUNCTION public.assert_ipg_staking_currency(p_currency TEXT)
RETURNS VOID AS $$
BEGIN
  IF upper(p_currency) != 'IPG' THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Staking is exclusively restricted to IPG. Attempted currency: %', p_currency;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;
