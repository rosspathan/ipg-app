DROP POLICY IF EXISTS "Users can create own loan applications" ON public.bsk_loans;
CREATE POLICY "Users can create own loan applications" ON public.bsk_loans
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_at IS NULL AND approved_by IS NULL
  AND disbursed_at IS NULL AND disbursed_by IS NULL
  AND closed_at IS NULL
  AND COALESCE(paid_bsk,0) = 0
);