
-- Add cron job to automatically sync BEP20 on-chain balances every 2 minutes
SELECT cron.schedule(
  'sync-bep20-balances-auto',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/sync-bep20-balances',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
