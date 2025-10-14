-- Phase 1: Enhanced Program Module Manager Database Schema

-- Add enhanced columns to program_modules (one at a time)
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS trending BOOLEAN DEFAULT false;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS seasonal BOOLEAN DEFAULT false;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS min_app_version TEXT;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS localized_content JSONB DEFAULT '{}'::jsonb;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE program_modules ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;

-- Create program_media table for visual assets
CREATE TABLE IF NOT EXISTS program_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES program_modules(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('icon', 'banner', 'thumbnail', 'video', 'screenshot')),
  file_path TEXT NOT NULL,
  file_url TEXT,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create program_visibility_rules table
CREATE TABLE IF NOT EXISTS program_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES program_modules(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('user_segment', 'balance_threshold', 'kyc_level', 'badge', 'region', 'user_age', 'activity_level')),
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create program_templates table
CREATE TABLE IF NOT EXISTS program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_media_module_id ON program_media(module_id);
CREATE INDEX IF NOT EXISTS idx_program_visibility_rules_module_id ON program_visibility_rules(module_id);
CREATE INDEX IF NOT EXISTS idx_program_templates_category ON program_templates(category);
CREATE INDEX IF NOT EXISTS idx_program_modules_status ON program_modules(status);
CREATE INDEX IF NOT EXISTS idx_program_modules_featured ON program_modules(featured) WHERE featured = true;

-- Enable RLS on new tables
ALTER TABLE program_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_media
CREATE POLICY "Admin can manage program media"
  ON program_media FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active program media"
  ON program_media FOR SELECT
  USING (is_active = true);

-- RLS Policies for program_visibility_rules
CREATE POLICY "Admin can manage visibility rules"
  ON program_visibility_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active visibility rules"
  ON program_visibility_rules FOR SELECT
  USING (is_active = true);

-- RLS Policies for program_templates
CREATE POLICY "Admin can manage all templates"
  ON program_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view public templates"
  ON program_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can manage own templates"
  ON program_templates FOR ALL
  USING (auth.uid() = created_by);

-- Function to clone a program module
CREATE OR REPLACE FUNCTION clone_program_module(
  p_module_id UUID,
  p_new_name TEXT,
  p_new_key TEXT,
  p_operator_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_module_id UUID;
  v_current_config RECORD;
BEGIN
  -- Check admin permission
  IF NOT has_role(p_operator_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can clone programs';
  END IF;
  
  -- Clone the module
  INSERT INTO program_modules (
    key, name, category, icon, route, status,
    order_index, enabled_regions, enabled_roles,
    featured, trending, seasonal, maintenance_mode,
    min_app_version, tags, seo_metadata, localized_content,
    description, terms_conditions, faqs, created_by
  )
  SELECT 
    p_new_key, p_new_name, category, icon, route, 'draft'::text,
    order_index + 100, enabled_regions, enabled_roles,
    false, false, seasonal, false,
    min_app_version, tags, seo_metadata, localized_content,
    description, terms_conditions, faqs, p_operator_id
  FROM program_modules
  WHERE id = p_module_id
  RETURNING id INTO v_new_module_id;
  
  -- Clone the current config if exists
  SELECT * INTO v_current_config
  FROM program_configs
  WHERE module_id = p_module_id AND is_current = true
  LIMIT 1;
  
  IF FOUND THEN
    INSERT INTO program_configs (
      module_id, version, config_json, schema_json,
      status, is_current, created_by
    ) VALUES (
      v_new_module_id, 1, v_current_config.config_json,
      v_current_config.schema_json, 'draft', true, p_operator_id
    );
  END IF;
  
  -- Clone media
  INSERT INTO program_media (
    module_id, media_type, file_path, file_url, alt_text, display_order
  )
  SELECT v_new_module_id, media_type, file_path, file_url, alt_text, display_order
  FROM program_media
  WHERE module_id = p_module_id AND is_active = true;
  
  -- Clone visibility rules
  INSERT INTO program_visibility_rules (
    module_id, rule_type, rule_config, priority
  )
  SELECT v_new_module_id, rule_type, rule_config, priority
  FROM program_visibility_rules
  WHERE module_id = p_module_id AND is_active = true;
  
  -- Audit log
  INSERT INTO program_audit (
    module_id, action, entity_type, operator_id, notes
  ) VALUES (
    v_new_module_id, 'clone', 'module', p_operator_id,
    'Cloned from module: ' || p_module_id
  );
  
  RETURN v_new_module_id;
END;
$$;

-- Function for bulk status updates
CREATE OR REPLACE FUNCTION bulk_update_program_status(
  p_module_ids UUID[],
  p_new_status TEXT,
  p_operator_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Check admin permission
  IF NOT has_role(p_operator_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can bulk update programs';
  END IF;
  
  -- Update modules
  UPDATE program_modules
  SET status = p_new_status, updated_at = now()
  WHERE id = ANY(p_module_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Audit log
  INSERT INTO program_audit (
    action, entity_type, operator_id, notes, after_json
  ) VALUES (
    'bulk_update', 'module', p_operator_id,
    'Bulk status update to: ' || p_new_status,
    jsonb_build_object('module_ids', p_module_ids, 'count', v_updated_count)
  );
  
  RETURN v_updated_count;
END;
$$;