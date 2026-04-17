
-- 1. Insert the block entry for the wallet (scope must be one of: all, deposits, withdrawals, allowlist, beneficiary)
INSERT INTO public.blocked_wallet_addresses (wallet_address, reason, block_scope, is_active, notes)
VALUES (
  lower('0x670b9A012493260ba94d4493DEB83Fe8E24C8192'),
  'User issamchlihat2020@gmail.com — account permanently terminated by admin. Wallet associated with terminated account; new registrations and withdrawals to this address are forbidden.',
  'all',
  true,
  'Blocked on 2026-04-17 alongside full account deletion.'
)
ON CONFLICT (wallet_address) DO UPDATE SET
  is_active = true,
  block_scope = 'all',
  reason = EXCLUDED.reason,
  notes = EXCLUDED.notes,
  updated_at = now();

-- 2. Normalized lookup index (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_wallet_addresses_lower
  ON public.blocked_wallet_addresses (lower(wallet_address))
  WHERE is_active = true;

-- 3. Helper function: case-insensitive blocklist check
CREATE OR REPLACE FUNCTION public.is_wallet_address_blocked(_address text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_wallet_addresses
    WHERE is_active = true
      AND lower(wallet_address) = lower(_address)
  );
$$;

-- 4. Trigger function: reject any record using a blocked address
CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addr text;
  v_table text := TG_TABLE_NAME;
BEGIN
  IF v_table = 'profiles' THEN
    v_addr := NEW.wallet_address;
    IF NEW.bsc_wallet_address IS NOT NULL AND public.is_wallet_address_blocked(NEW.bsc_wallet_address) THEN
      RAISE EXCEPTION 'WALLET_BLOCKED: This wallet address (%) has been blocked by an administrator.', NEW.bsc_wallet_address
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_table = 'custodial_withdrawals' THEN
    v_addr := NEW.to_address;
  ELSIF v_table = 'allowlist_addresses' THEN
    v_addr := NEW.address;
  ELSIF v_table = 'beneficiaries' THEN
    v_addr := NEW.address;
  ELSIF v_table = 'user_wallets' THEN
    v_addr := NEW.wallet_address;
  END IF;

  IF v_addr IS NOT NULL AND public.is_wallet_address_blocked(v_addr) THEN
    RAISE EXCEPTION 'WALLET_BLOCKED: This wallet address (%) has been blocked by an administrator.', v_addr
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach triggers to all wallet-bearing tables
DROP TRIGGER IF EXISTS trg_blocklist_profiles ON public.profiles;
CREATE TRIGGER trg_blocklist_profiles
  BEFORE INSERT OR UPDATE OF wallet_address, bsc_wallet_address ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist();

DROP TRIGGER IF EXISTS trg_blocklist_custodial_withdrawals ON public.custodial_withdrawals;
CREATE TRIGGER trg_blocklist_custodial_withdrawals
  BEFORE INSERT OR UPDATE OF to_address ON public.custodial_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist();

DROP TRIGGER IF EXISTS trg_blocklist_allowlist_addresses ON public.allowlist_addresses;
CREATE TRIGGER trg_blocklist_allowlist_addresses
  BEFORE INSERT OR UPDATE OF address ON public.allowlist_addresses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist();

DROP TRIGGER IF EXISTS trg_blocklist_beneficiaries ON public.beneficiaries;
CREATE TRIGGER trg_blocklist_beneficiaries
  BEFORE INSERT OR UPDATE OF address ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist();

DROP TRIGGER IF EXISTS trg_blocklist_user_wallets ON public.user_wallets;
CREATE TRIGGER trg_blocklist_user_wallets
  BEFORE INSERT OR UPDATE OF wallet_address ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist();
