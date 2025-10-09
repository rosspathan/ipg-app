-- Drop the unique wallet address constraint from profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_wallet_address;

-- Create user_wallets table for secure wallet storage
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE,
  encrypted_mnemonic TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Users can only view their own wallet
CREATE POLICY "Users can view own wallet"
  ON public.user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can create wallets during signup
CREATE POLICY "System can create wallets"
  ON public.user_wallets
  FOR INSERT
  WITH CHECK (true);

-- Users can update last_used_at
CREATE POLICY "Users can update own wallet usage"
  ON public.user_wallets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON public.user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);

-- Add audit logging for wallet modifications
CREATE OR REPLACE FUNCTION log_wallet_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      new_values,
      created_at
    ) VALUES (
      NEW.user_id,
      'wallet_created',
      'user_wallets',
      NEW.id::text,
      jsonb_build_object('wallet_address', NEW.wallet_address),
      now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      NEW.user_id,
      'wallet_updated',
      'user_wallets',
      NEW.id::text,
      jsonb_build_object('last_used_at', OLD.last_used_at),
      jsonb_build_object('last_used_at', NEW.last_used_at),
      now()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_wallet_changes
  AFTER INSERT OR UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION log_wallet_modification();