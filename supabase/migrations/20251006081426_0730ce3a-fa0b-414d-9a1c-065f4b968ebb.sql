-- Fix search_path security issue for avatar updated_at function
DROP FUNCTION IF EXISTS public.update_avatar_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_avatar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_user_avatars_new_updated_at
  BEFORE UPDATE ON public.user_avatars_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_avatar_updated_at();