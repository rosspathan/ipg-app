
-- 1. Credit the stuck deposit for ramakrishnadharavat@gmail.com (verified on-chain).
DO $$
DECLARE
  v_dep_id uuid := 'afeb3363-dcee-4dc4-9737-a2bf340aeffc';
  v_result jsonb;
BEGIN
  -- Mark confirmations accurately so the row reflects reality before crediting.
  UPDATE public.custodial_deposits
  SET confirmations = GREATEST(confirmations, required_confirmations),
      status = 'confirmed',
      updated_at = now()
  WHERE id = v_dep_id AND credited_at IS NULL;

  SELECT public.credit_custodial_deposit(v_dep_id) INTO v_result;
  RAISE NOTICE 'credit_custodial_deposit result: %', v_result;
END $$;

-- 2. Harden reconcile_stuck_custodial_deposits: also handle rows still 'pending'
--    whose confirmations >= required_confirmations (defensive — covers the case
--    where the chain-poll reconciler updates confirmations but the status field
--    wasn't atomically flipped to 'confirmed').
CREATE OR REPLACE FUNCTION public.reconcile_stuck_custodial_deposits(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dep_id uuid;
  v_result jsonb;
  v_total_scanned int := 0;
  v_total_credited int := 0;
  v_total_already int := 0;
  v_total_failed int := 0;
  v_failures jsonb := '[]'::jsonb;
BEGIN
  FOR v_dep_id IN
    SELECT id FROM public.custodial_deposits
    WHERE credited_at IS NULL
      AND (
        status = 'confirmed'
        OR (status = 'pending' AND confirmations >= COALESCE(required_confirmations, 3))
      )
    ORDER BY created_at ASC
    LIMIT p_limit
  LOOP
    v_total_scanned := v_total_scanned + 1;
    BEGIN
      SELECT public.credit_custodial_deposit(v_dep_id) INTO v_result;
      IF (v_result->>'success')::boolean THEN
        IF v_result->>'status' = 'already_credited' THEN
          v_total_already := v_total_already + 1;
        ELSE
          v_total_credited := v_total_credited + 1;
        END IF;
      ELSE
        v_total_failed := v_total_failed + 1;
        v_failures := v_failures || jsonb_build_object('id', v_dep_id, 'error', v_result->>'error');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_total_failed := v_total_failed + 1;
      v_failures := v_failures || jsonb_build_object('id', v_dep_id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'scanned', v_total_scanned,
    'credited', v_total_credited,
    'already_credited', v_total_already,
    'failed', v_total_failed,
    'failures', v_failures
  );
END;
$function$;
