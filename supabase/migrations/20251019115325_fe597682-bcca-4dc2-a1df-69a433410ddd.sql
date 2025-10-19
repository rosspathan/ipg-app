-- Create function to sync team_referral_settings to program_configs
CREATE OR REPLACE FUNCTION public.sync_team_referral_to_program_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id UUID;
  v_config_id UUID;
BEGIN
  -- Get the program module ID for team referrals
  SELECT id INTO v_module_id
  FROM public.program_modules
  WHERE key = 'referrals_team'
  LIMIT 1;
  
  IF v_module_id IS NULL THEN
    RAISE NOTICE 'Team referrals module not found, skipping sync';
    RETURN NEW;
  END IF;
  
  -- Get the current config ID
  SELECT id INTO v_config_id
  FROM public.program_configs
  WHERE module_id = v_module_id
    AND is_current = true
  LIMIT 1;
  
  -- Build the config JSON from team_referral_settings
  IF v_config_id IS NOT NULL THEN
    -- Update existing config
    UPDATE public.program_configs
    SET 
      config_json = jsonb_build_object(
        'enabled', NEW.enabled,
        'max_levels', 50, -- Default max levels
        'trigger_event', NEW.trigger_event,
        'direct_commission_percent', NEW.direct_commission_percent,
        'level_commissions', ARRAY[]::numeric[], -- Empty array, will be managed from UI
        'min_referrer_badge_required', NEW.min_referrer_badge_required,
        'apply_requirement_to_vip_milestones', NEW.apply_requirement_to_vip_milestones,
        'balance_slabs_enabled', false, -- Default
        'daily_cap_per_earner', NEW.daily_cap_per_earner,
        'weekly_cap_per_earner', NEW.weekly_cap_per_earner,
        'max_daily_direct_commission_bsk', NEW.max_daily_direct_commission_bsk,
        'per_downline_event_cap', NEW.per_downline_event_cap,
        'spillover_to_next_eligible_upline', NEW.spillover_to_next_eligible_upline,
        'cooloff_hours', NEW.cooloff_hours,
        'cooloff_hours_for_clawback', NEW.cooloff_hours_for_clawback,
        'retro_window_hours', NEW.retro_window_hours,
        'payout_destination', NEW.payout_destination,
        'commission_scope', NEW.commission_scope,
        'eligibility_policy', NEW.eligibility_policy,
        'bsk_inr_rate', NEW.bsk_inr_rate,
        'region_enabled', NEW.region_enabled
      ),
      updated_at = NOW()
    WHERE id = v_config_id;
    
    RAISE NOTICE 'Synced team_referral_settings to program_configs (config_id: %)', v_config_id;
  ELSE
    -- Create new config if none exists
    INSERT INTO public.program_configs (
      module_id,
      version,
      config_json,
      is_current,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_module_id,
      1,
      jsonb_build_object(
        'enabled', NEW.enabled,
        'max_levels', 50,
        'trigger_event', NEW.trigger_event,
        'direct_commission_percent', NEW.direct_commission_percent,
        'level_commissions', ARRAY[]::numeric[],
        'min_referrer_badge_required', NEW.min_referrer_badge_required,
        'apply_requirement_to_vip_milestones', NEW.apply_requirement_to_vip_milestones,
        'balance_slabs_enabled', false,
        'daily_cap_per_earner', NEW.daily_cap_per_earner,
        'weekly_cap_per_earner', NEW.weekly_cap_per_earner,
        'max_daily_direct_commission_bsk', NEW.max_daily_direct_commission_bsk,
        'per_downline_event_cap', NEW.per_downline_event_cap,
        'spillover_to_next_eligible_upline', NEW.spillover_to_next_eligible_upline,
        'cooloff_hours', NEW.cooloff_hours,
        'cooloff_hours_for_clawback', NEW.cooloff_hours_for_clawback,
        'retro_window_hours', NEW.retro_window_hours,
        'payout_destination', NEW.payout_destination,
        'commission_scope', NEW.commission_scope,
        'eligibility_policy', NEW.eligibility_policy,
        'bsk_inr_rate', NEW.bsk_inr_rate,
        'region_enabled', NEW.region_enabled
      ),
      true, -- is_current
      'published', -- status
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new program_config for team referrals';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on team_referral_settings
DROP TRIGGER IF EXISTS sync_team_referral_to_config ON public.team_referral_settings;

CREATE TRIGGER sync_team_referral_to_config
  AFTER INSERT OR UPDATE ON public.team_referral_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_team_referral_to_program_config();

-- Create reverse sync function (program_configs -> team_referral_settings)
CREATE OR REPLACE FUNCTION public.sync_program_config_to_team_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_key TEXT;
  v_config JSONB;
BEGIN
  -- Get the module key
  SELECT key INTO v_module_key
  FROM public.program_modules
  WHERE id = NEW.module_id;
  
  -- Only process if this is the team referrals module
  IF v_module_key != 'referrals_team' THEN
    RETURN NEW;
  END IF;
  
  v_config := NEW.config_json;
  
  -- Update team_referral_settings from program_configs
  UPDATE public.team_referral_settings
  SET
    enabled = COALESCE((v_config->>'enabled')::boolean, enabled),
    trigger_event = COALESCE(v_config->>'trigger_event', trigger_event),
    direct_commission_percent = COALESCE((v_config->>'direct_commission_percent')::numeric, direct_commission_percent),
    min_referrer_badge_required = COALESCE(v_config->>'min_referrer_badge_required', min_referrer_badge_required),
    apply_requirement_to_vip_milestones = COALESCE((v_config->>'apply_requirement_to_vip_milestones')::boolean, apply_requirement_to_vip_milestones),
    daily_cap_per_earner = (v_config->>'daily_cap_per_earner')::numeric,
    weekly_cap_per_earner = (v_config->>'weekly_cap_per_earner')::numeric,
    max_daily_direct_commission_bsk = COALESCE((v_config->>'max_daily_direct_commission_bsk')::numeric, max_daily_direct_commission_bsk),
    per_downline_event_cap = (v_config->>'per_downline_event_cap')::numeric,
    spillover_to_next_eligible_upline = COALESCE((v_config->>'spillover_to_next_eligible_upline')::boolean, spillover_to_next_eligible_upline),
    cooloff_hours = COALESCE((v_config->>'cooloff_hours')::integer, cooloff_hours),
    cooloff_hours_for_clawback = COALESCE((v_config->>'cooloff_hours_for_clawback')::integer, cooloff_hours_for_clawback),
    retro_window_hours = COALESCE((v_config->>'retro_window_hours')::integer, retro_window_hours),
    payout_destination = COALESCE(v_config->>'payout_destination', payout_destination),
    commission_scope = COALESCE(v_config->>'commission_scope', commission_scope),
    eligibility_policy = COALESCE(v_config->>'eligibility_policy', eligibility_policy),
    bsk_inr_rate = COALESCE((v_config->>'bsk_inr_rate')::numeric, bsk_inr_rate),
    region_enabled = COALESCE((v_config->'region_enabled')::jsonb, region_enabled),
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.team_referral_settings LIMIT 1);
  
  RAISE NOTICE 'Synced program_configs back to team_referral_settings';
  
  RETURN NEW;
END;
$$;

-- Create trigger on program_configs (only for team referrals module)
DROP TRIGGER IF EXISTS sync_config_to_team_referral ON public.program_configs;

CREATE TRIGGER sync_config_to_team_referral
  AFTER UPDATE ON public.program_configs
  FOR EACH ROW
  WHEN (NEW.is_current = true AND OLD.config_json IS DISTINCT FROM NEW.config_json)
  EXECUTE FUNCTION public.sync_program_config_to_team_referral();

-- Initial sync: Copy current team_referral_settings to program_configs
DO $$
DECLARE
  v_module_id UUID;
  v_settings RECORD;
BEGIN
  -- Get team referrals module
  SELECT id INTO v_module_id
  FROM public.program_modules
  WHERE key = 'referrals_team';
  
  IF v_module_id IS NULL THEN
    RAISE NOTICE 'Team referrals module not found';
    RETURN;
  END IF;
  
  -- Get current settings
  SELECT * INTO v_settings
  FROM public.team_referral_settings
  LIMIT 1;
  
  IF v_settings IS NULL THEN
    RAISE NOTICE 'No team referral settings found';
    RETURN;
  END IF;
  
  -- Check if config already exists
  IF EXISTS (
    SELECT 1 FROM public.program_configs
    WHERE module_id = v_module_id AND is_current = true
  ) THEN
    RAISE NOTICE 'Team referrals config already exists, skipping initial sync';
    RETURN;
  END IF;
  
  -- Create initial config
  INSERT INTO public.program_configs (
    module_id,
    version,
    config_json,
    is_current,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_module_id,
    1,
    jsonb_build_object(
      'enabled', v_settings.enabled,
      'max_levels', 50,
      'trigger_event', v_settings.trigger_event,
      'direct_commission_percent', v_settings.direct_commission_percent,
      'level_commissions', ARRAY[]::numeric[],
      'min_referrer_badge_required', v_settings.min_referrer_badge_required,
      'apply_requirement_to_vip_milestones', v_settings.apply_requirement_to_vip_milestones,
      'balance_slabs_enabled', false,
      'daily_cap_per_earner', v_settings.daily_cap_per_earner,
      'weekly_cap_per_earner', v_settings.weekly_cap_per_earner,
      'max_daily_direct_commission_bsk', v_settings.max_daily_direct_commission_bsk,
      'per_downline_event_cap', v_settings.per_downline_event_cap,
      'spillover_to_next_eligible_upline', v_settings.spillover_to_next_eligible_upline,
      'cooloff_hours', v_settings.cooloff_hours,
      'cooloff_hours_for_clawback', v_settings.cooloff_hours_for_clawback,
      'retro_window_hours', v_settings.retro_window_hours,
      'payout_destination', v_settings.payout_destination,
      'commission_scope', v_settings.commission_scope,
      'eligibility_policy', v_settings.eligibility_policy,
      'bsk_inr_rate', v_settings.bsk_inr_rate,
      'region_enabled', v_settings.region_enabled
    ),
    true,
    'published',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Initial sync completed: team_referral_settings -> program_configs';
END $$;