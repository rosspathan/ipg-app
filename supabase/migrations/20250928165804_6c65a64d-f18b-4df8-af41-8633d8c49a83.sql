-- Drop old lucky draw tables and recreate new BSK-only system
DROP TABLE IF EXISTS public.lucky_draw_tickets CASCADE;
DROP TABLE IF EXISTS public.lucky_draw_configs CASCADE;

-- Create new draw system enums (handle if exists)
DO $$ BEGIN
    CREATE TYPE draw_state AS ENUM ('draft', 'open', 'full', 'drawing', 'completed', 'expired', 'refunding', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('active', 'won', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE winner_rank AS ENUM ('first', 'second', 'third');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Admin fees ledger (check if exists)
CREATE TABLE IF NOT EXISTS public.admin_fees_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    draw_id UUID,
    fee_bsk NUMERIC NOT NULL DEFAULT 0,
    fee_inr NUMERIC NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL, -- 'draw_fee', 'trading_fee', etc.
    bsk_rate_snapshot NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- BSK rates management
CREATE TABLE IF NOT EXISTS public.bsk_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_inr_per_bsk NUMERIC NOT NULL,
    set_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT
);

-- Lucky draw configurations
CREATE TABLE public.draw_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    pool_size INTEGER NOT NULL DEFAULT 100,
    ticket_price_inr NUMERIC NOT NULL,
    per_user_ticket_cap INTEGER NOT NULL DEFAULT 1,
    fee_percent NUMERIC NOT NULL DEFAULT 10.0,
    start_mode TEXT NOT NULL DEFAULT 'auto_when_full', -- 'auto_when_full', 'scheduled_time'
    scheduled_time TIMESTAMP WITH TIME ZONE,
    min_tickets_for_scheduled INTEGER DEFAULT 50,
    expiry_time TIMESTAMP WITH TIME ZONE,
    kyc_required BOOLEAN DEFAULT false,
    region_restrictions JSONB DEFAULT '[]'::jsonb,
    enable_referral_events BOOLEAN DEFAULT false,
    state draw_state DEFAULT 'draft',
    current_participants INTEGER DEFAULT 0,
    server_seed_hash TEXT, -- Commit phase
    server_seed TEXT, -- Reveal phase
    client_seed TEXT,
    nonce INTEGER DEFAULT 0,
    winners_determined_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prize tiers for each draw
CREATE TABLE public.draw_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draw_configs(id) ON DELETE CASCADE,
    rank winner_rank NOT NULL,
    amount_inr NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Draw tickets
CREATE TABLE public.draw_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draw_configs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    status ticket_status DEFAULT 'active',
    bsk_paid NUMERIC NOT NULL,
    inr_amount NUMERIC NOT NULL,
    bsk_rate_snapshot NUMERIC NOT NULL,
    config_snapshot JSONB NOT NULL, 
    prize_rank winner_rank,
    prize_bsk_gross NUMERIC,
    prize_bsk_net NUMERIC,
    fee_bsk NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Draw results and winners
CREATE TABLE public.draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draw_configs(id) ON DELETE CASCADE,
    server_seed TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    ticket_ids_ordered JSONB NOT NULL,
    winners JSONB NOT NULL,
    proof_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default draw templates
CREATE TABLE public.draw_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    pool_size INTEGER NOT NULL,
    ticket_price_inr NUMERIC NOT NULL,
    prizes JSONB NOT NULL,
    fee_percent NUMERIC NOT NULL DEFAULT 10.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draw_configs_state ON public.draw_configs(state);
CREATE INDEX IF NOT EXISTS idx_draw_configs_created_at ON public.draw_configs(created_at);
CREATE INDEX IF NOT EXISTS idx_draw_tickets_draw_id ON public.draw_tickets(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_tickets_user_id ON public.draw_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_tickets_status ON public.draw_tickets(status);
CREATE INDEX IF NOT EXISTS idx_admin_fees_ledger_created_at ON public.admin_fees_ledger(created_at);

-- Row Level Security
ALTER TABLE public.admin_fees_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage all admin fees" ON public.admin_fees_ledger;
DROP POLICY IF EXISTS "Users can view own fees" ON public.admin_fees_ledger;
DROP POLICY IF EXISTS "Admin can manage BSK rates" ON public.bsk_rates;
DROP POLICY IF EXISTS "Users can view BSK rates" ON public.bsk_rates;
DROP POLICY IF EXISTS "Admin can manage draw configs" ON public.draw_configs;
DROP POLICY IF EXISTS "Users can view active draws" ON public.draw_configs;
DROP POLICY IF EXISTS "Admin can manage draw prizes" ON public.draw_prizes;
DROP POLICY IF EXISTS "Users can view draw prizes" ON public.draw_prizes;
DROP POLICY IF EXISTS "Admin can manage all tickets" ON public.draw_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.draw_tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON public.draw_tickets;
DROP POLICY IF EXISTS "Admin can manage draw results" ON public.draw_results;
DROP POLICY IF EXISTS "Users can view draw results" ON public.draw_results;
DROP POLICY IF EXISTS "Admin can manage draw templates" ON public.draw_templates;
DROP POLICY IF EXISTS "Users can view active templates" ON public.draw_templates;

-- RLS Policies
CREATE POLICY "Admin can manage all admin fees" ON public.admin_fees_ledger FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own fees" ON public.admin_fees_ledger FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage BSK rates" ON public.bsk_rates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view BSK rates" ON public.bsk_rates FOR SELECT USING (true);

CREATE POLICY "Admin can manage draw configs" ON public.draw_configs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active draws" ON public.draw_configs FOR SELECT USING (state IN ('open', 'full', 'drawing', 'completed'));

CREATE POLICY "Admin can manage draw prizes" ON public.draw_prizes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view draw prizes" ON public.draw_prizes FOR SELECT USING (true);

CREATE POLICY "Admin can manage all tickets" ON public.draw_tickets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own tickets" ON public.draw_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tickets" ON public.draw_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage draw results" ON public.draw_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view draw results" ON public.draw_results FOR SELECT USING (true);

CREATE POLICY "Admin can manage draw templates" ON public.draw_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active templates" ON public.draw_templates FOR SELECT USING (is_active = true);

-- Triggers
CREATE OR REPLACE FUNCTION update_draw_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_draw_configs_updated_at ON public.draw_configs;
CREATE TRIGGER update_draw_configs_updated_at
  BEFORE UPDATE ON public.draw_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_draw_configs_updated_at();

-- Insert default templates (only if they don't exist)
INSERT INTO public.draw_templates (name, title, description, pool_size, ticket_price_inr, prizes, fee_percent) 
SELECT 'classic_100x100', 'Classic 100 × ₹100', 'Classic pool draw with 100 participants at ₹100 per ticket', 100, 100, 
 '[{"rank": "first", "amount_inr": 5000}, {"rank": "second", "amount_inr": 3000}, {"rank": "third", "amount_inr": 2000}]'::jsonb, 10.0
WHERE NOT EXISTS (SELECT 1 FROM public.draw_templates WHERE name = 'classic_100x100');

INSERT INTO public.draw_templates (name, title, description, pool_size, ticket_price_inr, prizes, fee_percent)
SELECT 'classic_100x500', 'Classic 100 × ₹500', 'Premium pool draw with 100 participants at ₹500 per ticket', 100, 500,
 '[{"rank": "first", "amount_inr": 25000}, {"rank": "second", "amount_inr": 15000}, {"rank": "third", "amount_inr": 10000}]'::jsonb, 10.0
WHERE NOT EXISTS (SELECT 1 FROM public.draw_templates WHERE name = 'classic_100x500');

-- Insert initial BSK rate if it doesn't exist
INSERT INTO public.bsk_rates (rate_inr_per_bsk, set_by, notes) 
SELECT 1.0, (SELECT id FROM auth.users WHERE email = 'rosspathan@gmail.com' LIMIT 1), 'Initial BSK rate for testing'
WHERE NOT EXISTS (SELECT 1 FROM public.bsk_rates);

-- Helper functions
CREATE OR REPLACE FUNCTION get_current_bsk_rate()
RETURNS NUMERIC
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rate_inr_per_bsk FROM public.bsk_rates ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION convert_inr_to_bsk(inr_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT inr_amount / get_current_bsk_rate();
$$;

CREATE OR REPLACE FUNCTION convert_bsk_to_inr(bsk_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bsk_amount * get_current_bsk_rate();
$$;