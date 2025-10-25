-- Update IPG price to $300 per token
UPDATE assets 
SET initial_price = 300.00,
    updated_at = now()
WHERE symbol = 'IPG' AND network = 'BEP20';

-- Add comment for clarity
COMMENT ON COLUMN assets.initial_price IS 'Initial price in USD - IPG is set at $300 per token';