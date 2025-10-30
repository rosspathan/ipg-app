-- Drop and recreate refund function with corrected column names
DROP FUNCTION IF EXISTS public.refund_failed_badge_purchases();

CREATE FUNCTION public.refund_failed_badge_purchases()
RETURNS TABLE (
  refund_user_id UUID,
  refund_badge_name TEXT,
  refund_amount NUMERIC,
  refund_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_refunded_count INTEGER := 0;
BEGIN
  FOR v_record IN
    SELECT 
      bp.user_id as buyer_id,
      bp.badge_name as purchased_badge,
      bp.bsk_amount as paid_amount,
      bp.id as purchase_id
    FROM badge_purchases bp
    LEFT JOIN user_badge_holdings ubh ON bp.user_id = ubh.user_id 
      AND bp.badge_name = ubh.current_badge
    WHERE bp.status = 'completed' 
      AND ubh.user_id IS NULL
  LOOP
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, updated_at)
    VALUES (v_record.buyer_id, v_record.paid_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + EXCLUDED.withdrawable_balance,
      updated_at = NOW();
    
    UPDATE badge_purchases
    SET status = 'refunded', updated_at = NOW()
    WHERE id = v_record.purchase_id;
    
    INSERT INTO insurance_bsk_ledger (
      user_id, type, plan_type, bsk_amount, inr_amount, rate_snapshot, destination, metadata
    ) VALUES (
      v_record.buyer_id, 'refund', 'badge_purchase_failed', v_record.paid_amount,
      0, 1, 'withdrawable',
      json_build_object('reason', 'failed_badge_assignment', 'original_badge', v_record.purchased_badge, 'refund_timestamp', NOW())
    );
    
    v_refunded_count := v_refunded_count + 1;
    
    RETURN QUERY SELECT v_record.buyer_id, v_record.purchased_badge, v_record.paid_amount, 'refunded'::TEXT;
  END LOOP;
  
  IF v_refunded_count = 0 THEN
    RETURN QUERY SELECT NULL::UUID, 'No failed purchases found'::TEXT, 0::NUMERIC, 'none'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_failed_badge_purchases TO service_role;