-- Add min/max purchase amount fields to bsk_purchase_bonuses
ALTER TABLE bsk_purchase_bonuses 
ADD COLUMN IF NOT EXISTS min_purchase_amount_bsk numeric,
ADD COLUMN IF NOT EXISTS max_purchase_amount_bsk numeric;

-- Update existing records to use their purchase_amount_bsk as both min and max
UPDATE bsk_purchase_bonuses 
SET min_purchase_amount_bsk = purchase_amount_bsk,
    max_purchase_amount_bsk = purchase_amount_bsk
WHERE min_purchase_amount_bsk IS NULL OR max_purchase_amount_bsk IS NULL;

-- Make columns NOT NULL after data migration
ALTER TABLE bsk_purchase_bonuses 
ALTER COLUMN min_purchase_amount_bsk SET NOT NULL,
ALTER COLUMN max_purchase_amount_bsk SET NOT NULL;

-- Add validation constraint
ALTER TABLE bsk_purchase_bonuses
ADD CONSTRAINT check_purchase_amount_range 
CHECK (max_purchase_amount_bsk >= min_purchase_amount_bsk AND min_purchase_amount_bsk > 0);