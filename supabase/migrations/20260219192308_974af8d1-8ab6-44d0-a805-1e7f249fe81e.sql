-- Fix: Update the cron job to use service role key instead of anon key
-- The staking-deposit-monitor runs as service role so it can write to DB directly
-- Remove old anon-key job and reschedule with service_role JWT
SELECT cron.unschedule('staking-deposit-monitor-5min');
