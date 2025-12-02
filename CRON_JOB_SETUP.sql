-- =====================================================
-- CRON JOB SETUP FOR DAILY LOAN AUTO-DEBIT
-- =====================================================
-- 
-- This SQL creates a daily cron job that automatically
-- processes loan EMI payments from user's withdrawable balance.
-- 
-- Schedule: Daily at 00:05 UTC
-- Function: bsk-loan-auto-debit edge function
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

-- Remove existing job if it exists
SELECT cron.unschedule('loan-auto-debit-daily');

-- Create the daily auto-debit cron job
SELECT cron.schedule(
    'loan-auto-debit-daily',
    '5 0 * * *',  -- Run at 00:05 UTC daily
    $$
    SELECT net.http_post(
        url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/bsk-loan-auto-debit',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
        body:='{"scheduled_run": true}'::jsonb
    ) as request_id;
    $$
);

-- Verify the job was created
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
WHERE jobname = 'loan-auto-debit-daily';

-- =====================================================
-- EXPECTED OUTPUT:
-- You should see one row with:
-- - jobname: loan-auto-debit-daily
-- - schedule: 5 0 * * *
-- - active: true
-- =====================================================