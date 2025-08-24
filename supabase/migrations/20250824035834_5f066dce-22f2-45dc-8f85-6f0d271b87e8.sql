-- Create subscription_plans table for admin management
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  features JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage subscription_plans" 
ON public.subscription_plans 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active subscription_plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_plans_updated_at();