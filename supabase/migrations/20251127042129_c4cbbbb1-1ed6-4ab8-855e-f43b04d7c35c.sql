-- Create RPC function to calculate real-time VIP referral count
CREATE OR REPLACE FUNCTION public.get_vip_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_direct_vip_count INTEGER := 0;
  v_total_team_vip_count INTEGER := 0;
  v_is_user_vip BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Check if user is VIP
  SELECT 
    CASE 
      WHEN UPPER(TRIM(current_badge)) LIKE '%VIP%' OR UPPER(TRIM(current_badge)) LIKE '%SMART%' 
      THEN true 
      ELSE false 
    END INTO v_is_user_vip
  FROM public.user_badge_holdings
  WHERE user_id = p_user_id;

  v_is_user_vip := COALESCE(v_is_user_vip, false);

  -- Count direct (L1) VIP referrals
  SELECT COUNT(*) INTO v_direct_vip_count
  FROM public.referral_tree rt
  INNER JOIN public.user_badge_holdings ubh ON rt.user_id = ubh.user_id
  WHERE rt.ancestor_id = p_user_id
    AND rt.level = 1
    AND (UPPER(TRIM(ubh.current_badge)) LIKE '%VIP%' OR UPPER(TRIM(ubh.current_badge)) LIKE '%SMART%');

  -- Count all VIPs in team (all levels)
  SELECT COUNT(*) INTO v_total_team_vip_count
  FROM public.referral_tree rt
  INNER JOIN public.user_badge_holdings ubh ON rt.user_id = ubh.user_id
  WHERE rt.ancestor_id = p_user_id
    AND (UPPER(TRIM(ubh.current_badge)) LIKE '%VIP%' OR UPPER(TRIM(ubh.current_badge)) LIKE '%SMART%');

  -- Build result
  v_result := jsonb_build_object(
    'is_user_vip', v_is_user_vip,
    'direct_vip_count', v_direct_vip_count,
    'total_team_vip_count', v_total_team_vip_count
  );

  RETURN v_result;
END;
$function$;