-- Re-schedule staking deposit monitor every 5 minutes without embedding any API key/JWT.
-- staking-deposit-monitor has verify_jwt=false and uses service-role DB access internally.
SELECT cron.schedule(
  'staking-deposit-monitor-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/staking-deposit-monitor',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
