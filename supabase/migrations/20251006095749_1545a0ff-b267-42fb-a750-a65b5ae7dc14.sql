-- Create table to track BSK release history
CREATE TABLE IF NOT EXISTS public.bsk_release_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_released NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  holding_before NUMERIC NOT NULL,
  withdrawable_before NUMERIC NOT NULL,
  holding_after NUMERIC NOT NULL,
  withdrawable_after NUMERIC NOT NULL,
  released_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.bsk_release_history ENABLE ROW LEVEL SECURITY;

-- Admin can manage release history
CREATE POLICY "Admin can manage release history"
  ON public.bsk_release_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own release history
CREATE POLICY "Users can view own release history"
  ON public.bsk_release_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bsk_release_history_user_id ON public.bsk_release_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bsk_release_history_created_at ON public.bsk_release_history(created_at DESC);