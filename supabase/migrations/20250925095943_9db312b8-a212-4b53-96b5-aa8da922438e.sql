-- Update lucky_draw_configs for pool-based system with tiered prizes
ALTER TABLE lucky_draw_configs 
  DROP COLUMN draw_date,
  DROP COLUMN prize_pool,
  ADD COLUMN pool_size INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN current_participants INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN first_place_prize NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN second_place_prize NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN third_place_prize NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN admin_fee_percent NUMERIC NOT NULL DEFAULT 10.0,
  ADD COLUMN ticket_currency TEXT NOT NULL DEFAULT 'IPG',
  ADD COLUMN payout_currency TEXT NOT NULL DEFAULT 'BSK',
  ADD COLUMN commit_hash TEXT,
  ADD COLUMN reveal_value TEXT,
  ADD COLUMN auto_execute BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN executed_at TIMESTAMP WITH TIME ZONE;

-- Update lucky_draw_tickets to support verification data
ALTER TABLE lucky_draw_tickets
  ADD COLUMN ipg_paid NUMERIC,
  ADD COLUMN bsk_payout NUMERIC,
  ADD COLUMN prize_tier INTEGER, -- 1=first, 2=second, 3=third
  ADD COLUMN verification_data JSONB;

-- Create function to automatically execute draw when pool is full
CREATE OR REPLACE FUNCTION check_and_execute_draw()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the pool is now full (100 participants)
  IF NEW.current_participants >= (SELECT pool_size FROM lucky_draw_configs WHERE id = NEW.id) THEN
    -- Only auto-execute if enabled and status is active
    IF NEW.auto_execute = true AND NEW.status = 'active' THEN
      -- Call the execute draw function asynchronously
      PERFORM pg_notify('execute_draw', NEW.id::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to check for full pools
CREATE TRIGGER trigger_check_full_pool
  AFTER UPDATE OF current_participants ON lucky_draw_configs
  FOR EACH ROW
  EXECUTE FUNCTION check_and_execute_draw();

-- Function to create pool-based draw tickets with IPG payment
CREATE OR REPLACE FUNCTION create_pool_draw_tickets(
  p_user_id uuid,
  p_config_id uuid,
  p_ticket_count integer,
  p_ipg_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  ticket_number TEXT;
  draw_config RECORD;
  current_count INTEGER;
  result JSON;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Get draw configuration
  SELECT * INTO draw_config
  FROM lucky_draw_configs
  WHERE id = p_config_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active draw not found';
  END IF;
  
  -- Check if pool has space
  IF draw_config.current_participants + p_ticket_count > draw_config.pool_size THEN
    RAISE EXCEPTION 'Not enough space in pool. Available: %', 
      draw_config.pool_size - draw_config.current_participants;
  END IF;
  
  -- Verify IPG payment amount
  IF p_ipg_amount != (draw_config.ticket_price * p_ticket_count) THEN
    RAISE EXCEPTION 'Invalid payment amount. Expected: %, Received: %', 
      draw_config.ticket_price * p_ticket_count, p_ipg_amount;
  END IF;
  
  -- Create tickets
  FOR i IN 1..p_ticket_count LOOP
    ticket_number := 'TKT' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    INSERT INTO lucky_draw_tickets (user_id, config_id, ticket_number, status, ipg_paid)
    VALUES (p_user_id, p_config_id, ticket_number, 'pending', draw_config.ticket_price);
  END LOOP;
  
  -- Update participant count
  UPDATE lucky_draw_configs 
  SET current_participants = current_participants + p_ticket_count
  WHERE id = p_config_id;
  
  result := json_build_object(
    'success', true,
    'tickets_created', p_ticket_count,
    'total_paid_ipg', p_ipg_amount,
    'pool_remaining', draw_config.pool_size - draw_config.current_participants - p_ticket_count,
    'message', 'Tickets created successfully'
  );
  
  RETURN result;
END;
$$;

-- Function to get pool draw statistics
CREATE OR REPLACE FUNCTION get_pool_draw_stats(p_config_id uuid)
RETURNS TABLE(
  total_participants INTEGER,
  pool_size INTEGER,
  spaces_remaining INTEGER,
  total_ipg_collected NUMERIC,
  estimated_payouts JSONB
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ldc.current_participants,
    ldc.pool_size,
    ldc.pool_size - ldc.current_participants AS spaces_remaining,
    ldc.current_participants * ldc.ticket_price AS total_ipg_collected,
    jsonb_build_object(
      'first_place_bsk', ldc.first_place_prize * (100 - ldc.admin_fee_percent) / 100,
      'second_place_bsk', ldc.second_place_prize * (100 - ldc.admin_fee_percent) / 100,
      'third_place_bsk', ldc.third_place_prize * (100 - ldc.admin_fee_percent) / 100,
      'admin_fee_ipg', (ldc.current_participants * ldc.ticket_price) * ldc.admin_fee_percent / 100
    ) AS estimated_payouts
  FROM lucky_draw_configs ldc
  WHERE ldc.id = p_config_id;
$$;

-- Insert default pool-based draw configuration
INSERT INTO lucky_draw_configs (
  ticket_price, 
  pool_size, 
  current_participants, 
  first_place_prize, 
  second_place_prize, 
  third_place_prize,
  admin_fee_percent,
  max_winners, 
  status,
  ticket_currency,
  payout_currency,
  auto_execute
) VALUES (
  5.0, -- 5 IPG per ticket
  100, -- 100 participants max
  0,   -- current participants
  250.0, -- First place: 250 BSK  
  150.0, -- Second place: 150 BSK
  100.0, -- Third place: 100 BSK
  10.0,  -- 10% admin fee
  3,     -- 3 winners (1st, 2nd, 3rd)
  'active',
  'IPG',
  'BSK',
  true
) ON CONFLICT DO NOTHING;