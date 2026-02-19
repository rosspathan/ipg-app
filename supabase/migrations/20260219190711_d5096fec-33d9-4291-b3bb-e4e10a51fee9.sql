
SELECT cron.schedule(
  'staking-deposit-monitor-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/staking-deposit-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
