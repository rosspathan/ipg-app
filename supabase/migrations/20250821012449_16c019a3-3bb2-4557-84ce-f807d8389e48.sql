-- Add admin role to current authenticated user if none exists
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get the current authenticated user ID
    SELECT auth.uid() INTO current_user_id;
    
    -- If there's an authenticated user and no admin exists, make them admin
    IF current_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
        INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
        VALUES (current_user_id, 'admin', current_user_id, now());
    END IF;
END
$$;