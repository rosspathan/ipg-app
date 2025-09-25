-- Add missing last_spin_at column to user_bonus_balances table
ALTER TABLE user_bonus_balances 
ADD COLUMN IF NOT EXISTS last_spin_at TIMESTAMP WITH TIME ZONE;