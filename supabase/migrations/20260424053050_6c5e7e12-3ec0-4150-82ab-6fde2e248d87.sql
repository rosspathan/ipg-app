DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'vijju.vvip90@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  PERFORM set_config('app.kyc_admin_demote', 'on', true);

  DELETE FROM public.kyc_profiles_new WHERE user_id = v_user_id;
  DELETE FROM public.kyc_profiles WHERE user_id = v_user_id;

  UPDATE public.profiles
  SET 
    is_kyc_approved = false,
    kyc_status = 'pending',
    updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_table, target_id, details)
  VALUES (
    v_user_id,
    'kyc_full_reset',
    'kyc_profiles_new',
    v_user_id,
    jsonb_build_object(
      'email', 'vijju.vvip90@gmail.com',
      'reason', 'Admin requested full KYC reset to allow fresh resubmission',
      'reset_at', now()
    )
  );
END $$;