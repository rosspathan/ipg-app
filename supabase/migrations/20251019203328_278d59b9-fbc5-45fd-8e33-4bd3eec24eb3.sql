-- Enable real-time updates for user_bsk_balances table
-- This allows users to see balance changes immediately without page refresh

-- Set replica identity to capture all column changes
ALTER TABLE public.user_bsk_balances REPLICA IDENTITY FULL;

-- Add table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bsk_balances;