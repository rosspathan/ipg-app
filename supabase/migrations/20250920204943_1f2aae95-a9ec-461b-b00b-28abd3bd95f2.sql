-- Replace existing insurance system with Trader Loss Coverage Insurance

-- Drop existing insurance tables (they have different structure than needed)
DROP TABLE IF EXISTS public.insurance_claims CASCADE;
DROP TABLE IF EXISTS public.insurance_policies CASCADE;
DROP TABLE IF EXISTS public.insurance_plans CASCADE;

-- Create new insurance plans table for trader loss coverage
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  premium_amount NUMERIC NOT NULL DEFAULT 0,
  coverage_ratio NUMERIC NOT NULL DEFAULT 0.5, -- e.g., 0.5 = 50% reimbursement
  max_coverage_per_claim NUMERIC NOT NULL DEFAULT 1000,
  min_loss_threshold NUMERIC NOT NULL DEFAULT 10, -- minimum loss to qualify
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create new claims table for trader loss coverage
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.insurance_plans(id),
  trade_id UUID, -- reference to a trade that resulted in loss
  loss_amount NUMERIC NOT NULL,
  reimbursed_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','approved','denied','paid'
  claim_reason TEXT DEFAULT 'trading_loss',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user policies table to track subscriptions
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.insurance_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- 'active','cancelled','expired'
  premium_paid NUMERIC NOT NULL DEFAULT 0,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_plans
CREATE POLICY "Admin can manage insurance_plans" 
ON public.insurance_plans 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active insurance_plans" 
ON public.insurance_plans 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for insurance_claims
CREATE POLICY "Admin can manage insurance_claims" 
ON public.insurance_claims 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own claims" 
ON public.insurance_claims 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for insurance_policies
CREATE POLICY "Admin can manage insurance_policies" 
ON public.insurance_policies 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own policies" 
ON public.insurance_policies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own policies" 
ON public.insurance_policies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_insurance_plans_updated_at
  BEFORE UPDATE ON public.insurance_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plan
INSERT INTO public.insurance_plans (
  plan_name,
  premium_amount,
  coverage_ratio,
  max_coverage_per_claim,
  min_loss_threshold,
  is_active,
  notes
) VALUES (
  'Trade Loss Protection',
  29.99,
  0.5,
  1000,
  10,
  true,
  'Covers 50% of trading losses up to $1000 per claim. Monthly premium: $29.99'
);

-- Add indexes for performance
CREATE INDEX idx_insurance_claims_user_id ON public.insurance_claims(user_id);
CREATE INDEX idx_insurance_claims_status ON public.insurance_claims(status);
CREATE INDEX idx_insurance_policies_user_id ON public.insurance_policies(user_id);
CREATE INDEX idx_insurance_policies_plan_id ON public.insurance_policies(plan_id);