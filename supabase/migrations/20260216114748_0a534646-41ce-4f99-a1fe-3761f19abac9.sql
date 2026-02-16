
-- #8: Add activation delay to allowlist_addresses
ALTER TABLE public.allowlist_addresses 
ADD COLUMN IF NOT EXISTS activated_at timestamptz,
ADD COLUMN IF NOT EXISTS activation_delay_hours int DEFAULT 24;

-- Set existing addresses as already activated
UPDATE public.allowlist_addresses 
SET activated_at = created_at 
WHERE activated_at IS NULL;

-- #10: Failed matches table for retry mechanism
CREATE TABLE IF NOT EXISTS public.failed_match_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_order_id uuid NOT NULL,
  sell_order_id uuid NOT NULL,
  symbol text NOT NULL,
  error_message text,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz DEFAULT now() + interval '5 minutes',
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.failed_match_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only" ON public.failed_match_attempts
  FOR ALL USING (false);

CREATE INDEX idx_failed_matches_pending ON public.failed_match_attempts (resolved, next_retry_at) WHERE NOT resolved;
