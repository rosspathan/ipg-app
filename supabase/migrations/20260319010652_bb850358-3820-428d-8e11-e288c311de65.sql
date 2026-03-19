
-- Add admin approval columns to bsk_onchain_migrations
ALTER TABLE public.bsk_onchain_migrations 
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS admin_approval_note text;

-- Add per_user_daily_limit_bsk and max_per_request to settings if not exists
ALTER TABLE public.bsk_migration_settings
  ADD COLUMN IF NOT EXISTS max_per_request_bsk numeric DEFAULT 50000;
