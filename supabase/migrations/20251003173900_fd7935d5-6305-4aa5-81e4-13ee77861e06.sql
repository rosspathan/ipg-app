-- Make tick_size and lot_size optional with sensible defaults for simple spot trading
ALTER TABLE markets 
ALTER COLUMN tick_size SET DEFAULT 0.01,
ALTER COLUMN lot_size SET DEFAULT 0.001,
ALTER COLUMN tick_size SET NOT NULL,
ALTER COLUMN lot_size SET NOT NULL;

-- Update existing NULL values if any
UPDATE markets SET tick_size = 0.01 WHERE tick_size IS NULL;
UPDATE markets SET lot_size = 0.001 WHERE lot_size IS NULL;