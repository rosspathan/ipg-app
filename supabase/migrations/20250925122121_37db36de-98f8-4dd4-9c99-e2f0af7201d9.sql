-- Enhance existing spin wheel tables for comprehensive provably fair gaming

-- Add missing columns to spin_wheel_config
ALTER TABLE spin_wheel_config 
  ADD COLUMN IF NOT EXISTS name text DEFAULT 'Main Spin Wheel',
  ADD COLUMN IF NOT EXISTS free_spins_per_user integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS target_rtp_percentage numeric DEFAULT 98.0;

-- Add missing columns to spin_wheel_segments for better admin control
ALTER TABLE spin_wheel_segments
  ADD COLUMN IF NOT EXISTS payout_type text DEFAULT 'fixed' CHECK (payout_type IN ('fixed', 'random')),
  ADD COLUMN IF NOT EXISTS daily_win_limit numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_win_limit numeric DEFAULT NULL;

-- Create admin dashboard stats view
CREATE OR REPLACE VIEW admin_spin_wheel_stats AS
SELECT 
  w.id as wheel_id,
  w.name as wheel_name,
  w.is_active,
  w.min_bet_usdt,
  w.max_bet_usdt,
  w.fee_percentage,
  w.house_edge_percentage,
  w.target_rtp_percentage,
  
  -- Segment counts
  (SELECT COUNT(*) FROM spin_wheel_segments WHERE is_active = true) as active_segments,
  
  -- Daily stats from spin_results
  (SELECT COUNT(*) FROM spin_results WHERE created_at >= CURRENT_DATE) as spins_today,
  (SELECT COUNT(*) FROM spin_results WHERE is_free_spin = true AND created_at >= CURRENT_DATE) as free_spins_today,
  
  -- Total revenue (fees collected)
  (SELECT COALESCE(SUM(fee_bsk), 0) FROM spin_results WHERE created_at >= CURRENT_DATE) as fees_collected_today,
  
  -- Payouts
  (SELECT COALESCE(SUM(ABS(bsk_delta)), 0) FROM spin_results WHERE bsk_delta > 0 AND created_at >= CURRENT_DATE) as total_payouts_today,
  (SELECT COALESCE(SUM(ABS(bsk_delta)), 0) FROM spin_results WHERE bsk_delta < 0 AND created_at >= CURRENT_DATE) as total_losses_today

FROM spin_wheel_config w
WHERE w.is_active = true;

-- Create admin audit logging function
CREATE OR REPLACE FUNCTION log_spin_wheel_admin_action(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO spin_wheel_audit_logs (
    admin_user_id, action, resource_type, resource_id, 
    old_values, new_values, ip_address
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, NULL -- IP will be added by edge function
  );
END;
$$;

-- Add audit triggers to config table
CREATE OR REPLACE FUNCTION trigger_spin_config_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_spin_wheel_admin_action('config_updated', 'spin_wheel_config', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_spin_wheel_admin_action('config_created', 'spin_wheel_config', NEW.id, NULL, to_jsonb(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for config changes
DROP TRIGGER IF EXISTS spin_config_audit_trigger ON spin_wheel_config;
CREATE TRIGGER spin_config_audit_trigger
  AFTER INSERT OR UPDATE ON spin_wheel_config
  FOR EACH ROW EXECUTE FUNCTION trigger_spin_config_audit();

-- Add audit triggers to segments table
CREATE OR REPLACE FUNCTION trigger_spin_segments_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_spin_wheel_admin_action('segment_updated', 'spin_wheel_segments', NEW.id::uuid, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_spin_wheel_admin_action('segment_created', 'spin_wheel_segments', NEW.id::uuid, NULL, to_jsonb(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for segment changes
DROP TRIGGER IF EXISTS spin_segments_audit_trigger ON spin_wheel_segments;
CREATE TRIGGER spin_segments_audit_trigger
  AFTER INSERT OR UPDATE ON spin_wheel_segments
  FOR EACH ROW EXECUTE FUNCTION trigger_spin_segments_audit();