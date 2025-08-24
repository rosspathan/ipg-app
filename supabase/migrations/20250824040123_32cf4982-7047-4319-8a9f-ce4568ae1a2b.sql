-- Create referral_configs table for admin management
CREATE TABLE public.referral_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  levels INTEGER NOT NULL DEFAULT 1,
  commission_rates JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_referrals_per_level INTEGER,
  min_deposit_required NUMERIC DEFAULT 0,
  referrer_bonus NUMERIC DEFAULT 0,
  referee_bonus NUMERIC DEFAULT 0,
  bonus_currency TEXT DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage referral_configs" 
ON public.referral_configs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active referral_configs" 
ON public.referral_configs 
FOR SELECT 
USING (is_active = true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_referral_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referral_configs_updated_at
BEFORE UPDATE ON public.referral_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_referral_configs_updated_at();