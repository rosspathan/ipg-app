-- Sweep: confirm all broadcasting scratch claim batches
CREATE OR REPLACE FUNCTION public.scratch_confirm_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch record;
  v_count integer := 0;
BEGIN
  FOR v_batch IN
    SELECT id FROM public.scratch_card_claim_batches
    WHERE status = 'broadcasting' AND tx_hash IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    PERFORM net.http_post(
      url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/scratch-claim-confirmer',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A"}'::jsonb,
      body := jsonb_build_object('batch_id', v_batch.id::text)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- Schedule every minute
SELECT cron.schedule(
  'scratch-confirm-sweep',
  '* * * * *',
  $$SELECT public.scratch_confirm_sweep();$$
);