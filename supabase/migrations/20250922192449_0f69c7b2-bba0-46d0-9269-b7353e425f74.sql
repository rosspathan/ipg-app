-- Create RPC functions for lucky draw operations

-- Function to get user's lucky draw tickets
CREATE OR REPLACE FUNCTION public.get_user_lucky_draw_tickets(p_user_id UUID, p_config_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  config_id UUID,
  ticket_number TEXT,
  status TEXT,
  prize_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.user_id,
    t.config_id,
    t.ticket_number,
    t.status,
    t.prize_amount,
    t.created_at
  FROM lucky_draw_tickets t
  WHERE t.user_id = p_user_id AND t.config_id = p_config_id
  ORDER BY t.created_at DESC;
$$;

-- Function to count tickets for a draw
CREATE OR REPLACE FUNCTION public.count_lucky_draw_tickets(p_config_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM lucky_draw_tickets WHERE config_id = p_config_id;
$$;

-- Function to create lucky draw tickets
CREATE OR REPLACE FUNCTION public.create_lucky_draw_tickets(p_user_id UUID, p_config_id UUID, p_ticket_count INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  ticket_number TEXT;
  result JSON;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Create tickets
  FOR i IN 1..p_ticket_count LOOP
    ticket_number := 'TKT' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    INSERT INTO lucky_draw_tickets (user_id, config_id, ticket_number, status)
    VALUES (p_user_id, p_config_id, ticket_number, 'pending');
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'tickets_created', p_ticket_count,
    'message', 'Tickets created successfully'
  );
  
  RETURN result;
END;
$$;