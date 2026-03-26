
-- Disable deprecated deposit cron jobs that create duplicate processing paths
-- The authoritative monitor is 'monitor-custodial-deposits' (job #16, */2 * * * *)

-- auto-deposit-monitor (job #6) — legacy duplicate
DO $$ BEGIN PERFORM cron.unschedule('auto-deposit-monitor'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- auto-detect-deposits-cron (job #10) — legacy duplicate  
DO $$ BEGIN PERFORM cron.unschedule('auto-detect-deposits-cron'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- discover-deposits-every-10-min (job #9) — legacy duplicate
DO $$ BEGIN PERFORM cron.unschedule('discover-deposits-every-10-min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- monitor-pending-deposits (job #1) — legacy, replaced by monitor-custodial-deposits
DO $$ BEGIN PERFORM cron.unschedule('monitor-pending-deposits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
