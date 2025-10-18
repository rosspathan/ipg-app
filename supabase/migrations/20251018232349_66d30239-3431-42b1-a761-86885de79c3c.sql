-- Set up cron job for weekly auto-debit processing
-- Requires pg_cron and pg_net extensions

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-debit to run every Monday at 00:00 UTC
SELECT cron.schedule(
  'bsk-loan-auto-debit-weekly',
  '0 0 * * 1', -- Every Monday at 00:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/bsk-loan-auto-debit',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
    ),
    body := jsonb_build_object(
      'scheduled_run', true,
      'process_date', CURRENT_DATE::text
    )
  ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'bsk-loan-auto-debit-weekly';