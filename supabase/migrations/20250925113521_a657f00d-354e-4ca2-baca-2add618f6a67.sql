-- Create tables for provably-fair spin wheel system

-- Table to store server seed commits before revealing
CREATE TABLE public.spin_seed_commits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    server_seed_hash TEXT NOT NULL,
    server_seed TEXT, -- NULL until revealed
    client_seed TEXT,
    nonce INTEGER DEFAULT 0,
    bet_amount DECIMAL(10,2) NOT NULL,
    bet_token TEXT NOT NULL DEFAULT 'USDT',
    is_free_spin BOOLEAN DEFAULT false,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'revealed', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store spin results with full provably-fair data
CREATE TABLE public.provably_fair_spins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    seed_commit_id UUID NOT NULL REFERENCES spin_seed_commits(id),
    server_seed TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL,
    bet_token TEXT NOT NULL DEFAULT 'USDT',
    is_free_spin BOOLEAN DEFAULT false,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    winning_segment_id INTEGER NOT NULL,
    winning_segment_label TEXT NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payout_token TEXT,
    random_number DECIMAL(20,10) NOT NULL, -- The computed random number (0-1)
    result_hash TEXT NOT NULL, -- Hash of server_seed + client_seed + nonce for verification
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track user free spins quota (exactly 5 per user ever)
CREATE TABLE public.user_free_spins (
    user_id UUID NOT NULL PRIMARY KEY,
    free_spins_used INTEGER NOT NULL DEFAULT 0,
    free_spins_remaining INTEGER NOT NULL DEFAULT 5,
    first_spin_at TIMESTAMP WITH TIME ZONE,
    last_spin_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT free_spins_limit CHECK (free_spins_used <= 5 AND free_spins_remaining >= 0)
);

-- Table for admin-configured spin wheel settings
CREATE TABLE public.spin_wheel_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT true,
    min_bet_usdt DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    max_bet_usdt DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- 5% default
    daily_spin_limit INTEGER DEFAULT NULL, -- NULL = no limit
    house_edge_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.50, -- Expected RTP = 97.5%
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for spin wheel segments (admin-configured)
CREATE TABLE public.spin_wheel_segments (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1, -- Higher weight = more likely
    min_payout DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_payout DECIMAL(10,2) NOT NULL DEFAULT 0,
    payout_token TEXT NOT NULL DEFAULT 'BSK',
    is_active BOOLEAN NOT NULL DEFAULT true,
    color_hex TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT positive_weight CHECK (weight > 0),
    CONSTRAINT valid_payout_range CHECK (max_payout >= min_payout)
);

-- Enable RLS on all tables
ALTER TABLE public.spin_seed_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provably_fair_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_free_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_wheel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_wheel_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spin_seed_commits
CREATE POLICY "Users can view their own seed commits" 
ON public.spin_seed_commits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seed commits" 
ON public.spin_seed_commits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seed commits" 
ON public.spin_seed_commits FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for provably_fair_spins
CREATE POLICY "Users can view their own spins" 
ON public.provably_fair_spins FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spins" 
ON public.provably_fair_spins FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_free_spins
CREATE POLICY "Users can view their own free spins" 
ON public.user_free_spins FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own free spins record" 
ON public.user_free_spins FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own free spins" 
ON public.user_free_spins FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for spin_wheel_config (public read, admin write)
CREATE POLICY "Anyone can view spin wheel config" 
ON public.spin_wheel_config FOR SELECT 
USING (true);

-- RLS Policies for spin_wheel_segments (public read, admin write)
CREATE POLICY "Anyone can view active spin segments" 
ON public.spin_wheel_segments FOR SELECT 
USING (is_active = true);

-- Insert default configuration
INSERT INTO public.spin_wheel_config (is_active, min_bet_usdt, max_bet_usdt, fee_percentage, house_edge_percentage)
VALUES (true, 1.00, 100.00, 5.00, 2.50);

-- Insert default segments
INSERT INTO public.spin_wheel_segments (label, weight, min_payout, max_payout, payout_token, color_hex) VALUES
('WIN BSK +1', 25, 1.00, 1.00, 'BSK', '#10b981'),
('WIN BSK +5', 15, 5.00, 5.00, 'BSK', '#10b981'),
('WIN BSK +10', 10, 10.00, 10.00, 'BSK', '#059669'),
('WIN IPG +1', 20, 1.00, 1.00, 'IPG', '#3b82f6'),
('WIN IPG +2', 10, 2.00, 2.00, 'IPG', '#2563eb'),
('LOSE BSK -1', 15, -1.00, -1.00, 'BSK', '#ef4444'),
('LOSE BSK -2', 5, -2.00, -2.00, 'BSK', '#dc2626');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_spin_seed_commits_updated_at
    BEFORE UPDATE ON public.spin_seed_commits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_free_spins_updated_at
    BEFORE UPDATE ON public.user_free_spins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spin_wheel_config_updated_at
    BEFORE UPDATE ON public.spin_wheel_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spin_wheel_segments_updated_at
    BEFORE UPDATE ON public.spin_wheel_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_spin_seed_commits_user_id ON public.spin_seed_commits(user_id);
CREATE INDEX idx_spin_seed_commits_status ON public.spin_seed_commits(status);
CREATE INDEX idx_spin_seed_commits_expires_at ON public.spin_seed_commits(expires_at);
CREATE INDEX idx_provably_fair_spins_user_id ON public.provably_fair_spins(user_id);
CREATE INDEX idx_provably_fair_spins_created_at ON public.provably_fair_spins(created_at);
CREATE INDEX idx_spin_wheel_segments_active ON public.spin_wheel_segments(is_active);