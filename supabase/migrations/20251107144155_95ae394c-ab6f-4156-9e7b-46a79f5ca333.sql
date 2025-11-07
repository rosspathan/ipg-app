-- Grant admin role to rosspathan@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('63f85e16-73e8-4a8d-aafa-b23611e7cb61', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;