-- Add policy to allow users to view their own roles (fixes circular dependency)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);