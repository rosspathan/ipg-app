-- Drop the restrictive bonus split constraint to allow flexible bonus configurations
-- This allows admins to set offers with only withdrawable OR only holding bonuses
ALTER TABLE bsk_purchase_bonuses 
DROP CONSTRAINT IF EXISTS bonus_split_must_equal_100;