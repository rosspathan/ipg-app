-- Schedule cron jobs for Phase 10 automated tasks

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule late fee calculation (daily at 01:00 UTC)
SELECT cron.schedule(
  'bsk-loan-calculate-late-fees-daily',
  '0 1 * * *', -- Every day at 01:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/bsk-loan-calculate-late-fees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
    ),
    body := jsonb_build_object(
      'scheduled_run', true
    )
  ) as request_id;
  $$
);

-- Schedule loan payment reminders (daily at 08:00 UTC)
SELECT cron.schedule(
  'bsk-loan-send-reminders-daily',
  '0 8 * * *', -- Every day at 08:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/bsk-loan-send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
    ),
    body := jsonb_build_object(
      'scheduled_run', true
    )
  ) as request_id;
  $$
);

-- Verify the cron jobs were created
SELECT jobname, schedule, command FROM cron.job 
WHERE jobname IN ('bsk-loan-calculate-late-fees-daily', 'bsk-loan-send-reminders-daily');