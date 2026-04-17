-- Create blocked wallet addresses table
CREATE TABLE IF NOT EXISTS public.blocked_wallet_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  block_scope TEXT NOT NULL DEFAULT 'all' CHECK (block_scope IN ('all','deposits','withdrawals','allowlist','beneficiary')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  blocked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_wallet_addr_active ON public.blocked_wallet_addresses(wallet_address) WHERE is_active = true;

-- Normalize address to lowercase on insert/update
CREATE OR REPLACE FUNCTION public.normalize_blocked_wallet_addr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.wallet_address := LOWER(TRIM(NEW.wallet_address));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_blocked_wallet ON public.blocked_wallet_addresses;
CREATE TRIGGER trg_normalize_blocked_wallet
BEFORE INSERT OR UPDATE ON public.blocked_wallet_addresses
FOR EACH ROW EXECUTE FUNCTION public.normalize_blocked_wallet_addr();

-- Enable RLS — admin only
ALTER TABLE public.blocked_wallet_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blocklist"
ON public.blocked_wallet_addresses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert blocklist"
ON public.blocked_wallet_addresses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blocklist"
ON public.blocked_wallet_addresses FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blocklist"
ON public.blocked_wallet_addresses FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper function: is address blocked for a given scope?
CREATE OR REPLACE FUNCTION public.is_wallet_blocked(_address TEXT, _scope TEXT DEFAULT 'all')
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_wallet_addresses
    WHERE wallet_address = LOWER(TRIM(_address))
      AND is_active = true
      AND (block_scope = 'all' OR block_scope = _scope)
  );
$$;

-- Enforcement trigger function (generic by column name)
CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_allowlist()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.address, 'allowlist') THEN
    RAISE EXCEPTION 'Wallet address % is blocked by admin policy', NEW.address USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_beneficiary()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.address, 'beneficiary') THEN
    RAISE EXCEPTION 'Wallet address % is blocked by admin policy', NEW.address USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_cust_withdraw()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.to_address, 'withdrawals') THEN
    RAISE EXCEPTION 'Withdrawal destination % is blocked by admin policy', NEW.to_address USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_bsk_withdraw()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.crypto_address, 'withdrawals') THEN
    RAISE EXCEPTION 'BSK withdrawal destination % is blocked by admin policy', NEW.crypto_address USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_bsk_migration()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.wallet_address, 'withdrawals') THEN
    RAISE EXCEPTION 'BSK migration destination % is blocked by admin policy', NEW.wallet_address USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_wallet_blocklist_cust_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_wallet_blocked(NEW.from_address, 'deposits') THEN
    -- Mark as blocked instead of crediting
    NEW.status := 'blocked';
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, new_values)
    VALUES (NEW.user_id, 'BLOCKED_DEPOSIT_ATTEMPT', 'custodial_deposits', NEW.id::text,
            jsonb_build_object('from_address', NEW.from_address, 'amount', NEW.amount, 'token', NEW.token_symbol));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_block_allowlist ON public.allowlist_addresses;
CREATE TRIGGER trg_block_allowlist
BEFORE INSERT OR UPDATE ON public.allowlist_addresses
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_allowlist();

DROP TRIGGER IF EXISTS trg_block_beneficiary ON public.beneficiaries;
CREATE TRIGGER trg_block_beneficiary
BEFORE INSERT OR UPDATE ON public.beneficiaries
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_beneficiary();

DROP TRIGGER IF EXISTS trg_block_cust_withdraw ON public.custodial_withdrawals;
CREATE TRIGGER trg_block_cust_withdraw
BEFORE INSERT OR UPDATE ON public.custodial_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_cust_withdraw();

DROP TRIGGER IF EXISTS trg_block_bsk_withdraw ON public.bsk_withdrawal_requests;
CREATE TRIGGER trg_block_bsk_withdraw
BEFORE INSERT OR UPDATE ON public.bsk_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_bsk_withdraw();

DROP TRIGGER IF EXISTS trg_block_bsk_migration ON public.bsk_onchain_migrations;
CREATE TRIGGER trg_block_bsk_migration
BEFORE INSERT OR UPDATE ON public.bsk_onchain_migrations
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_bsk_migration();

DROP TRIGGER IF EXISTS trg_block_cust_deposit ON public.custodial_deposits;
CREATE TRIGGER trg_block_cust_deposit
BEFORE INSERT ON public.custodial_deposits
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_blocklist_cust_deposit();

-- Insert the address to block
INSERT INTO public.blocked_wallet_addresses (wallet_address, reason, block_scope, notes)
VALUES (
  '0x670b4f9b0d042b828215272d2a1762613ac78192',
  'Admin forensic block — flagged as suspicious',
  'all',
  'Initial block via admin request. Applies to deposits, withdrawals, allowlist additions, beneficiary saves, BSK withdrawals and BSK migrations.'
) ON CONFLICT (wallet_address) DO UPDATE
SET is_active = true, block_scope = 'all', updated_at = now();