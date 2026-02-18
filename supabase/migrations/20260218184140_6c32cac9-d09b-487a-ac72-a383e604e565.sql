
-- Create login_history table to track all login events with IP and geolocation
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow edge functions (service role) to insert
CREATE POLICY "Service role can insert login history"
  ON public.login_history FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_login_history_user_id ON public.login_history (user_id);
CREATE INDEX idx_login_history_created_at ON public.login_history (created_at DESC);
