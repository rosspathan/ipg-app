-- Create an active lucky draw from the Classic template
INSERT INTO draw_configs (
  title, description, pool_size, ticket_price_inr, per_user_ticket_cap, 
  fee_percent, state, enable_referral_events, start_mode, 
  region_restrictions, kyc_required, created_by
) 
VALUES (
  'Classic 100 × ₹100', 
  'Classic pool draw with 100 participants at ₹100 per ticket',
  100, 100, 1, 10.0, 'open', false, 'auto_when_full',
  '[]'::jsonb, false, '63f85e16-73e8-4a8d-aafa-b23611e7cb61'
);

-- Get the ID of the newly created draw and create its prizes
WITH new_draw AS (
  SELECT id FROM draw_configs WHERE title = 'Classic 100 × ₹100' ORDER BY created_at DESC LIMIT 1
)
INSERT INTO draw_prizes (draw_id, rank, amount_inr)
SELECT 
  new_draw.id,
  rank_enum,
  amount
FROM new_draw, 
unnest(
  ARRAY['first'::winner_rank, 'second'::winner_rank, 'third'::winner_rank],
  ARRAY[5000, 3000, 2000]
) AS t(rank_enum, amount);