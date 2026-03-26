
-- Schedule reconcile_transfer_statuses() via pg_cron every 10 minutes
-- This repairs stale IBT rows and alerts admins

-- Remove existing job if any
DO $$
BEGIN
    PERFORM cron.unschedule('reconcile-transfer-statuses');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create the cron job - runs the function directly (no HTTP needed)
SELECT cron.schedule(
    'reconcile-transfer-statuses',
    '*/10 * * * *',
    $$SELECT reconcile_transfer_statuses()$$
);
