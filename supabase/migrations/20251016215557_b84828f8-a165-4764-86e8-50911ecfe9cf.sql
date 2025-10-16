-- Just create tables if they don't exist (function already exists)

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    assigned_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND policyname = 'Admins can view all roles'
    ) THEN
        CREATE POLICY "Admins can view all roles"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND policyname = 'Only admins can grant roles'
    ) THEN
        CREATE POLICY "Only admins can grant roles"
        ON public.user_roles
        FOR INSERT
        TO authenticated
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_role_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    action text NOT NULL,
    performed_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;