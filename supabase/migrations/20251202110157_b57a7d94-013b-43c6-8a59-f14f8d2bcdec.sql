-- Add 'kyc_approval_reward' to allowed operation types for bsk_admin_operations
ALTER TABLE public.bsk_admin_operations 
DROP CONSTRAINT IF EXISTS bsk_admin_operations_operation_type_check;

ALTER TABLE public.bsk_admin_operations 
ADD CONSTRAINT bsk_admin_operations_operation_type_check 
CHECK (operation_type IN (
  'credit',
  'debit',
  'mint',
  'burn',
  'withdrawal',
  'transfer',
  'kyc_approval_reward',
  'admin_adjustment'
));