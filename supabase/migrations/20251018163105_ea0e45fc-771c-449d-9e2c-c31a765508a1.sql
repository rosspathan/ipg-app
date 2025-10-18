-- Enable real-time updates for program tables
-- This allows users to see admin changes immediately without waiting for cache expiration

-- Set REPLICA IDENTITY FULL for program_modules table
ALTER TABLE public.program_modules REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL for program_configs table
ALTER TABLE public.program_configs REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_configs;