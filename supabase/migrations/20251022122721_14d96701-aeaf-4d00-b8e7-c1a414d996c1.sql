-- Create simple KYC submissions table
CREATE TABLE public.kyc_submissions_simple (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Personal Info (flat structure)
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  nationality text NOT NULL,
  phone text NOT NULL,
  
  -- Address (flat)
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text NOT NULL,
  country text NOT NULL,
  
  -- ID Document (flat)
  id_type text NOT NULL CHECK (id_type IN ('passport', 'national_id', 'drivers_license', 'aadhaar')),
  id_number text NOT NULL,
  id_front_url text NOT NULL,
  id_back_url text NOT NULL,
  selfie_url text NOT NULL,
  
  -- Status (simple: draft, submitted, approved, rejected)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  rejection_reason text,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.kyc_submissions_simple ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submission
CREATE POLICY "Users can create own KYC submission"
  ON public.kyc_submissions_simple
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own submission
CREATE POLICY "Users can view own KYC submission"
  ON public.kyc_submissions_simple
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own draft or rejected submissions
CREATE POLICY "Users can update own KYC submission"
  ON public.kyc_submissions_simple
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all KYC submissions"
  ON public.kyc_submissions_simple
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any submission
CREATE POLICY "Admins can update any KYC submission"
  ON public.kyc_submissions_simple
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for admin queries
CREATE INDEX idx_kyc_submissions_simple_status ON public.kyc_submissions_simple(status);
CREATE INDEX idx_kyc_submissions_simple_user_id ON public.kyc_submissions_simple(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_kyc_submissions_simple_updated_at
  BEFORE UPDATE ON public.kyc_submissions_simple
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to reward BSK on approval
CREATE OR REPLACE FUNCTION public.reward_kyc_approval_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed from non-approved to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Credit 5 BSK to holding balance
    INSERT INTO public.user_bsk_balances (user_id, holding_balance, total_earned_holding)
    VALUES (NEW.user_id, 5, 5)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      holding_balance = user_bsk_balances.holding_balance + 5,
      total_earned_holding = user_bsk_balances.total_earned_holding + 5,
      updated_at = now();
    
    -- Set reviewed timestamp
    NEW.reviewed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_reward_kyc_approval_simple
  BEFORE UPDATE ON public.kyc_submissions_simple
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_kyc_approval_simple();