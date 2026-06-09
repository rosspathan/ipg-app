ALTER FUNCTION public.sync_ibt_from_custodial_deposit() SET search_path = public;
ALTER FUNCTION public.sync_ibt_from_custodial_withdrawal() SET search_path = public;
ALTER FUNCTION public.kyc_audit_forbid_mutation() SET search_path = public;
ALTER FUNCTION public.kyc_extract_storage_path(text, text) SET search_path = public;
