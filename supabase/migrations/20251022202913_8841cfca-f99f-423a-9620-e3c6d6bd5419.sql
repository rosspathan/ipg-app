-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule deposit monitoring every minute
-- Note: This requires pg_cron to be configured in Supabase dashboard
-- Once enabled, this will automatically call the scheduled-deposit-monitor function

-- Add a comment to document the cron schedule
COMMENT ON EXTENSION pg_cron IS 'Schedule: Run monitor-deposit every minute via scheduled-deposit-monitor edge function';