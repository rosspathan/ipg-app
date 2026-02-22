-- =====================================================
-- CRON JOB SETUP FOR AUTO-RECONCILIATION
-- =====================================================
-- 
-- This SQL creates a cron job that automatically runs
-- the full trading reconciliation every 5 minutes.
-- If mismatches are detected, it logs alerts and can
-- trigger withdrawal freezes.
-- 
-- Schedule: Every 5 minutes
-- Function: full-trading-reconciliation edge function
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
-- JOB: Full Trading Reconciliation (every 5 minutes)
-- =====================================================
-- Compares wallet_balances against trading_balance_ledger
-- Logs discrepancies to security_audit_log
-- Auto-freezes withdrawals if critical mismatch detected

-- Safely remove existing job if it exists
DO $$
BEGIN
    PERFORM cron.unschedule('full-trading-reconciliation');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create the reconciliation cron job
SELECT cron.schedule(
    'full-trading-reconciliation',
    '*/5 * * * *',  -- Run every 5 minutes
    $$
    SELECT net.http_post(
        url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/full-trading-reconciliation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
        body:='{"action": "alert", "scheduled_run": true}'::jsonb
    ) as request_id;
    $$
);

-- =====================================================
-- VERIFY JOB WAS CREATED
-- =====================================================

SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'full-trading-reconciliation';

-- =====================================================
-- EXPECTED OUTPUT:
-- You should see one row with:
-- - jobname: full-trading-reconciliation
-- - schedule: */5 * * * *
-- - active: true
-- =====================================================
