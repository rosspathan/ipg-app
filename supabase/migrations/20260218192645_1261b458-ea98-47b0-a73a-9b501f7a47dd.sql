-- Revoke admin access from unauthorized accounts
DELETE FROM public.user_roles 
WHERE user_id IN (
  '34a9041c-2cdf-4404-9d25-d44e3555d93d',  -- admin@ipg-app.com
  '63f85e16-73e8-4a8d-aafa-b23611e7cb61'   -- unknown encoded email
) AND role = 'admin';