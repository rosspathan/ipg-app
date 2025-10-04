-- ════════════════════════════════════════════════════════════════
-- ACCOUNT CENTER: Complete Database Schema (Fixed)
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1) KYC SYSTEM
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kyc_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  required_levels TEXT[] NOT NULL DEFAULT ARRAY['L0', 'L1'],
  level_schemas JSONB NOT NULL DEFAULT '{
    "L0": {
      "fields": {
        "legal_name": {"required": true, "type": "text"},
        "dob": {"required": true, "type": "date"},
        "nationality": {"required": true, "type": "select"},
        "phone": {"required": true, "type": "phone"},
        "country": {"required": true, "type": "select"},
        "state": {"required": false, "type": "text"},
        "city": {"required": true, "type": "text"},
        "postal_code": {"required": true, "type": "text"}
      }
    },
    "L1": {
      "fields": {
        "id_type": {"required": true, "type": "select"},
        "id_number": {"required": true, "type": "text"},
        "id_front": {"required": true, "type": "file"},
        "id_back": {"required": true, "type": "file"},
        "selfie": {"required": true, "type": "file"},
        "issue_date": {"required": false, "type": "date"},
        "expiry_date": {"required": false, "type": "date"}
      }
    },
    "L2": {
      "fields": {
        "source_of_funds": {"required": true, "type": "select"},
        "occupation": {"required": true, "type": "text"},
        "risk_questionnaire": {"required": true, "type": "jsonb"}
      }
    }
  }'::JSONB,
  liveness_required BOOLEAN NOT NULL DEFAULT true,
  selfie_match_threshold NUMERIC NOT NULL DEFAULT 0.70,
  encrypt_at_rest BOOLEAN NOT NULL DEFAULT true,
  storage_bucket TEXT NOT NULL DEFAULT 'kyc',
  storage_prefix TEXT NOT NULL DEFAULT 'documents',
  retention_days INTEGER,
  manual_review_required BOOLEAN NOT NULL DEFAULT true,
  region_rules JSONB NOT NULL DEFAULT '{}'::JSONB,
  pii_export_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kyc_profiles_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2')),
  data_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'draft', 'submitted', 'in_review', 'approved', 'rejected')),
  reviewer_id UUID,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, level)
);

CREATE TABLE IF NOT EXISTS public.kyc_documents_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_hash TEXT,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2) AVATAR & BADGE ID CARD SYSTEM
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_avatars_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  original_path TEXT NOT NULL,
  thumb_1x_path TEXT NOT NULL,
  thumb_2x_path TEXT,
  thumb_3x_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.badge_cards_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  card_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  qr_code_path TEXT,
  card_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.badge_card_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  border_text TEXT DEFAULT 'VERIFIED MEMBER',
  watermark_text TEXT DEFAULT 'i-Smart',
  theme_colors JSONB NOT NULL DEFAULT '{
    "primary": "hsl(262, 83%, 58%)",
    "secondary": "hsl(178, 100%, 50%)",
    "border": "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(178, 100%, 50%))"
  }'::JSONB,
  fields_visible JSONB NOT NULL DEFAULT '{
    "photo": true,
    "name": true,
    "uid": true,
    "email": true,
    "kyc_level": true,
    "badge": true,
    "join_date": true,
    "qr_code": true
  }'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 3) SECURITY SYSTEM
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.security_devices_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_address INET,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.security_sessions_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_id UUID,
  ip_address INET,
  user_agent TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.totp_secrets_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  secret_encrypted TEXT NOT NULL,
  backup_codes_encrypted TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.login_audit_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location_country TEXT,
  location_city TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  require_pin_on_open BOOLEAN NOT NULL DEFAULT true,
  require_2fa_for_withdrawals BOOLEAN NOT NULL DEFAULT false,
  transaction_approval_threshold NUMERIC DEFAULT 1000,
  max_failed_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 15,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 4) REFERRAL & DEEP LINK SYSTEM
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_links_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  sponsor_id UUID,
  locked_at TIMESTAMPTZ,
  source TEXT,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_commissions NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_host TEXT NOT NULL DEFAULT 'https://i-smartapp.com',
  ref_route_web TEXT NOT NULL DEFAULT '/r',
  deep_link_scheme TEXT NOT NULL DEFAULT 'ismart',
  android_package_id TEXT DEFAULT 'com.ismart.app',
  android_sha256_fingerprint TEXT,
  sponsor_locking_policy TEXT NOT NULL DEFAULT 'first_touch' CHECK (sponsor_locking_policy IN ('first_touch', 'manual_approval', 'retro_allowed')),
  self_referral_prevention BOOLEAN NOT NULL DEFAULT true,
  qr_code_size INTEGER NOT NULL DEFAULT 200,
  whatsapp_support_url TEXT DEFAULT 'https://wa.me/1234567890',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 5) PROFILE COMPLETION TRACKING
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_completion_new (
  user_id UUID PRIMARY KEY,
  completion_score INTEGER NOT NULL DEFAULT 0 CHECK (completion_score >= 0 AND completion_score <= 100),
  has_avatar BOOLEAN NOT NULL DEFAULT false,
  has_display_name BOOLEAN NOT NULL DEFAULT false,
  has_phone BOOLEAN NOT NULL DEFAULT false,
  kyc_level TEXT,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 6) INDEXES
-- ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kyc_profiles_new_user_id ON public.kyc_profiles_new(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_new_status ON public.kyc_profiles_new(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_new_user_id ON public.kyc_documents_new(user_id);
CREATE INDEX IF NOT EXISTS idx_security_devices_new_user_id ON public.security_devices_new(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_new_user_id ON public.security_sessions_new(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_new_user_id ON public.login_audit_new(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_new_user_id ON public.referral_links_new(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_new_code ON public.referral_links_new(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_links_new_sponsor_id ON public.referral_links_new(sponsor_id);

-- ─────────────────────────────────────────────────────────────────
-- 7) RLS POLICIES
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.kyc_admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_profiles_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_cards_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_card_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_devices_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_sessions_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totp_secrets_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_audit_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_completion_new ENABLE ROW LEVEL SECURITY;

-- KYC Policies
CREATE POLICY "Users can view own KYC profiles" ON public.kyc_profiles_new FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own KYC profiles" ON public.kyc_profiles_new FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own KYC profiles" ON public.kyc_profiles_new FOR UPDATE USING (auth.uid()::text = user_id::text AND status IN ('none', 'draft', 'rejected'));
CREATE POLICY "Admin can manage all KYC profiles" ON public.kyc_profiles_new FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own KYC documents" ON public.kyc_documents_new FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own KYC documents" ON public.kyc_documents_new FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Admin can manage all KYC documents" ON public.kyc_documents_new FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage KYC config" ON public.kyc_admin_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view KYC config" ON public.kyc_admin_config FOR SELECT USING (true);

-- Avatar & Badge Policies
CREATE POLICY "Users can manage own avatar" ON public.user_avatars_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Everyone can view avatars" ON public.user_avatars_new FOR SELECT USING (true);

CREATE POLICY "Users can manage own badge card" ON public.badge_cards_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admin can manage badge card config" ON public.badge_card_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view badge card config" ON public.badge_card_config FOR SELECT USING (true);

-- Security Policies
CREATE POLICY "Users can manage own devices" ON public.security_devices_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own sessions" ON public.security_sessions_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own TOTP" ON public.totp_secrets_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own login audit" ON public.login_audit_new FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "System can insert login audit" ON public.login_audit_new FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage security config" ON public.security_admin_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view security config" ON public.security_admin_config FOR SELECT USING (true);

-- Referral Policies
CREATE POLICY "Users can manage own referral links" ON public.referral_links_new FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Everyone can view referral links by code" ON public.referral_links_new FOR SELECT USING (true);

CREATE POLICY "Admin can manage referral config" ON public.referral_admin_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view referral config" ON public.referral_admin_config FOR SELECT USING (true);

-- Profile Completion Policies
CREATE POLICY "Users can view own profile completion" ON public.profile_completion_new FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "System can manage profile completion" ON public.profile_completion_new FOR ALL USING (true);

-- ─────────────────────────────────────────────────────────────────
-- 8) INSERT DEFAULT CONFIGS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.kyc_admin_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
INSERT INTO public.badge_card_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
INSERT INTO public.security_admin_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
INSERT INTO public.referral_admin_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;