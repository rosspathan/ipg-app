-- Create users_app table
CREATE TABLE public.users_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  display_name text,
  country text,
  dob date,
  account_frozen boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create kyc_profiles table
CREATE TABLE public.kyc_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('unverified','pending','verified','rejected')) DEFAULT 'unverified',
  first_name text,
  last_name text,
  id_type text,
  id_number text,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  notes text,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create security table
CREATE TABLE public.security (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_2fa boolean DEFAULT false,
  pin_set boolean DEFAULT false,
  anti_phishing_code text,
  withdraw_whitelist_only boolean DEFAULT false,
  spend_daily_limit numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create devices table
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text,
  last_ip text,
  last_seen timestamp with time zone DEFAULT now(),
  trusted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create settings_user table
CREATE TABLE public.settings_user (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_currency text DEFAULT 'USD',
  language text DEFAULT 'en',
  theme text DEFAULT 'system',
  session_lock_minutes integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create notifications_prefs table
CREATE TABLE public.notifications_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_push boolean DEFAULT true,
  marketing_push boolean DEFAULT false,
  email_tx boolean DEFAULT true,
  email_marketing boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create wallets_user table
CREATE TABLE public.wallets_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain text NOT NULL,
  address text NOT NULL,
  label text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, chain, address)
);

-- Create allowlist_addresses table
CREATE TABLE public.allowlist_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain text NOT NULL,
  address text NOT NULL,
  label text,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create beneficiaries table
CREATE TABLE public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  chain text NOT NULL,
  address text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create banking_inr table
CREATE TABLE public.banking_inr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text,
  account_number text,
  ifsc text,
  bank_name text,
  upi_id text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create api_keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_preview text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  revoked boolean DEFAULT false
);

-- Create login_audit table
CREATE TABLE public.login_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  ip text,
  agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banking_inr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users to access only their own data
CREATE POLICY "Users can manage own users_app" ON public.users_app
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own kyc_profiles" ON public.kyc_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own security" ON public.security
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON public.devices
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings_user" ON public.settings_user
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications_prefs" ON public.notifications_prefs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wallets_user" ON public.wallets_user
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own allowlist_addresses" ON public.allowlist_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own beneficiaries" ON public.beneficiaries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own banking_inr" ON public.banking_inr
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own api_keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own login_audit" ON public.login_audit
  FOR ALL USING (auth.uid() = user_id);

-- Create KYC storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false) ON CONFLICT DO NOTHING;

-- Create storage policies for KYC files
CREATE POLICY "Users can upload their own KYC files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own KYC files" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own KYC files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own KYC files" ON storage.objects
  FOR DELETE USING (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updated_at on settings_user
CREATE TRIGGER update_settings_user_updated_at
  BEFORE UPDATE ON public.settings_user
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();