-- Schedule deposit monitoring to run every minute
SELECT cron.schedule(
  'auto-deposit-monitor',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/scheduled-deposit-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);