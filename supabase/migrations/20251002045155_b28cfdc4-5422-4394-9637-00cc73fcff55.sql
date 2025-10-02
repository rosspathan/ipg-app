-- Create insurance_bsk_plans table for BSK-based insurance
DROP TABLE IF EXISTS public.insurance_bsk_plans CASCADE;

CREATE TABLE public.insurance_bsk_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('accident', 'trading', 'life')),
  plan_name TEXT NOT NULL,
  annual_premium_bsk NUMERIC NOT NULL DEFAULT 0,
  max_coverage_bsk NUMERIC NOT NULL DEFAULT 0,
  min_age INTEGER DEFAULT NULL,
  max_age INTEGER DEFAULT NULL,
  min_loss_required_bsk NUMERIC DEFAULT NULL,
  coverage_ratio NUMERIC DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  terms_conditions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_bsk_plans ENABLE ROW LEVEL SECURITY;

-- Policies for insurance_bsk_plans
CREATE POLICY "Admin can manage insurance plans"
ON public.insurance_bsk_plans
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active insurance plans"
ON public.insurance_bsk_plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- Insert default plans
INSERT INTO public.insurance_bsk_plans (plan_type, plan_name, annual_premium_bsk, max_coverage_bsk, description)
VALUES 
  ('accident', 'Accident Insurance', 10000, 1000000, 'Get up to 1,000,000 BSK coverage for accidents'),
  ('trading', 'Trading Loss Insurance', 10000, 50000, 'Claim 50,000 BSK if you lose 100,000 BSK in trading'),
  ('life', 'Life Insurance (15-70 years)', 10000, 500000, 'Life insurance coverage for ages 15-70 years');

-- Update trading plan with specific fields
UPDATE public.insurance_bsk_plans 
SET min_loss_required_bsk = 100000, coverage_ratio = 0.5
WHERE plan_type = 'trading';

-- Update life insurance with age restrictions
UPDATE public.insurance_bsk_plans 
SET min_age = 15, max_age = 70
WHERE plan_type = 'life';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_insurance_bsk_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insurance_bsk_plans_updated_at
BEFORE UPDATE ON public.insurance_bsk_plans
FOR EACH ROW
EXECUTE FUNCTION update_insurance_bsk_plans_updated_at();