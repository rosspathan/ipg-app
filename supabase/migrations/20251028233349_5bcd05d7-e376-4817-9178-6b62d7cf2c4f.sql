-- Fix stuck withdrawals by verifying on-chain status and correcting balances
-- This migration handles withdrawals that completed on-chain but stuck in 'processing' status

-- Create a scheduled job to monitor processing withdrawals every 5 minutes
-- First ensure pg_cron extension is available
SELECT cron.schedule(
  'monitor-processing-withdrawals',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/scheduled-monitor-withdrawals',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);