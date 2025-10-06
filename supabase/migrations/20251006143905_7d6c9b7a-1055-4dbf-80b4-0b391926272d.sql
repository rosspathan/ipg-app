-- Update existing profiles to use email username where full_name is null or 'User'
UPDATE public.profiles
SET 
  full_name = split_part(email, '@', 1),
  updated_at = now()
WHERE (full_name IS NULL OR full_name = '' OR full_name = 'User')
  AND email IS NOT NULL;