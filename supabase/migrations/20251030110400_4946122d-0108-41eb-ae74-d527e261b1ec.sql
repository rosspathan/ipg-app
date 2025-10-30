-- =====================================================
-- CREATE SYSTEM ERRORS TABLE
-- Track and monitor system errors for automated recovery
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  context JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source_function TEXT,
  stack_trace TEXT
);

CREATE INDEX idx_system_errors_error_type ON system_errors(error_type);
CREATE INDEX idx_system_errors_user_id ON system_errors(user_id);
CREATE INDEX idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX idx_system_errors_resolved_at ON system_errors(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_system_errors_severity ON system_errors(severity);

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all system errors"
  ON system_errors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update system errors"
  ON system_errors FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert errors"
  ON system_errors FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_system_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_severity TEXT DEFAULT 'error',
  p_source_function TEXT DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO system_errors (
    error_type, error_message, error_details, user_id, context,
    severity, source_function, stack_trace
  ) VALUES (
    p_error_type, p_error_message, p_error_details, p_user_id, p_context,
    p_severity, p_source_function, p_stack_trace
  )
  RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_system_error(
  p_error_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE system_errors
  SET 
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE id = p_error_id AND resolved_at IS NULL;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unresolved_error_count()
RETURNS TABLE (
  total_count BIGINT,
  critical_count BIGINT,
  error_count BIGINT,
  warning_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'error') as error_count,
    COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
  FROM system_errors
  WHERE resolved_at IS NULL;
$$;