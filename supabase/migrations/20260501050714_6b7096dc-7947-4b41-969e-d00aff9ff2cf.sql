CREATE OR REPLACE FUNCTION public.admin_kyc_access_check(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_profile public.kyc_profiles_new%ROWTYPE;
  v_approved boolean;
  v_doc text;
  v_face text;
  v_mobile text;
  v_final text;
  v_block_reason text;
  v_action_block jsonb;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required' USING ERRCODE = '42501';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile
  FROM public.kyc_profiles_new
  WHERE user_id = target_user_id;

  v_doc    := COALESCE(v_profile.documents_status::text, 'not_submitted');
  v_face   := COALESCE(v_profile.face_status::text,      'not_submitted');
  v_mobile := COALESCE(v_profile.mobile_status::text,    'not_submitted');
  v_final  := COALESCE(v_profile.final_status::text,     'not_started');

  v_approved := public.is_kyc_approved(target_user_id);

  IF v_approved THEN
    v_block_reason := NULL;
  ELSIF v_doc <> 'approved' THEN
    v_block_reason := 'Documents not approved (' || v_doc || ')';
  ELSIF v_face <> 'approved' THEN
    v_block_reason := 'Face verification not approved (' || v_face || ')';
  ELSIF v_mobile <> 'approved' THEN
    v_block_reason := 'Admin mobile verification not approved (' || v_mobile || ')';
  ELSIF v_final <> 'approved' THEN
    v_block_reason := 'Awaiting final admin approval (' || v_final || ')';
  ELSE
    v_block_reason := 'Blocked by KYC';
  END IF;

  v_action_block := jsonb_build_object(
    'trade',                    jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'withdraw_crypto',          jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'withdraw_bsk',             jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'migrate_bsk_onchain',      jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'wallet_to_trading',        jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'trading_to_wallet',        jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'internal_transfer',        jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'bsk_transfer',             jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'swap',                     jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'stake',                    jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK')),
    'apply_loan',               jsonb_build_object('allowed', v_approved, 'reason', COALESCE(v_block_reason, 'OK'))
  );

  RETURN jsonb_build_object(
    'user_id', target_user_id,
    'is_kyc_approved', v_approved,
    'block_reason', v_block_reason,
    'pillars', jsonb_build_object(
      'documents', jsonb_build_object(
        'status', v_doc,
        'notes',  v_profile.documents_notes,
        'reviewed_at', v_profile.documents_reviewed_at,
        'reviewed_by', v_profile.documents_reviewed_by
      ),
      'face', jsonb_build_object(
        'status', v_face,
        'notes',  v_profile.face_notes,
        'reviewed_at', v_profile.face_reviewed_at,
        'reviewed_by', v_profile.face_reviewed_by
      ),
      'mobile', jsonb_build_object(
        'status', v_mobile,
        'notes',  v_profile.mobile_notes,
        'reviewed_at', v_profile.mobile_verified_at,
        'reviewed_by', v_profile.mobile_verified_by,
        'phone_number', v_profile.mobile_number
      ),
      'final', jsonb_build_object(
        'status', v_final,
        'reviewed_at', v_profile.final_approved_at,
        'reviewed_by', v_profile.final_approved_by,
        'rejection_reason', v_profile.rejection_reason
      )
    ),
    'actions', v_action_block,
    'profile_present', v_profile.user_id IS NOT NULL,
    'checked_at', now()
  );
END
$function$;