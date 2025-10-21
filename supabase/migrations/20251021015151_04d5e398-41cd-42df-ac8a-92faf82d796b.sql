-- =====================================================
-- SECURITY FIX: Add missing RLS policy for user_role_audit
-- =====================================================

-- user_role_audit should be admin-only for viewing
DROP POLICY IF EXISTS "Admin can view role audit" ON public.user_role_audit;
DROP POLICY IF EXISTS "System can insert role audit" ON public.user_role_audit;

CREATE POLICY "Admin can view role audit"
  ON public.user_role_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert role audit"
  ON public.user_role_audit FOR INSERT
  WITH CHECK (true);