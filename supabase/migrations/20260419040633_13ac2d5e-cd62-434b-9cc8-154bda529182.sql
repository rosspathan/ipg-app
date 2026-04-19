
-- Remove any existing job with this name
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'reconcile-stuck-custodial-deposits';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Schedule reconciler every 3 minutes
SELECT cron.schedule(
  'reconcile-stuck-custodial-deposits',
  '*/3 * * * *',
  $cron$ SELECT public.reconcile_stuck_custodial_deposits(100); $cron$
);
