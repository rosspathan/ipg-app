
-- 1. Fix login_history: restrict SELECT to owner + admin only
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
DROP POLICY IF EXISTS "Anyone can view login history" ON public.login_history;
DROP POLICY IF EXISTS "Public can view login history" ON public.login_history;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.login_history;

-- Ensure RLS is enabled
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin SELECT
CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Revoke anon access
REVOKE SELECT ON public.login_history FROM anon;

-- 2. Fix profiles_public: revoke anon access to the view
REVOKE SELECT ON public.profiles_public FROM anon;

-- Grant only to authenticated
GRANT SELECT ON public.profiles_public TO authenticated;
