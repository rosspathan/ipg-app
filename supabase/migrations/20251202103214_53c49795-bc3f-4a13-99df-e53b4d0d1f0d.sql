-- Fix admin_notifications.type check constraint to allow 'kyc_submission'

ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_type_check 
CHECK (type = ANY (ARRAY[
  'bsk_transfer'::text,
  'user_signup'::text,
  'kyc_approval'::text,
  'kyc_rejection'::text,
  'system'::text,
  'kyc_submission'::text  -- NEW: Added for KYC submission notifications
]));