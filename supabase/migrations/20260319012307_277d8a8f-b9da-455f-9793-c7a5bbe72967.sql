ALTER TABLE public.bsk_onchain_migrations DROP CONSTRAINT IF EXISTS bsk_onchain_migrations_status_check;

ALTER TABLE public.bsk_onchain_migrations ADD CONSTRAINT bsk_onchain_migrations_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'pending_admin_approval'::text, 'approved_executing'::text, 'validating'::text, 'debiting'::text, 'signing'::text, 'broadcasting'::text, 'confirming'::text, 'completed'::text, 'rejected'::text, 'failed'::text, 'rolled_back'::text]));

ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS rejected_by uuid;
ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.bsk_onchain_migrations ADD COLUMN IF NOT EXISTS admin_approval_note text;