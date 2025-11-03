-- ============================================================
-- Ad Mining Daily Reset - Cron Job Setup
-- ============================================================
-- This SQL file sets up a daily cron job to automatically reset
-- ad mining counters and expire subscriptions at midnight UTC.
--
-- INSTRUCTIONS:
-- 1. Copy this SQL
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and execute this SQL
-- 4. Verify the cron job was created (see verification query at bottom)
--
-- IMPORTANT: This is a MANUAL setup - run this SQL once via Supabase Dashboard
-- ============================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists (for updates)
SELECT cron.unschedule('ad-mining-daily-reset');

-- Schedule daily reset at midnight UTC (00:00)
-- Cron format: minute hour day month weekday
-- '0 0 * * *' = Every day at 00:00 UTC
SELECT cron.schedule(
  'ad-mining-daily-reset',
  '0 0 * * *', -- Runs at midnight UTC every day
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/ad-mining-daily-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
    ),
    body := jsonb_build_object(
      'triggered_by', 'cron',
      'timestamp', NOW()
    )
  ) AS request_id;
  $$
);

-- ============================================================
-- ALTERNATIVE SCHEDULES (uncomment to use)
-- ============================================================

-- Every 5 minutes (for testing only!)
-- SELECT cron.schedule(
--   'ad-mining-daily-reset',
--   '*/5 * * * *',
--   $$ ... $$
-- );

-- Midnight IST (00:00 IST = 18:30 UTC previous day)
-- SELECT cron.schedule(
--   'ad-mining-daily-reset',
--   '30 18 * * *',
--   $$ ... $$
-- );

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if cron job was created successfully
SELECT * FROM cron.job WHERE jobname = 'ad-mining-daily-reset';

-- View recent cron job runs (after it executes)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ad-mining-daily-reset')
ORDER BY start_time DESC 
LIMIT 10;

-- ============================================================
-- MANAGEMENT QUERIES
-- ============================================================

-- Manually trigger the function (for testing)
-- SELECT net.http_post(
--   url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/ad-mining-daily-reset',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
--   ),
--   body := jsonb_build_object('triggered_by', 'manual', 'timestamp', NOW())
-- );

-- Disable (unschedule) the cron job
-- SELECT cron.unschedule('ad-mining-daily-reset');

-- Re-enable by running the schedule command again

-- ============================================================
-- MONITORING
-- ============================================================

-- View last reset action from admin_actions_log
SELECT * FROM admin_actions_log
WHERE action_type = 'daily_reset'
ORDER BY created_at DESC
LIMIT 5;

-- Check daily view records
SELECT 
  date_key,
  COUNT(*) as user_count,
  SUM(free_views_used) as total_free_views,
  SUM(subscription_views_used) as total_sub_views,
  SUM(total_bsk_earned) as total_bsk
FROM user_daily_ad_views
GROUP BY date_key
ORDER BY date_key DESC
LIMIT 7;

-- Check active vs expired subscriptions
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_earned_bsk) as total_earned
FROM ad_user_subscriptions
GROUP BY status;
