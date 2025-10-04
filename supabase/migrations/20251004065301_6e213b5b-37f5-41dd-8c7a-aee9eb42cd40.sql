-- Mobile Linking Settings (Admin-controlled)
CREATE TABLE IF NOT EXISTS public.mobile_linking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL DEFAULT 'https://i-smartapp.com',
  ref_base_path text NOT NULL DEFAULT '/r',
  capture_stage text NOT NULL DEFAULT 'after_email_verify',
  lock_policy text NOT NULL DEFAULT 'email_verified',
  allow_sponsor_change_before_lock boolean NOT NULL DEFAULT false,
  self_referral_block boolean NOT NULL DEFAULT true,
  code_length integer NOT NULL DEFAULT 8,
  android_package_name_release text,
  sha256_fingerprints_release text[] DEFAULT '{}',
  android_package_name_debug text,
  sha256_fingerprints_debug text[] DEFAULT '{}',
  custom_scheme text NOT NULL DEFAULT 'ismart',
  play_store_fallback_url text,
  whatsapp_template text NOT NULL DEFAULT 'Join me on IPG I-SMART! Use my link: {{link}} 🚀',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_capture_stage CHECK (capture_stage IN ('on_first_open', 'after_email_verify', 'after_wallet_create')),
  CONSTRAINT valid_lock_policy CHECK (lock_policy IN ('email_verified', 'first_touch_wins', 'wallet_created')),
  CONSTRAINT valid_code_length CHECK (code_length BETWEEN 6 AND 10)
);

-- Referral Codes (user-specific short codes)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_safe_charset CHECK (code ~ '^[A-HJ-NP-Z2-9]+$')
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- Update referral_links_new to support locking
ALTER TABLE public.referral_links_new 
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS capture_stage text;

-- RLS Policies
ALTER TABLE public.mobile_linking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "Admin can manage mobile linking settings"
  ON public.mobile_linking_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can read settings (needed for public link resolution)
CREATE POLICY "Everyone can read mobile linking settings"
  ON public.mobile_linking_settings
  FOR SELECT
  USING (true);

-- Users can view their own codes
CREATE POLICY "Users can view own referral codes"
  ON public.referral_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can create codes
CREATE POLICY "System can create referral codes"
  ON public.referral_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all codes
CREATE POLICY "Admin can view all referral codes"
  ON public.referral_codes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate safe referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(code_length integer DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude O,0,I,1
  result text := '';
  i integer;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..code_length LOOP
      result := result || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Function to get or create referral code for user
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code text;
  new_code text;
  settings_code_length integer;
BEGIN
  -- Check if user already has a code
  SELECT code INTO existing_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Get configured code length
  SELECT code_length INTO settings_code_length
  FROM public.mobile_linking_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  settings_code_length := COALESCE(settings_code_length, 8);
  
  -- Generate new code
  new_code := public.generate_referral_code(settings_code_length);
  
  -- Insert new code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, new_code);
  
  RETURN new_code;
END;
$$;

-- Insert default settings
INSERT INTO public.mobile_linking_settings (
  host, ref_base_path, capture_stage, lock_policy,
  allow_sponsor_change_before_lock, self_referral_block,
  code_length, custom_scheme, whatsapp_template
) VALUES (
  'https://i-smartapp.com', '/r', 'after_email_verify', 'email_verified',
  false, true, 8, 'ismart',
  'Join me on IPG I-SMART! Use my link: {{link}} 🚀'
) ON CONFLICT DO NOTHING;