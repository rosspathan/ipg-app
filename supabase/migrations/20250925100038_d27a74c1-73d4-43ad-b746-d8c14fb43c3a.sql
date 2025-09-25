-- Fix security issues: Add search_path to functions that were missing it
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