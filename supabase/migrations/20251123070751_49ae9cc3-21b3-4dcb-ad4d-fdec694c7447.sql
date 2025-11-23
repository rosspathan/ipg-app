-- ================================================================
-- COMPREHENSIVE BADGE COMMISSION FIX (Fixed RAISE syntax)
-- ================================================================

-- ================================================================
-- PHASE 1: DATABASE TRIGGER FOR AUTOMATIC COMMISSION
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_badge_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.current_badge IS DISTINCT FROM NEW.current_badge OR OLD.purchased_at IS DISTINCT FROM NEW.purchased_at))) THEN
    
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.supabase_service_role_key', true);
    
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://ocblgldglqhlrmtnynmu.supabase.co';
    END IF;
    
    RAISE LOG 'Badge Commission Trigger: Processing commission for user % badge %', NEW.user_id, NEW.current_badge;
    
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/process-badge-subscription-commission',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id::text,
        'badge_name', NEW.current_badge,
        'bsk_amount', NEW.price_bsk,
        'previous_badge', NEW.previous_badge
      ),
      timeout_milliseconds := 30000
    ) INTO v_request_id;
    
    RAISE LOG 'Badge Commission Trigger: HTTP request queued with ID %', v_request_id;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Badge Commission Trigger Error: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_badge_purchase_commission ON user_badge_holdings;

CREATE TRIGGER after_badge_purchase_commission
  AFTER INSERT OR UPDATE ON user_badge_holdings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_commission();

-- ================================================================
-- PHASE 2: BACKFILL FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION backfill_badge_commissions(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
  user_id UUID,
  badge_name TEXT,
  price_bsk NUMERIC,
  sponsor_id UUID,
  commission_amount NUMERIC,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_sponsor_id UUID;
  v_existing_commission UUID;
  v_processed_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  SELECT direct_commission_percent, enabled, bsk_inr_rate
  INTO v_settings
  FROM team_referral_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT v_settings.enabled THEN
    RAISE NOTICE 'Team referral system is disabled';
    RETURN;
  END IF;
  
  v_commission_rate := v_settings.direct_commission_percent / 100.0;
  
  FOR user_id, badge_name, price_bsk IN
    SELECT ubh.user_id, ubh.current_badge, ubh.price_bsk
    FROM user_badge_holdings ubh
    WHERE ubh.purchased_at >= p_start_date
      AND ubh.purchased_at <= p_end_date
      AND ubh.price_bsk > 0
    ORDER BY ubh.purchased_at ASC
  LOOP
    SELECT rt.ancestor_id INTO v_sponsor_id
    FROM referral_tree rt
    WHERE rt.user_id = backfill_badge_commissions.user_id
      AND rt.level = 1
    LIMIT 1;
    
    IF v_sponsor_id IS NULL THEN
      v_skipped_count := v_skipped_count + 1;
      action_taken := 'SKIPPED: No sponsor found';
      commission_amount := 0;
      sponsor_id := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    SELECT id INTO v_existing_commission
    FROM referral_commissions
    WHERE payer_id = backfill_badge_commissions.user_id
      AND earner_id = v_sponsor_id
      AND commission_type = 'badge_subscription'
    LIMIT 1;
    
    IF v_existing_commission IS NOT NULL THEN
      v_skipped_count := v_skipped_count + 1;
      action_taken := 'SKIPPED: Commission exists';
      commission_amount := 0;
      sponsor_id := v_sponsor_id;
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    v_commission_amount := backfill_badge_commissions.price_bsk * v_commission_rate;
    sponsor_id := v_sponsor_id;
    commission_amount := v_commission_amount;
    
    IF p_dry_run THEN
      action_taken := 'DRY_RUN: Would credit ' || v_commission_amount || ' BSK';
      v_skipped_count := v_skipped_count + 1;
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    BEGIN
      PERFORM record_bsk_transaction(
        p_user_id := v_sponsor_id,
        p_idempotency_key := 'backfill_badge_commission_' || backfill_badge_commissions.user_id::text || '_' || backfill_badge_commissions.badge_name,
        p_tx_type := 'credit',
        p_tx_subtype := 'referral_commission_l1',
        p_balance_type := 'withdrawable',
        p_amount_bsk := v_commission_amount,
        p_amount_inr := v_commission_amount * v_settings.bsk_inr_rate,
        p_rate_snapshot := v_settings.bsk_inr_rate,
        p_related_user_id := backfill_badge_commissions.user_id,
        p_meta_json := jsonb_build_object(
          'badge_purchased', backfill_badge_commissions.badge_name,
          'purchase_amount', backfill_badge_commissions.price_bsk,
          'commission_rate', v_settings.direct_commission_percent,
          'backfilled_at', NOW(),
          'event_type', 'badge_purchase'
        )
      );
      
      INSERT INTO referral_commissions (
        earner_id, payer_id, level, event_type, commission_type,
        bsk_amount, destination, status, metadata, created_at
      ) VALUES (
        v_sponsor_id, backfill_badge_commissions.user_id, 1, 'badge_purchase', 'badge_subscription',
        v_commission_amount, 'withdrawable', 'settled',
        jsonb_build_object(
          'badge_purchased', backfill_badge_commissions.badge_name,
          'purchase_amount', backfill_badge_commissions.price_bsk,
          'commission_rate', v_settings.direct_commission_percent,
          'backfilled_at', NOW()
        ),
        NOW()
      );
      
      v_processed_count := v_processed_count + 1;
      action_taken := 'SUCCESS: Credited ' || v_commission_amount || ' BSK';
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      action_taken := 'ERROR: ' || SQLERRM;
      RAISE WARNING 'Failed to process commission for user %', backfill_badge_commissions.user_id;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete. Processed: % Skipped: %', v_processed_count, v_skipped_count;
END;
$$;

-- ================================================================
-- PHASE 3: MONITORING VIEW
-- ================================================================

CREATE OR REPLACE VIEW badge_commission_health AS
SELECT 
  ubh.user_id,
  ubh.current_badge,
  ubh.price_bsk,
  ubh.purchased_at,
  rt.ancestor_id as sponsor_id,
  CASE 
    WHEN rt.ancestor_id IS NULL THEN 'NO_SPONSOR'
    WHEN rc.id IS NULL THEN 'MISSING_COMMISSION'
    ELSE 'OK'
  END as status,
  rc.bsk_amount as commission_paid,
  (ubh.price_bsk * 0.10) as expected_commission
FROM user_badge_holdings ubh
LEFT JOIN referral_tree rt ON rt.user_id = ubh.user_id AND rt.level = 1
LEFT JOIN referral_commissions rc ON rc.payer_id = ubh.user_id AND rc.commission_type = 'badge_subscription'
WHERE ubh.purchased_at IS NOT NULL
  AND ubh.price_bsk > 0
ORDER BY ubh.purchased_at DESC;

GRANT EXECUTE ON FUNCTION backfill_badge_commissions TO authenticated, service_role;
GRANT SELECT ON badge_commission_health TO authenticated, service_role;