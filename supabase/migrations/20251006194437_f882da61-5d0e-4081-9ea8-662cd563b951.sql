-- Targeted fix: align profile full_name with verified email username for this account
-- Safe, idempotent update limited to the specific user by email
UPDATE public.profiles
SET full_name = split_part(email, '@', 1)
WHERE lower(email) = lower('rosspathan@gmail.com');

-- Optional: also trim spaces just in case
UPDATE public.profiles
SET full_name = trim(full_name)
WHERE lower(email) = lower('rosspathan@gmail.com');