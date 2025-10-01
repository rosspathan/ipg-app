-- ================================================
-- PROGRAM REGISTRY: CMS-Based Configuration System
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. PROGRAM MODULES TABLE
-- Defines what programs exist in the system
-- ================================================
CREATE TABLE IF NOT EXISTS public.program_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- e.g., 'adverts_mining', 'lucky_draw'
  name TEXT NOT NULL, -- Display name
  category TEXT NOT NULL, -- 'earnings', 'games', 'trading', 'finance'
  icon TEXT, -- Lucide icon name
  route TEXT, -- App route path
  status TEXT NOT NULL DEFAULT 'draft', -- draft|scheduled|live|paused|archived
  order_index INTEGER NOT NULL DEFAULT 0,
  enabled_regions JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['IN', 'US', etc.]
  enabled_roles JSONB NOT NULL DEFAULT '["public"]'::jsonb, -- ['public', 'kyc', 'vip']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'live', 'paused', 'archived')),
  CONSTRAINT valid_category CHECK (category IN ('earnings', 'games', 'trading', 'finance', 'rewards', 'system'))
);

-- Index for fast lookups
CREATE INDEX idx_program_modules_status ON public.program_modules(status);
CREATE INDEX idx_program_modules_order ON public.program_modules(order_index);
CREATE INDEX idx_program_modules_category ON public.program_modules(category);

-- ================================================
-- 2. PROGRAM CONFIGS TABLE
-- Versioned configuration for each module
-- ================================================
CREATE TABLE IF NOT EXISTS public.program_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.program_modules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- The actual configuration
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- JSON Schema for validation
  notes TEXT, -- Admin notes about this version
  effective_from TIMESTAMPTZ, -- When this config becomes active
  effective_to TIMESTAMPTZ, -- When this config expires
  status TEXT NOT NULL DEFAULT 'draft', -- draft|scheduled|published|archived
  is_current BOOLEAN NOT NULL DEFAULT false, -- Only one current version per module
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  
  CONSTRAINT valid_config_status CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  CONSTRAINT valid_effective_dates CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE(module_id, version)
);

-- Index for fast version lookups
CREATE INDEX idx_program_configs_module ON public.program_configs(module_id);
CREATE INDEX idx_program_configs_current ON public.program_configs(module_id, is_current) WHERE is_current = true;
CREATE INDEX idx_program_configs_effective ON public.program_configs(effective_from, effective_to);

-- ================================================
-- 3. PROGRAM AUDIT TABLE
-- Complete audit trail of all changes
-- ================================================
CREATE TABLE IF NOT EXISTS public.program_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.program_modules(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.program_configs(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'publish', 'pause', 'rollback', 'delete'
  entity_type TEXT NOT NULL, -- 'module', 'config', 'flags'
  before_json JSONB, -- State before change
  after_json JSONB, -- State after change
  diff_json JSONB, -- Calculated diff
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  operator_role TEXT,
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_audit_action CHECK (action IN ('create', 'update', 'publish', 'pause', 'resume', 'rollback', 'delete', 'flag_change'))
);

-- Index for audit queries
CREATE INDEX idx_program_audit_module ON public.program_audit(module_id);
CREATE INDEX idx_program_audit_operator ON public.program_audit(operator_id);
CREATE INDEX idx_program_audit_created ON public.program_audit(created_at DESC);

-- ================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ================================================
ALTER TABLE public.program_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_audit ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. RLS POLICIES - Admin Full Access
-- ================================================

-- Program Modules: Admin can manage all, users can view live modules
CREATE POLICY "Admin can manage all modules"
  ON public.program_modules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view live modules"
  ON public.program_modules
  FOR SELECT
  USING (status = 'live');

-- Program Configs: Admin can manage all, users can view published configs
CREATE POLICY "Admin can manage all configs"
  ON public.program_configs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view published configs"
  ON public.program_configs
  FOR SELECT
  USING (status = 'published' AND is_current = true);

-- Program Audit: Admin can view all, system can insert
CREATE POLICY "Admin can view all audit logs"
  ON public.program_audit
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create audit logs"
  ON public.program_audit
  FOR INSERT
  WITH CHECK (true);

-- ================================================
-- 6. TRIGGERS FOR AUTO-UPDATING
-- ================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_program_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_program_modules_updated_at
  BEFORE UPDATE ON public.program_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_program_updated_at();

CREATE TRIGGER update_program_configs_updated_at
  BEFORE UPDATE ON public.program_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_program_updated_at();

-- ================================================
-- 7. HELPER FUNCTIONS
-- ================================================

-- Get current config for a module
CREATE OR REPLACE FUNCTION get_current_program_config(p_module_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT pc.config_json INTO result
  FROM program_configs pc
  JOIN program_modules pm ON pm.id = pc.module_id
  WHERE pm.key = p_module_key
    AND pc.is_current = true
    AND pc.status = 'published'
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Publish a config (set as current, archive old)
CREATE OR REPLACE FUNCTION publish_program_config(
  p_config_id UUID,
  p_operator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id UUID;
  v_old_config_id UUID;
  result JSONB;
BEGIN
  -- Get module_id and check permissions
  IF NOT has_role(p_operator_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can publish configs';
  END IF;
  
  SELECT module_id INTO v_module_id
  FROM program_configs
  WHERE id = p_config_id;
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Config not found';
  END IF;
  
  -- Get current config ID
  SELECT id INTO v_old_config_id
  FROM program_configs
  WHERE module_id = v_module_id AND is_current = true;
  
  -- Archive old current config
  IF v_old_config_id IS NOT NULL THEN
    UPDATE program_configs
    SET is_current = false,
        status = 'archived'
    WHERE id = v_old_config_id;
  END IF;
  
  -- Publish new config
  UPDATE program_configs
  SET status = 'published',
      is_current = true,
      published_by = p_operator_id,
      published_at = now()
  WHERE id = p_config_id;
  
  -- Create audit entry
  INSERT INTO program_audit (
    module_id, config_id, action, entity_type,
    operator_id, notes
  ) VALUES (
    v_module_id, p_config_id, 'publish', 'config',
    p_operator_id, 'Config published'
  );
  
  result := jsonb_build_object(
    'success', true,
    'config_id', p_config_id,
    'previous_config_id', v_old_config_id
  );
  
  RETURN result;
END;
$$;

-- ================================================
-- 8. SEED INITIAL PROGRAM MODULES
-- ================================================

INSERT INTO public.program_modules (key, name, category, icon, route, status, order_index, enabled_regions, enabled_roles) VALUES
  ('adverts_mining', 'Ad Mining', 'earnings', 'MonitorPlay', '/programs/ad-mining', 'live', 1, '["IN", "global"]'::jsonb, '["public"]'::jsonb),
  ('lucky_draw', 'Lucky Draw', 'games', 'Trophy', '/programs/lucky-draw', 'live', 2, '["IN"]'::jsonb, '["kyc"]'::jsonb),
  ('spin_wheel', 'Spin Wheel', 'games', 'CircleDot', '/programs/spin-wheel', 'live', 3, '["IN"]'::jsonb, '["public"]'::jsonb),
  ('referrals_team', 'Team Referrals', 'rewards', 'Users', '/programs/referrals', 'live', 4, '["global"]'::jsonb, '["public"]'::jsonb),
  ('staking', 'Staking', 'finance', 'Coins', '/programs/staking', 'live', 5, '["global"]'::jsonb, '["kyc"]'::jsonb),
  ('trading', 'Trading', 'trading', 'TrendingUp', '/trading', 'live', 6, '["global"]'::jsonb, '["public"]'::jsonb),
  ('bsk_loans', 'BSK Loans', 'finance', 'HandCoins', '/programs/bsk-loans', 'live', 7, '["IN"]'::jsonb, '["kyc"]'::jsonb),
  ('insurance', 'Insurance', 'finance', 'Shield', '/programs/insurance', 'live', 8, '["IN"]'::jsonb, '["kyc"]'::jsonb),
  ('one_time_bsk', 'BSK Promotions', 'rewards', 'Gift', '/programs/bsk-promotion', 'live', 9, '["IN"]'::jsonb, '["public"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- 9. SEED INITIAL SCHEMAS FOR EACH MODULE
-- ================================================

-- Ad Mining Schema
INSERT INTO public.program_configs (module_id, version, schema_json, config_json, status, is_current, notes)
SELECT 
  id,
  1,
  '{
    "type": "object",
    "properties": {
      "free_daily_limit": {"type": "integer", "minimum": 0, "default": 10},
      "subscription_tiers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "tier_inr": {"type": "number", "minimum": 0},
            "duration_days": {"type": "integer", "minimum": 1},
            "daily_bsk": {"type": "number", "minimum": 0}
          }
        }
      },
      "reward_destination": {"type": "string", "enum": ["withdrawable", "holding"]},
      "verification_required": {"type": "boolean", "default": true},
      "min_view_time_seconds": {"type": "integer", "minimum": 5, "default": 30}
    }
  }'::jsonb,
  '{
    "free_daily_limit": 10,
    "subscription_tiers": [
      {"tier_inr": 100, "duration_days": 100, "daily_bsk": 2},
      {"tier_inr": 500, "duration_days": 100, "daily_bsk": 12}
    ],
    "reward_destination": "holding",
    "verification_required": true,
    "min_view_time_seconds": 30
  }'::jsonb,
  'published',
  true,
  'Initial ad mining configuration'
FROM program_modules WHERE key = 'adverts_mining';

-- Spin Wheel Schema
INSERT INTO public.program_configs (module_id, version, schema_json, config_json, status, is_current, notes)
SELECT 
  id,
  1,
  '{
    "type": "object",
    "properties": {
      "segments": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {"type": "string"},
            "reward_bsk": {"type": "number", "minimum": 0},
            "weight": {"type": "integer", "minimum": 1},
            "color": {"type": "string"}
          }
        }
      },
      "free_spins_per_day": {"type": "integer", "minimum": 0, "default": 3},
      "fee_after_free_bsk": {"type": "number", "minimum": 0, "default": 1},
      "min_bet_bsk": {"type": "number", "minimum": 0, "default": 0.1},
      "max_bet_bsk": {"type": "number", "minimum": 0, "default": 100}
    }
  }'::jsonb,
  '{
    "segments": [
      {"label": "0.5 BSK", "reward_bsk": 0.5, "weight": 30, "color": "#7C4DFF"},
      {"label": "1 BSK", "reward_bsk": 1, "weight": 25, "color": "#A66CFF"},
      {"label": "2 BSK", "reward_bsk": 2, "weight": 20, "color": "#00E5FF"},
      {"label": "5 BSK", "reward_bsk": 5, "weight": 15, "color": "#2BD67B"},
      {"label": "10 BSK", "reward_bsk": 10, "weight": 8, "color": "#F7A53B"},
      {"label": "50 BSK", "reward_bsk": 50, "weight": 2, "color": "#FF5C5C"}
    ],
    "free_spins_per_day": 3,
    "fee_after_free_bsk": 1,
    "min_bet_bsk": 0.1,
    "max_bet_bsk": 100
  }'::jsonb,
  'published',
  true,
  'Initial spin wheel configuration'
FROM program_modules WHERE key = 'spin_wheel';

-- Create audit entries for initial setup
INSERT INTO public.program_audit (module_id, action, entity_type, operator_id, notes)
SELECT id, 'create', 'module', created_by, 'Initial module setup'
FROM public.program_modules
WHERE created_by IS NOT NULL;