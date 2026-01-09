-- =====================================================
-- CRON JOB SETUP FOR CUSTODIAL TRADING MODEL
-- =====================================================
-- 
-- This SQL creates cron jobs for automated custodial operations:
-- 1. Monitor deposits (every 2 minutes)
-- 2. Process withdrawals (every 5 minutes)
-- 
-- IMPORTANT: This must be run manually in Supabase SQL Editor
-- as it requires write permissions to the cron.job table.
-- 
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Paste this entire SQL
-- 4. Click "Run"
-- 
-- =====================================================

-- Check if pg_cron and pg_net extensions are enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE EXCEPTION 'pg_cron extension is not enabled. Please enable it first in Database → Extensions.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE EXCEPTION 'pg_net extension is not enabled. Please enable it first in Database → Extensions.';
    END IF;
END $$;

-- =====================================================
-- JOB 1: Monitor Custodial Deposits (every 2 minutes)
-- =====================================================
-- Scans hot wallet for incoming token transfers
-- Credits confirmed deposits to user trading_balances

-- Remove existing job if it exists
SELECT cron.unschedule('monitor-custodial-deposits');

-- Create the deposit monitoring cron job
SELECT cron.schedule(
    'monitor-custodial-deposits',
    '*/2 * * * *',  -- Run every 2 minutes
    $$
    SELECT net.http_post(
        url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/monitor-custodial-deposits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
        body:='{"scheduled_run": true}'::jsonb
    ) as request_id;
    $$
);

-- =====================================================
-- JOB 2: Process Custodial Withdrawals (every 5 minutes)
-- =====================================================
-- Processes pending withdrawal requests
-- Sends tokens from hot wallet to user addresses

-- Remove existing job if it exists
SELECT cron.unschedule('process-custodial-withdrawals');

-- Create the withdrawal processing cron job
SELECT cron.schedule(
    'process-custodial-withdrawals',
    '*/5 * * * *',  -- Run every 5 minutes
    $$
    SELECT net.http_post(
        url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/process-custodial-withdrawal',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
        body:='{"scheduled_run": true}'::jsonb
    ) as request_id;
    $$
);

-- =====================================================
-- VERIFY JOBS WERE CREATED
-- =====================================================

SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname IN ('monitor-custodial-deposits', 'process-custodial-withdrawals')
ORDER BY jobname;

-- =====================================================
-- EXPECTED OUTPUT:
-- You should see two rows with:
-- - monitor-custodial-deposits: */2 * * * * (every 2 min)
-- - process-custodial-withdrawals: */5 * * * * (every 5 min)
-- =====================================================
