-- Phase 10: Compliance Screens
-- Create user_compliance_acceptances table for tracking all compliance actions
CREATE TABLE public.user_compliance_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  compliance_type TEXT NOT NULL CHECK (compliance_type IN ('risk_disclosure', 'terms_acceptance', 'age_verification')),
  version TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, compliance_type, version)
);

-- Enable RLS
ALTER TABLE public.user_compliance_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own compliance acceptances"
ON public.user_compliance_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can insert own compliance acceptances"
ON public.user_compliance_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can view all acceptances
CREATE POLICY "Admin can view all compliance acceptances"
ON public.user_compliance_acceptances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_compliance_user_type ON public.user_compliance_acceptances(user_id, compliance_type);

-- Regional restrictions table
CREATE TABLE public.regional_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_features JSONB DEFAULT '[]'::jsonb,
  restriction_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_restrictions ENABLE ROW LEVEL SECURITY;

-- Public can view active restrictions
CREATE POLICY "Public can view active restrictions"
ON public.regional_restrictions
FOR SELECT
USING (is_active = true);

-- Admin can manage restrictions
CREATE POLICY "Admin can manage regional restrictions"
ON public.regional_restrictions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Terms versions table
CREATE TABLE public.terms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;

-- Public can view current terms
CREATE POLICY "Public can view terms versions"
ON public.terms_versions
FOR SELECT
USING (true);

-- Admin can manage terms
CREATE POLICY "Admin can manage terms versions"
ON public.terms_versions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add device_fingerprint to devices table
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create index for device fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON public.devices(device_fingerprint);

-- Insert default terms version
INSERT INTO public.terms_versions (version, title, content, effective_from, is_current)
VALUES (
  'v1.0',
  'Terms and Conditions',
  'By using this platform, you agree to comply with all applicable laws and regulations. Trading in cryptocurrencies involves risk and you may lose your entire investment. Please ensure you understand these risks before proceeding.',
  now(),
  true
);

-- Create function to check if user has accepted specific compliance
CREATE OR REPLACE FUNCTION public.has_accepted_compliance(
  p_user_id UUID,
  p_compliance_type TEXT,
  p_version TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_version IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_compliance_acceptances
      WHERE user_id = p_user_id
        AND compliance_type = p_compliance_type
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.user_compliance_acceptances
      WHERE user_id = p_user_id
        AND compliance_type = p_compliance_type
        AND version = p_version
    );
  END IF;
END;
$$;