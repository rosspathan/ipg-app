DO $$
DECLARE
  v_run_id    uuid := gen_random_uuid();
  v_user_id   uuid := '403bd2b1-94de-47d8-8223-f762bbc3c0bd';
  v_admin_id  uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_phone     text := '+155500' || floor(random()*100000)::text;
  v_data      jsonb;
  v_row       public.kyc_profiles_new;
  v_observed  jsonb; v_expected jsonb; v_pass boolean; v_n int;
  v_had_profile boolean;
  v_orig_kyc_status text;
  v_orig_is_kyc_approved boolean;
BEGIN
  SELECT TRUE, kyc_status, is_kyc_approved
    INTO v_had_profile, v_orig_kyc_status, v_orig_is_kyc_approved
  FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    v_had_profile := false;
    INSERT INTO public.profiles (user_id, email, username, full_name, is_kyc_approved, kyc_status, referral_code)
    VALUES (v_user_id, 'qa+'||substr(v_user_id::text,1,8)||'@kyc.test',
            'qa_'||substr(v_user_id::text,1,8), 'KYC QA Test', false, 'pending',
            'QA'||substr(v_user_id::text,1,6));
  END IF;

  v_data := jsonb_build_object(
    'full_name','KYC QA Test','date_of_birth','1990-01-01','nationality','India',
    'phone',v_phone,'address_line1','1 Test Street','city','Test City','country','India',
    'postal_code','000001','id_type','passport','id_number','TEST'||substr(v_user_id::text,1,8),
    'id_front_url',v_user_id::text||'/L1/id_front.jpg',
    'id_back_url', v_user_id::text||'/L1/id_back.jpg',
    'selfie_url',  v_user_id::text||'/L1/selfie.jpg'
  );

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id::text, 'role','authenticated')::text, true);
  v_row := public.submit_kyc_l1(v_data);
  v_observed := jsonb_build_object('documents',v_row.documents_status,'face',v_row.face_status,'mobile',v_row.mobile_status,'final',v_row.final_status);
  v_expected := jsonb_build_object('documents','pending_review','face','pending_review','mobile','pending_review','final','submitted');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'1. New user submits full KYC',v_pass,v_observed,v_expected);

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id::text, 'role','authenticated')::text, true);
  SELECT COUNT(*) INTO v_n FROM public.admin_kyc_pending_queue() q WHERE q.user_id = v_user_id;
  v_observed := jsonb_build_object('rows_in_queue',v_n); v_expected := jsonb_build_object('rows_in_queue',3);
  v_pass := v_n = 3;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'2. Submission appears in admin queue (3 pillar rows)',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'documents','approve','LGTM');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('documents',v_row.documents_status,'face',v_row.face_status,'mobile',v_row.mobile_status);
  v_expected := jsonb_build_object('documents','approved','face','pending_review','mobile','pending_review');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'3. Admin approves documents only',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'mobile','reject','number unreachable');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('mobile',v_row.mobile_status,'reason',v_row.mobile_notes,'final',v_row.final_status);
  v_expected := jsonb_build_object('mobile','rejected','reason','number unreachable','final','rejected');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'4. Admin rejects mobile with reason',v_pass,v_observed,v_expected);

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id::text, 'role','authenticated')::text, true);
  v_data := v_data || jsonb_build_object('phone','+155501'||floor(random()*100000)::text);
  v_row := public.submit_kyc_l1(v_data);
  v_observed := jsonb_build_object('documents',v_row.documents_status,'face',v_row.face_status,'mobile',v_row.mobile_status);
  v_expected := jsonb_build_object('documents','approved','face','pending_review','mobile','pending_review');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected,notes)
  VALUES (v_run_id,'5. Resubmit: approved docs preserved, rejected mobile -> pending',v_pass,v_observed,v_expected,
          'Critical: this was the original bug where submit_kyc_l1 wiped approved pillars.');

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id::text, 'role','authenticated')::text, true);
  SELECT COUNT(*) INTO v_n FROM public.admin_kyc_pending_queue() q WHERE q.user_id=v_user_id AND q.pillar='mobile' AND q.status='pending_review';
  v_observed := jsonb_build_object('mobile_pending_rows',v_n); v_expected := jsonb_build_object('mobile_pending_rows',1);
  v_pass := v_n = 1;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'6. Admin sees latest resubmission immediately',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'face','approve','match ok');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('face',v_row.face_status); v_expected := jsonb_build_object('face','approved');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'7. Admin approves face',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'mobile','approve','reached');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('mobile',v_row.mobile_status); v_expected := jsonb_build_object('mobile','approved');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'8. Admin approves mobile (now 3 green)',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'final','approve',NULL);
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('final',v_row.final_status,'is_kyc_approved', public.is_kyc_approved(v_user_id));
  v_expected := jsonb_build_object('final','approved','is_kyc_approved',true);
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'9. Final approval works after all pillars green',v_pass,v_observed,v_expected);

  SELECT COUNT(*) INTO v_n FROM public.admin_kyc_pending_queue() q WHERE q.user_id=v_user_id;
  v_observed := jsonb_build_object('rows_in_queue',v_n); v_expected := jsonb_build_object('rows_in_queue',0);
  v_pass := v_n = 0;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'10. Approved user removed from pending queue',v_pass,v_observed,v_expected);

  PERFORM public.admin_update_kyc_pillar(v_user_id,'documents','reject','blurred photo');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object('documents',v_row.documents_status,'final',v_row.final_status,'is_kyc_approved',public.is_kyc_approved(v_user_id));
  v_expected := jsonb_build_object('documents','rejected','final','rejected','is_kyc_approved',false);
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected,notes)
  VALUES (v_run_id,'11. Admin rejects documents post-approval; gate re-locks',v_pass,v_observed,v_expected,
          'Demote path proves trading/withdraw gates re-lock instantly.');

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id::text, 'role','authenticated')::text, true);
  v_row := public.submit_kyc_l1(v_data);
  v_observed := jsonb_build_object('documents',v_row.documents_status,'face',v_row.face_status,'mobile',v_row.mobile_status);
  v_expected := jsonb_build_object('documents','pending_review','face','approved','mobile','approved');
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'12. Resubmit rejected docs only — face/mobile remain approved',v_pass,v_observed,v_expected);

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id::text, 'role','authenticated')::text, true);
  PERFORM public.admin_update_kyc_pillar(v_user_id,'documents','approve','re-checked');
  PERFORM public.admin_update_kyc_pillar(v_user_id,'final','approve',NULL);
  BEGIN
    PERFORM public.admin_update_kyc_pillar(v_user_id,'face','request_resubmission','');
    v_pass := false; v_observed := jsonb_build_object('error',null);
  EXCEPTION WHEN OTHERS THEN
    v_pass := SQLERRM ILIKE '%Reason is required%';
    v_observed := jsonb_build_object('error',SQLERRM);
  END;
  v_expected := jsonb_build_object('error','Reason is required for request_resubmission');
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'13. RPC enforces mandatory reason on resubmission',v_pass,v_observed,v_expected);

  PERFORM public.admin_reset_kyc_profile(v_user_id, 'manual reset for QA test');
  SELECT * INTO v_row FROM public.kyc_profiles_new WHERE user_id=v_user_id;
  v_observed := jsonb_build_object(
    'documents',v_row.documents_status,'face',v_row.face_status,'mobile',v_row.mobile_status,
    'final',v_row.final_status,'is_kyc_approved',public.is_kyc_approved(v_user_id),
    'audit_rows',(SELECT COUNT(*) FROM public.kyc_decision_audit WHERE user_id=v_user_id AND action='reset'));
  v_expected := jsonb_build_object('documents','needs_resubmission','face','needs_resubmission','mobile','needs_resubmission','final','needs_resubmission','is_kyc_approved',false,'audit_rows',4);
  v_pass := v_observed = v_expected;
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'14. admin_reset_kyc_profile resets + audits + re-locks',v_pass,v_observed,v_expected);

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id::text, 'role','authenticated')::text, true);
  BEGIN
    PERFORM public.admin_reset_kyc_profile(v_user_id, 'try to escalate');
    v_pass := false; v_observed := jsonb_build_object('error',null);
  EXCEPTION WHEN OTHERS THEN
    v_pass := SQLERRM ILIKE '%Only admins%'; v_observed := jsonb_build_object('error',SQLERRM);
  END;
  v_expected := jsonb_build_object('error','Only admins can reset KYC profiles');
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'15. Non-admin blocked from admin_reset_kyc_profile',v_pass,v_observed,v_expected);

  BEGIN
    PERFORM public.admin_update_kyc_pillar(v_user_id,'documents','approve','escalate');
    v_pass := false; v_observed := jsonb_build_object('error',null);
  EXCEPTION WHEN OTHERS THEN
    v_pass := SQLERRM ILIKE '%Only admins%'; v_observed := jsonb_build_object('error',SQLERRM);
  END;
  v_expected := jsonb_build_object('error','Only admins can update KYC pillars');
  INSERT INTO public.kyc_qa_results(run_id,scenario,pass,observed,expected) VALUES (v_run_id,'16. Non-admin blocked from admin_update_kyc_pillar',v_pass,v_observed,v_expected);

  -- Cleanup (kyc_decision_audit is append-only and will retain the QA run rows by design)
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id::text, 'role','authenticated')::text, true);
  ALTER TABLE public.kyc_profiles_new DISABLE TRIGGER trg_kyc_protect_submitted_data;
  ALTER TABLE public.kyc_profiles_new DISABLE TRIGGER trg_enforce_kyc_state_machine;
  DELETE FROM public.kyc_profiles_new WHERE user_id = v_user_id;
  ALTER TABLE public.kyc_profiles_new ENABLE TRIGGER trg_kyc_protect_submitted_data;
  ALTER TABLE public.kyc_profiles_new ENABLE TRIGGER trg_enforce_kyc_state_machine;

  IF NOT v_had_profile THEN
    DELETE FROM public.profiles WHERE user_id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET is_kyc_approved = COALESCE(v_orig_is_kyc_approved,false),
        kyc_status      = COALESCE(v_orig_kyc_status,'pending')
    WHERE user_id = v_user_id;
  END IF;

  RAISE NOTICE 'KYC QA run complete: run_id=%', v_run_id;
END $$;