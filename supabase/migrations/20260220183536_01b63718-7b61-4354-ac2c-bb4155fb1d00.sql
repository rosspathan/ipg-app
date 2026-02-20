
-- Restrict profiles_public view to authenticated users only
-- Currently it's publicly readable (anon role), exposing PII to anyone

-- Revoke public/anon access to the profiles_public view
REVOKE SELECT ON public.profiles_public FROM anon;

-- Ensure authenticated users can still read it
GRANT SELECT ON public.profiles_public TO authenticated;
