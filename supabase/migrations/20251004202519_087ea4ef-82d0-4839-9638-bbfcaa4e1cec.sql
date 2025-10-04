-- Enforce exactly four active spin segments
BEGIN;
  -- Deactivate all existing active segments
  UPDATE public.spin_segments SET is_active = false WHERE is_active = true;

  -- Insert the desired four active segments
  INSERT INTO public.spin_segments (label, multiplier, weight, color_hex, is_active)
  VALUES
    ('LOSE', 0, 1, '#ef4444', true),
    ('WIN x2', 2, 1, '#22c55e', true),
    ('LOSE', 0, 1, '#ef4444', true),
    ('WIN x3', 3, 1, '#f59e0b', true);
COMMIT;