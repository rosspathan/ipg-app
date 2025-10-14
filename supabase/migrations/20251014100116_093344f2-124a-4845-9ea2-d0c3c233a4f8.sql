-- Create new unified kyc_submissions table
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  nationality text NOT NULL,
  phone text NOT NULL,
  
  -- Address Details
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text NOT NULL,
  country text NOT NULL,
  
  -- Identity Documents
  id_type text NOT NULL CHECK (id_type IN ('aadhaar', 'passport', 'drivers_license', 'national_id')),
  id_number text NOT NULL,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  
  -- Status & Review
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id),
  admin_notes text,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one submission per user
  UNIQUE(user_id)
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('draft_saved', 'submitted', 'approved', 'rejected', 'updated')),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_submissions
CREATE POLICY "Users can view own KYC submission"
  ON kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC submission"
  ON kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft KYC"
  ON kyc_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC submissions"
  ON kyc_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all KYC submissions"
  ON kyc_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for kyc_audit_log
CREATE POLICY "Admins can view audit log"
  ON kyc_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit log"
  ON kyc_audit_log FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_kyc_submissions_user_id ON kyc_submissions(user_id);
CREATE INDEX idx_kyc_submissions_status ON kyc_submissions(status);
CREATE INDEX idx_kyc_submissions_submitted_at ON kyc_submissions(submitted_at DESC);
CREATE INDEX idx_kyc_audit_log_submission_id ON kyc_audit_log(submission_id);

-- Create storage bucket for KYC documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for KYC documents
CREATE POLICY "Users can upload own KYC documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );