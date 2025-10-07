-- Update existing profiles to set full_name from email for users with empty/null/default names
UPDATE public.profiles
SET 
  full_name = split_part(email, '@', 1),
  updated_at = now()
WHERE (full_name IS NULL OR full_name = '' OR full_name = 'User')
  AND email IS NOT NULL
  AND email != '';