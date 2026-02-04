-- Add RLS policy for admins to view all BSK on-chain migrations
CREATE POLICY "Admin can view all migrations" ON public.bsk_onchain_migrations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update migrations (for admin notes, status updates)
CREATE POLICY "Admin can update migrations" ON public.bsk_onchain_migrations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));