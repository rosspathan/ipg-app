-- Create badge qualification rewards system
-- This adds the direct referrer 10% reward system without affecting existing referral functionality

-- Badge qualification events table - tracks when users achieve badges
CREATE TABLE public.badge_qualification_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    badge_name text NOT NULL, -- Silver, Gold, Platinum, Diamond, VIP
    previous_badge text, -- Previous badge (for upgrades)
    qualifying_amount numeric NOT NULL, -- IPG amount that triggered the badge
    qualification_type text NOT NULL DEFAULT 'initial', -- 'initial' or 'upgrade'
    transaction_hash text, -- Blockchain transaction reference
    transaction_chain text DEFAULT 'BEP20',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Direct referrer rewards table - tracks 10% rewards for badge qualifications
CREATE TABLE public.direct_referrer_rewards (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL, -- The user who achieved the badge
    referrer_id uuid NOT NULL, -- Their direct referrer who gets the reward
    badge_qualification_event_id uuid NOT NULL REFERENCES public.badge_qualification_events(id),
    reward_amount numeric NOT NULL, -- 10% of qualifying amount
    reward_token text NOT NULL DEFAULT 'IPG', -- IPG or BSK
    reward_token_amount numeric NOT NULL, -- Amount in the reward token
    status text NOT NULL DEFAULT 'pending', -- pending, settled, clawed_back
    cooloff_until timestamp with time zone, -- When cooloff period ends
    clawback_reason text, -- If status is clawed_back
    clawback_by uuid, -- Admin who clawed back
    clawback_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    FOREIGN KEY (badge_qualification_event_id) REFERENCES public.badge_qualification_events(id)
);

-- Badge system settings table - admin controls
CREATE TABLE public.badge_system_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Badge thresholds
    silver_threshold numeric NOT NULL DEFAULT 10,
    gold_threshold numeric NOT NULL DEFAULT 20,
    platinum_threshold numeric NOT NULL DEFAULT 30,
    diamond_threshold numeric NOT NULL DEFAULT 40,
    vip_threshold numeric NOT NULL DEFAULT 50,
    threshold_currency text NOT NULL DEFAULT 'IPG',
    
    -- Direct referrer reward settings
    direct_referral_percentage numeric NOT NULL DEFAULT 10.0,
    payout_token text NOT NULL DEFAULT 'IPG', -- IPG or BSK
    
    -- Anti-abuse settings
    per_user_daily_cap numeric DEFAULT 1000,
    per_day_global_cap numeric DEFAULT 10000,
    cooloff_hours integer NOT NULL DEFAULT 48,
    detect_self_funding boolean NOT NULL DEFAULT true,
    require_net_new_ipg boolean NOT NULL DEFAULT true,
    
    -- System toggles
    system_enabled boolean NOT NULL DEFAULT true,
    auto_settle_enabled boolean NOT NULL DEFAULT true,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Badge qualification audit log - for compliance and debugging
CREATE TABLE public.badge_qualification_audit (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL, -- badge_achieved, reward_paid, reward_clawed_back, settings_changed
    user_id uuid,
    referrer_id uuid,
    badge_qualification_event_id uuid,
    direct_referrer_reward_id uuid,
    admin_user_id uuid, -- Who performed the action
    old_values jsonb,
    new_values jsonb,
    reason text,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User badge status table - current badge for each user
CREATE TABLE public.user_badge_status (
    user_id uuid NOT NULL PRIMARY KEY,
    current_badge text NOT NULL DEFAULT 'None', -- None, Silver, Gold, Platinum, Diamond, VIP
    achieved_at timestamp with time zone NOT NULL DEFAULT now(),
    total_ipg_contributed numeric NOT NULL DEFAULT 0,
    referrer_id uuid, -- Their direct referrer (set at account creation)
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.badge_qualification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_referrer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_qualification_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badge_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Badge qualification events - users can view their own, admins can view all
CREATE POLICY "Users can view own badge events" ON public.badge_qualification_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage badge events" ON public.badge_qualification_events
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create badge events" ON public.badge_qualification_events
    FOR INSERT WITH CHECK (true);

-- Direct referrer rewards - users can view their own rewards, admins can manage
CREATE POLICY "Users can view own referrer rewards" ON public.direct_referrer_rewards
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = user_id);

CREATE POLICY "Admin can manage referrer rewards" ON public.direct_referrer_rewards
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create referrer rewards" ON public.direct_referrer_rewards
    FOR INSERT WITH CHECK (true);

-- Badge system settings - only admins
CREATE POLICY "Admin can manage badge settings" ON public.badge_system_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view badge settings" ON public.badge_system_settings
    FOR SELECT USING (true);

-- Badge qualification audit - only admins can view
CREATE POLICY "Admin can view badge audit" ON public.badge_qualification_audit
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create audit entries" ON public.badge_qualification_audit
    FOR INSERT WITH CHECK (true);

-- User badge status - users can view their own and others (for referral tree), admins all
CREATE POLICY "Users can view badge status" ON public.user_badge_status
    FOR SELECT USING (true); -- Public readable for referral tree display

CREATE POLICY "Users can update own badge status" ON public.user_badge_status
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badge status" ON public.user_badge_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage badge status" ON public.user_badge_status
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_badge_qualification_events_user_id ON public.badge_qualification_events(user_id);
CREATE INDEX idx_badge_qualification_events_created_at ON public.badge_qualification_events(created_at);

CREATE INDEX idx_direct_referrer_rewards_referrer_id ON public.direct_referrer_rewards(referrer_id);
CREATE INDEX idx_direct_referrer_rewards_user_id ON public.direct_referrer_rewards(user_id);
CREATE INDEX idx_direct_referrer_rewards_status ON public.direct_referrer_rewards(status);
CREATE INDEX idx_direct_referrer_rewards_created_at ON public.direct_referrer_rewards(created_at);

CREATE INDEX idx_user_badge_status_referrer_id ON public.user_badge_status(referrer_id);
CREATE INDEX idx_user_badge_status_current_badge ON public.user_badge_status(current_badge);

-- Insert default settings
INSERT INTO public.badge_system_settings (
    silver_threshold, gold_threshold, platinum_threshold, diamond_threshold, vip_threshold,
    direct_referral_percentage, payout_token, per_user_daily_cap, per_day_global_cap,
    cooloff_hours, system_enabled
) VALUES (
    10, 20, 30, 40, 50,
    10.0, 'IPG', 1000, 10000,
    48, true
);

-- Create function to determine badge from IPG amount
CREATE OR REPLACE FUNCTION public.get_badge_from_ipg_amount(ipg_amount numeric)
RETURNS text AS $$
DECLARE
    settings record;
BEGIN
    SELECT * INTO settings FROM public.badge_system_settings ORDER BY created_at DESC LIMIT 1;
    
    IF ipg_amount >= settings.vip_threshold THEN
        RETURN 'VIP';
    ELSIF ipg_amount >= settings.diamond_threshold THEN
        RETURN 'Diamond';
    ELSIF ipg_amount >= settings.platinum_threshold THEN
        RETURN 'Platinum';
    ELSIF ipg_amount >= settings.gold_threshold THEN
        RETURN 'Gold';
    ELSIF ipg_amount >= settings.silver_threshold THEN
        RETURN 'Silver';
    ELSE
        RETURN 'None';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process badge qualification and create direct referrer reward
CREATE OR REPLACE FUNCTION public.process_badge_qualification(
    p_user_id uuid,
    p_ipg_amount numeric,
    p_transaction_hash text DEFAULT NULL,
    p_transaction_chain text DEFAULT 'BEP20'
)
RETURNS jsonb AS $$
DECLARE
    settings record;
    current_status record;
    new_badge text;
    previous_badge text;
    qualifying_amount numeric;
    qualification_type text;
    referrer_reward_amount numeric;
    reward_token_amount numeric;
    badge_event_id uuid;
    reward_id uuid;
    cooloff_until timestamp;
    result jsonb;
BEGIN
    -- Get current settings
    SELECT * INTO settings FROM public.badge_system_settings ORDER BY created_at DESC LIMIT 1;
    
    IF NOT settings.system_enabled THEN
        RETURN jsonb_build_object('success', false, 'reason', 'system_disabled');
    END IF;
    
    -- Get or create current user badge status
    SELECT * INTO current_status FROM public.user_badge_status WHERE user_id = p_user_id;
    
    IF current_status IS NULL THEN
        -- First time user, create status record
        INSERT INTO public.user_badge_status (user_id, current_badge, total_ipg_contributed, referrer_id)
        SELECT p_user_id, 'None', 0, 
               COALESCE((SELECT referrer_id FROM public.referral_relationships WHERE referee_id = p_user_id LIMIT 1), NULL)
        ON CONFLICT (user_id) DO NOTHING;
        
        SELECT * INTO current_status FROM public.user_badge_status WHERE user_id = p_user_id;
    END IF;
    
    -- Determine new badge and qualification details
    new_badge := public.get_badge_from_ipg_amount(current_status.total_ipg_contributed + p_ipg_amount);
    previous_badge := current_status.current_badge;
    
    -- Only process if there's an upgrade
    IF new_badge = previous_badge OR new_badge = 'None' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_badge_upgrade');
    END IF;
    
    -- Calculate qualifying amount
    IF previous_badge = 'None' THEN
        qualification_type := 'initial';
        -- For initial badge, cap at the threshold amount
        CASE new_badge
            WHEN 'Silver' THEN qualifying_amount := LEAST(p_ipg_amount, settings.silver_threshold);
            WHEN 'Gold' THEN qualifying_amount := LEAST(p_ipg_amount, settings.gold_threshold);
            WHEN 'Platinum' THEN qualifying_amount := LEAST(p_ipg_amount, settings.platinum_threshold);
            WHEN 'Diamond' THEN qualifying_amount := LEAST(p_ipg_amount, settings.diamond_threshold);
            WHEN 'VIP' THEN qualifying_amount := LEAST(p_ipg_amount, settings.vip_threshold);
        END CASE;
    ELSE
        qualification_type := 'upgrade';
        -- For upgrades, calculate the additional amount needed
        CASE new_badge
            WHEN 'Gold' THEN qualifying_amount := LEAST(p_ipg_amount, settings.gold_threshold - settings.silver_threshold);
            WHEN 'Platinum' THEN 
                IF previous_badge = 'Silver' THEN
                    qualifying_amount := LEAST(p_ipg_amount, settings.platinum_threshold - settings.silver_threshold);
                ELSE
                    qualifying_amount := LEAST(p_ipg_amount, settings.platinum_threshold - settings.gold_threshold);
                END IF;
            WHEN 'Diamond' THEN
                CASE previous_badge
                    WHEN 'Silver' THEN qualifying_amount := LEAST(p_ipg_amount, settings.diamond_threshold - settings.silver_threshold);
                    WHEN 'Gold' THEN qualifying_amount := LEAST(p_ipg_amount, settings.diamond_threshold - settings.gold_threshold);
                    ELSE qualifying_amount := LEAST(p_ipg_amount, settings.diamond_threshold - settings.platinum_threshold);
                END CASE;
            WHEN 'VIP' THEN
                CASE previous_badge
                    WHEN 'Silver' THEN qualifying_amount := LEAST(p_ipg_amount, settings.vip_threshold - settings.silver_threshold);
                    WHEN 'Gold' THEN qualifying_amount := LEAST(p_ipg_amount, settings.vip_threshold - settings.gold_threshold);
                    WHEN 'Platinum' THEN qualifying_amount := LEAST(p_ipg_amount, settings.vip_threshold - settings.platinum_threshold);
                    ELSE qualifying_amount := LEAST(p_ipg_amount, settings.vip_threshold - settings.diamond_threshold);
                END CASE;
        END CASE;
    END IF;
    
    -- Create badge qualification event
    INSERT INTO public.badge_qualification_events (
        user_id, badge_name, previous_badge, qualifying_amount, 
        qualification_type, transaction_hash, transaction_chain
    ) VALUES (
        p_user_id, new_badge, previous_badge, qualifying_amount,
        qualification_type, p_transaction_hash, p_transaction_chain
    ) RETURNING id INTO badge_event_id;
    
    -- Update user badge status
    UPDATE public.user_badge_status 
    SET 
        current_badge = new_badge,
        total_ipg_contributed = total_ipg_contributed + p_ipg_amount,
        achieved_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Process direct referrer reward if referrer exists
    IF current_status.referrer_id IS NOT NULL THEN
        referrer_reward_amount := qualifying_amount * (settings.direct_referral_percentage / 100.0);
        
        -- Convert to reward token if needed
        IF settings.payout_token = 'IPG' THEN
            reward_token_amount := referrer_reward_amount;
        ELSE
            -- For BSK or other tokens, would need price conversion logic
            reward_token_amount := referrer_reward_amount; -- Simplified for now
        END IF;
        
        cooloff_until := now() + (settings.cooloff_hours || ' hours')::interval;
        
        -- Create direct referrer reward
        INSERT INTO public.direct_referrer_rewards (
            user_id, referrer_id, badge_qualification_event_id,
            reward_amount, reward_token, reward_token_amount,
            status, cooloff_until
        ) VALUES (
            p_user_id, current_status.referrer_id, badge_event_id,
            referrer_reward_amount, settings.payout_token, reward_token_amount,
            'pending', cooloff_until
        ) RETURNING id INTO reward_id;
    END IF;
    
    -- Create audit entry
    INSERT INTO public.badge_qualification_audit (
        event_type, user_id, referrer_id, badge_qualification_event_id, direct_referrer_reward_id,
        new_values
    ) VALUES (
        'badge_achieved', p_user_id, current_status.referrer_id, badge_event_id, reward_id,
        jsonb_build_object(
            'new_badge', new_badge,
            'previous_badge', previous_badge,
            'qualifying_amount', qualifying_amount,
            'referrer_reward_amount', referrer_reward_amount
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'badge_achieved', new_badge,
        'previous_badge', previous_badge,
        'qualifying_amount', qualifying_amount,
        'referrer_reward_amount', COALESCE(referrer_reward_amount, 0),
        'badge_event_id', badge_event_id,
        'reward_id', reward_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to settle rewards after cooloff period
CREATE OR REPLACE FUNCTION public.settle_pending_referrer_rewards()
RETURNS jsonb AS $$
DECLARE
    settled_count integer := 0;
    reward_record record;
BEGIN
    -- Find all pending rewards past cooloff period
    FOR reward_record IN 
        SELECT * FROM public.direct_referrer_rewards 
        WHERE status = 'pending' AND cooloff_until <= now()
    LOOP
        -- Update status to settled
        UPDATE public.direct_referrer_rewards 
        SET status = 'settled', updated_at = now()
        WHERE id = reward_record.id;
        
        -- TODO: Actually credit the referrer's balance here
        -- This would integrate with the existing wallet_bonus_balances table
        
        settled_count := settled_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object('settled_count', settled_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_badge_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_badge_qualification_events_updated_at
    BEFORE UPDATE ON public.badge_qualification_events
    FOR EACH ROW EXECUTE FUNCTION public.update_badge_timestamp();

CREATE TRIGGER update_direct_referrer_rewards_updated_at
    BEFORE UPDATE ON public.direct_referrer_rewards
    FOR EACH ROW EXECUTE FUNCTION public.update_badge_timestamp();

CREATE TRIGGER update_badge_system_settings_updated_at
    BEFORE UPDATE ON public.badge_system_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_badge_timestamp();

CREATE TRIGGER update_user_badge_status_updated_at
    BEFORE UPDATE ON public.user_badge_status
    FOR EACH ROW EXECUTE FUNCTION public.update_badge_timestamp();