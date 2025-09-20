-- Create ads table for admin-managed banner ads
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  square_image_url TEXT,
  target_url TEXT NOT NULL,
  reward_bsk NUMERIC NOT NULL DEFAULT 0,
  required_view_time INTEGER NOT NULL DEFAULT 5,
  placement TEXT NOT NULL DEFAULT 'home_top',
  status TEXT NOT NULL DEFAULT 'draft',
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  max_impressions_per_user_per_day INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ads
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policies for ads
CREATE POLICY "Admin can manage ads" ON public.ads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active ads" ON public.ads FOR SELECT USING (status = 'active' AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

-- Create ad_impressions table
CREATE TABLE public.ad_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_id TEXT,
  ip_address INET,
  placement TEXT
);

-- Enable RLS on ad_impressions
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

-- Create policies for ad_impressions
CREATE POLICY "Admin can view all impressions" ON public.ad_impressions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can create impressions" ON public.ad_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own impressions" ON public.ad_impressions FOR SELECT USING (auth.uid() = user_id);

-- Create ad_clicks table
CREATE TABLE public.ad_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  reward_bsk NUMERIC DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  device_id TEXT,
  ip_address INET,
  notes TEXT
);

-- Enable RLS on ad_clicks
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies for ad_clicks
CREATE POLICY "Admin can view all clicks" ON public.ad_clicks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can manage clicks" ON public.ad_clicks FOR ALL WITH CHECK (true);
CREATE POLICY "Users can view own clicks" ON public.ad_clicks FOR SELECT USING (auth.uid() = user_id);

-- Create subscription_tiers table
CREATE TABLE public.subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  daily_rewarded_clicks INTEGER NOT NULL DEFAULT 1,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_tiers
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_tiers
CREATE POLICY "Admin can manage subscription_tiers" ON public.subscription_tiers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active subscription_tiers" ON public.subscription_tiers FOR SELECT USING (is_active = true);

-- Create bonus_ledger table
CREATE TABLE public.bonus_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  asset TEXT NOT NULL DEFAULT 'BSK',
  amount_bsk NUMERIC NOT NULL,
  usd_value NUMERIC DEFAULT 0,
  meta_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bonus_ledger
ALTER TABLE public.bonus_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies for bonus_ledger
CREATE POLICY "Admin can view all ledger entries" ON public.bonus_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can create ledger entries" ON public.bonus_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own ledger entries" ON public.bonus_ledger FOR SELECT USING (auth.uid() = user_id);

-- Create conversions table
CREATE TABLE public.conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_asset TEXT NOT NULL DEFAULT 'BSK',
  to_asset TEXT NOT NULL DEFAULT 'USDT',
  rate NUMERIC NOT NULL,
  amount_from NUMERIC NOT NULL,
  amount_to NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  fee_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on conversions
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

-- Create policies for conversions
CREATE POLICY "Admin can view all conversions" ON public.conversions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can create conversions" ON public.conversions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own conversions" ON public.conversions FOR SELECT USING (auth.uid() = user_id);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (name, daily_rewarded_clicks, cooldown_seconds) VALUES
('free', 1, 0),
('standard', 5, 300),
('premium', 10, 60),
('vip', 20, 0);

-- Create triggers for updated_at
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ads_status_dates ON public.ads(status, start_at, end_at);
CREATE INDEX idx_ad_impressions_user_ad ON public.ad_impressions(user_id, ad_id);
CREATE INDEX idx_ad_clicks_user_ad_date ON public.ad_clicks(user_id, ad_id, started_at);
CREATE INDEX idx_bonus_ledger_user_type ON public.bonus_ledger(user_id, type);
CREATE INDEX idx_conversions_user_date ON public.conversions(user_id, created_at);