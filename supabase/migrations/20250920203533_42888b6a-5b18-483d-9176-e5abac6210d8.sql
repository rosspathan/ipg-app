-- Create purchase bonus rules table
CREATE TABLE public.purchase_bonus_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_symbol TEXT NOT NULL,
  bonus_symbol TEXT NOT NULL DEFAULT 'BSK',
  ratio_base_per_bonus NUMERIC NOT NULL,
  min_fill_amount NUMERIC DEFAULT 0,
  rounding_mode TEXT DEFAULT 'floor' CHECK (rounding_mode IN ('floor', 'round', 'ceil')),
  max_bonus_per_order NUMERIC DEFAULT 0,
  max_bonus_per_day_user NUMERIC DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  subscriber_tier_multipliers JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create purchase bonus events table
CREATE TABLE public.purchase_bonus_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,
  rule_id UUID REFERENCES public.purchase_bonus_rules(id),
  base_symbol TEXT NOT NULL,
  base_filled NUMERIC NOT NULL,
  bonus_symbol TEXT NOT NULL,
  bonus_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'granted' CHECK (status IN ('granted', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_bonus_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bonus_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_bonus_rules
CREATE POLICY "Admin can manage purchase_bonus_rules" 
ON public.purchase_bonus_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active purchase_bonus_rules" 
ON public.purchase_bonus_rules 
FOR SELECT 
USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

-- RLS Policies for purchase_bonus_events
CREATE POLICY "Admin can view all purchase_bonus_events" 
ON public.purchase_bonus_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own purchase_bonus_events" 
ON public.purchase_bonus_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create purchase_bonus_events" 
ON public.purchase_bonus_events 
FOR INSERT 
WITH CHECK (true);

-- Add updated_at trigger for purchase_bonus_rules
CREATE TRIGGER update_purchase_bonus_rules_updated_at
  BEFORE UPDATE ON public.purchase_bonus_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rule: Buy 5,000 IPG → Get 5 BSK (1:1000 ratio)
INSERT INTO public.purchase_bonus_rules (
  base_symbol, 
  bonus_symbol, 
  ratio_base_per_bonus, 
  is_active,
  notes
) VALUES (
  'IPG', 
  'BSK', 
  1000, 
  true,
  'Default rule: Buy 5,000 IPG → Get 5 BSK (1 BSK per 1,000 IPG purchased)'
);

-- Create indexes for performance
CREATE INDEX idx_purchase_bonus_rules_active ON public.purchase_bonus_rules(is_active, base_symbol) WHERE is_active = true;
CREATE INDEX idx_purchase_bonus_events_user_date ON public.purchase_bonus_events(user_id, created_at);
CREATE INDEX idx_purchase_bonus_events_order ON public.purchase_bonus_events(order_id);