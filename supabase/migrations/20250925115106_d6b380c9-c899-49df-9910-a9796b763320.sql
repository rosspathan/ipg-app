-- Create BSK vesting system tables (corrected)

-- BSK vesting configuration (admin settings)
CREATE TABLE public.bsk_vesting_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    vesting_duration_days INTEGER NOT NULL DEFAULT 100,
    daily_release_percent NUMERIC NOT NULL DEFAULT 1.0,
    referral_reward_percent NUMERIC NOT NULL DEFAULT 0.5,
    eligible_chains TEXT[] NOT NULL DEFAULT '{BEP20,ERC20}',
    max_vesting_per_user NUMERIC DEFAULT NULL,
    min_ipg_swap_amount NUMERIC NOT NULL DEFAULT 10,
    max_ipg_swap_amount NUMERIC DEFAULT NULL,
    anti_sybil_max_per_ip INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User BSK vesting schedules
CREATE TABLE public.user_bsk_vesting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    config_id UUID REFERENCES public.bsk_vesting_config(id),
    ipg_amount_swapped NUMERIC NOT NULL,
    bsk_total_amount NUMERIC NOT NULL,
    bsk_daily_amount NUMERIC NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_completed INTEGER NOT NULL DEFAULT 0,
    bsk_released_total NUMERIC NOT NULL DEFAULT 0,
    bsk_pending_total NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    swap_tx_hash TEXT,
    swap_chain TEXT NOT NULL DEFAULT 'BEP20',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily vesting execution log
CREATE TABLE public.bsk_vesting_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vesting_id UUID REFERENCES public.user_bsk_vesting(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    release_date DATE NOT NULL,
    bsk_amount NUMERIC NOT NULL,
    day_number INTEGER NOT NULL,
    referrer_id UUID,
    referrer_reward_amount NUMERIC DEFAULT 0,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_id UUID,
    status TEXT NOT NULL DEFAULT 'completed'
);

-- BSK vesting referral rewards
CREATE TABLE public.bsk_vesting_referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL,
    referee_id UUID NOT NULL,
    vesting_release_id UUID REFERENCES public.bsk_vesting_releases(id),
    reward_amount NUMERIC NOT NULL,
    reward_date DATE NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'completed'
);

-- Enable RLS
ALTER TABLE public.bsk_vesting_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bsk_vesting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_vesting_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_vesting_referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bsk_vesting_config
CREATE POLICY "Admin can manage vesting config" ON public.bsk_vesting_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active vesting config" ON public.bsk_vesting_config
FOR SELECT USING (is_enabled = true);

-- RLS Policies for user_bsk_vesting
CREATE POLICY "Admin can manage all vesting schedules" ON public.user_bsk_vesting
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own vesting schedules" ON public.user_bsk_vesting
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vesting schedules" ON public.user_bsk_vesting
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bsk_vesting_releases (CORRECTED)
CREATE POLICY "Admin can view all vesting releases" ON public.bsk_vesting_releases
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own vesting releases" ON public.bsk_vesting_releases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create vesting releases" ON public.bsk_vesting_releases
FOR INSERT WITH CHECK (true);

-- RLS Policies for bsk_vesting_referral_rewards
CREATE POLICY "Admin can view all referral rewards" ON public.bsk_vesting_referral_rewards
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own referral rewards" ON public.bsk_vesting_referral_rewards
FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "System can create referral rewards" ON public.bsk_vesting_referral_rewards
FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_bsk_vesting_config_updated_at
BEFORE UPDATE ON public.bsk_vesting_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_bsk_vesting_updated_at
BEFORE UPDATE ON public.user_bsk_vesting
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_user_bsk_vesting_user_id ON public.user_bsk_vesting(user_id);
CREATE INDEX idx_user_bsk_vesting_active ON public.user_bsk_vesting(is_active, is_paused) WHERE is_active = true;
CREATE INDEX idx_bsk_vesting_releases_user_date ON public.bsk_vesting_releases(user_id, release_date);
CREATE INDEX idx_bsk_vesting_referral_rewards_referrer ON public.bsk_vesting_referral_rewards(referrer_id, reward_date);

-- Insert default configuration
INSERT INTO public.bsk_vesting_config (
    is_enabled, 
    vesting_duration_days, 
    daily_release_percent, 
    referral_reward_percent,
    eligible_chains,
    min_ipg_swap_amount
) VALUES (
    false, -- Admin needs to enable
    100,   -- 100 days
    1.0,   -- 1% per day
    0.5,   -- 0.5% referral reward
    '{BEP20,ERC20}',
    10     -- Minimum 10 IPG
);

-- Function to process daily vesting releases
CREATE OR REPLACE FUNCTION public.process_daily_bsk_vesting()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    vesting_record RECORD;
    config_record RECORD;
    release_amount NUMERIC;
    referrer_reward NUMERIC;
    batch_uuid UUID := gen_random_uuid();
    processed_count INTEGER := 0;
BEGIN
    -- Get active vesting config
    SELECT * INTO config_record 
    FROM public.bsk_vesting_config 
    WHERE is_enabled = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active vesting config');
    END IF;
    
    -- Process all active vesting schedules that are due for release
    FOR vesting_record IN
        SELECT v.*, 
               COALESCE(rr.referrer_id, NULL) as referrer_id
        FROM public.user_bsk_vesting v
        LEFT JOIN public.referral_relationships rr ON v.user_id = rr.referee_id
        WHERE v.is_active = true 
          AND v.is_paused = false
          AND v.days_completed < config_record.vesting_duration_days
          AND (v.start_date + v.days_completed * INTERVAL '1 day')::DATE <= CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM public.bsk_vesting_releases r 
              WHERE r.vesting_id = v.id 
                AND r.release_date = CURRENT_DATE
          )
    LOOP
        -- Calculate release amount (daily amount)
        release_amount := vesting_record.bsk_daily_amount;
        
        -- Calculate referrer reward if referrer exists
        referrer_reward := 0;
        IF vesting_record.referrer_id IS NOT NULL THEN
            referrer_reward := release_amount * config_record.referral_reward_percent / 100.0;
        END IF;
        
        -- Create vesting release record
        INSERT INTO public.bsk_vesting_releases (
            vesting_id, user_id, release_date, bsk_amount, day_number,
            referrer_id, referrer_reward_amount, batch_id
        ) VALUES (
            vesting_record.id, vesting_record.user_id, CURRENT_DATE, 
            release_amount, vesting_record.days_completed + 1,
            vesting_record.referrer_id, referrer_reward, batch_uuid
        );
        
        -- Create referrer reward record if applicable
        IF vesting_record.referrer_id IS NOT NULL AND referrer_reward > 0 THEN
            INSERT INTO public.bsk_vesting_referral_rewards (
                referrer_id, referee_id, vesting_release_id, 
                reward_amount, reward_date
            ) SELECT 
                vesting_record.referrer_id, vesting_record.user_id, r.id,
                referrer_reward, CURRENT_DATE
            FROM public.bsk_vesting_releases r 
            WHERE r.vesting_id = vesting_record.id 
              AND r.release_date = CURRENT_DATE 
              AND r.batch_id = batch_uuid;
        END IF;
        
        -- Update vesting schedule
        UPDATE public.user_bsk_vesting 
        SET 
            days_completed = days_completed + 1,
            bsk_released_total = bsk_released_total + release_amount,
            bsk_pending_total = bsk_pending_total - release_amount,
            is_active = CASE 
                WHEN days_completed + 1 >= config_record.vesting_duration_days THEN false 
                ELSE true 
            END,
            updated_at = NOW()
        WHERE id = vesting_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed_count', processed_count,
        'batch_id', batch_uuid,
        'date', CURRENT_DATE
    );
END;
$$;