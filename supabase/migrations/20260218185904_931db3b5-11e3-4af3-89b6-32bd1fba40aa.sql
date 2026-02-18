
-- Add geolocation columns to login_history
ALTER TABLE public.login_history 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS isp TEXT;

-- Add index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
