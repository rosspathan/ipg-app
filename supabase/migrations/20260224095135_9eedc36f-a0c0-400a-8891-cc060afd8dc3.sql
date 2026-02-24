
-- Create admin_auth_nonces table for persistent nonce storage
CREATE TABLE IF NOT EXISTS public.admin_auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_admin_auth_nonces_expires 
  ON public.admin_auth_nonces(expires_at) WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE public.admin_auth_nonces ENABLE ROW LEVEL SECURITY;

-- No client access - only service role (edge functions) can access
-- No policies needed since service role bypasses RLS
