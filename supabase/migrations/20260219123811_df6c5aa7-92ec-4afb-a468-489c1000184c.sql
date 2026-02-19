
-- 1. FIX: Custodial Deposits - replace permissive INSERT/UPDATE with admin-only
DROP POLICY IF EXISTS "Service role can insert custodial deposits" ON public.custodial_deposits;
DROP POLICY IF EXISTS "Service role can update custodial deposits" ON public.custodial_deposits;

CREATE POLICY "Admin can insert custodial deposits"
  ON public.custodial_deposits FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update custodial deposits"
  ON public.custodial_deposits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. FIX: KYC bucket - make private
UPDATE storage.buckets SET public = false WHERE id = 'kyc';

-- Drop any "Public read" policy on kyc bucket
DROP POLICY IF EXISTS "Public read KYC objects" ON storage.objects;

-- 3. FIX: support_messages - already properly scoped (users see own ticket messages, admin sees all)
-- No changes needed - policies are correct

-- 4. FIX: RLS Enabled No Policy - bsk_onchain_migration_batches
CREATE POLICY "Admin can manage migration batches"
  ON public.bsk_onchain_migration_batches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
