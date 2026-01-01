-- Create encrypted wallet backups table
CREATE TABLE public.encrypted_wallet_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.encrypted_wallet_backups ENABLE ROW LEVEL SECURITY;

-- Users can only read their own backup
CREATE POLICY "Users can view own backup"
ON public.encrypted_wallet_backups
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own backup
CREATE POLICY "Users can create own backup"
ON public.encrypted_wallet_backups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own backup
CREATE POLICY "Users can update own backup"
ON public.encrypted_wallet_backups
FOR UPDATE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_encrypted_wallet_backups_updated_at
BEFORE UPDATE ON public.encrypted_wallet_backups
FOR EACH ROW
EXECUTE FUNCTION public.update_avatar_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_encrypted_wallet_backups_user_id ON public.encrypted_wallet_backups(user_id);

COMMENT ON TABLE public.encrypted_wallet_backups IS 'Stores AES-256-GCM encrypted wallet seed phrases. Server never sees plaintext - encryption/decryption happens client-side using user PIN.';