-- Create password_reset_codes table
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_code ON public.password_reset_codes(code);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own codes
CREATE POLICY "Users can view their own reset codes"
  ON public.password_reset_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (handled via edge functions)
CREATE POLICY "Service role can insert reset codes"
  ON public.password_reset_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update reset codes"
  ON public.password_reset_codes
  FOR UPDATE
  USING (true);