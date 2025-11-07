-- Enable real-time updates for user_bsk_balances table
ALTER TABLE public.user_bsk_balances REPLICA IDENTITY FULL;