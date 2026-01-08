-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to run auto-detect-deposits every minute
SELECT cron.schedule(
  'auto-detect-deposits-cron',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/auto-detect-deposits',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('scheduled', true, 'timestamp', now()::text)
  ) AS request_id;
  $$
);