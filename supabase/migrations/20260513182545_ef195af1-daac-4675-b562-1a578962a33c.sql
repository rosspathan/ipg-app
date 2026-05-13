-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup function: prunes the three biggest disk hogs
CREATE OR REPLACE FUNCTION public.run_disk_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
DECLARE
  v_audit_deleted bigint := 0;
  v_cron_deleted  bigint := 0;
  v_net_deleted   bigint := 0;
BEGIN
  -- 1. audit_logs: keep last 90 days
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  -- 2. cron.job_run_details: keep last 14 days
  BEGIN
    DELETE FROM cron.job_run_details
    WHERE end_time < now() - interval '14 days'
       OR (end_time IS NULL AND start_time < now() - interval '14 days');
    GET DIAGNOSTICS v_cron_deleted = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_cron_deleted := -1;
  END;

  -- 3. net._http_response: keep last 7 days
  BEGIN
    DELETE FROM net._http_response
    WHERE created < now() - interval '7 days';
    GET DIAGNOSTICS v_net_deleted = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_net_deleted := -1;
  END;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'audit_logs_deleted', v_audit_deleted,
    'cron_job_run_details_deleted', v_cron_deleted,
    'net_http_response_deleted', v_net_deleted
  );
END;
$$;

-- Lock down execution
REVOKE ALL ON FUNCTION public.run_disk_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_disk_cleanup() TO service_role;

-- Idempotently remove any prior versions of these jobs
DO $$
DECLARE j record;
BEGIN
  FOR j IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'cleanup-audit-logs',
      'cleanup-cron-job-history',
      'cleanup-pgnet-responses',
      'nightly-disk-cleanup'
    )
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

-- Single nightly job that runs all three cleanups in one transaction
SELECT cron.schedule(
  'nightly-disk-cleanup',
  '15 3 * * *',  -- 03:15 UTC every day
  $$ SELECT public.run_disk_cleanup(); $$
);