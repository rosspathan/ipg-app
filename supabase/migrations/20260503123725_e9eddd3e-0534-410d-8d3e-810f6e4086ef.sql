
DROP VIEW IF EXISTS public.kyc_admin_config_public;

CREATE POLICY "Authenticated users can view KYC config"
ON public.kyc_admin_config
FOR SELECT
TO authenticated
USING (true);
