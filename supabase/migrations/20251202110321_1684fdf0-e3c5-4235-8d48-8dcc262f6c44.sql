-- Fix kyc_audit_log foreign key to reference correct table
ALTER TABLE IF EXISTS public.kyc_audit_log 
DROP CONSTRAINT IF EXISTS kyc_audit_log_submission_id_fkey;

ALTER TABLE IF EXISTS public.kyc_audit_log
ADD CONSTRAINT kyc_audit_log_submission_id_fkey 
FOREIGN KEY (submission_id) 
REFERENCES public.kyc_profiles_new(id) 
ON DELETE CASCADE;