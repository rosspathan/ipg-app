-- ============================================================
-- FIX: KYC approval reward must credit withdrawable, not holding
-- (holding is permanently sunset per BSK Sunset policy)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reward_kyc_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance_exists BOOLEAN;
  v_reward_bsk NUMERIC := 5;
  v_sponsor_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    SELECT EXISTS (SELECT 1 FROM public.user_bsk_balances WHERE user_id = NEW.user_id) INTO v_balance_exists;

    IF NOT v_balance_exists THEN
      INSERT INTO public.user_bsk_balances (user_id, holding_balance, withdrawable_balance, total_earned_holding, total_earned_withdrawable)
      VALUES (NEW.user_id, 0, 0, 0, 0);
    END IF;

    -- Credit 5 BSK to WITHDRAWABLE (Tradable) balance — holding is sunset
    BEGIN
      PERFORM record_bsk_transaction(
        p_user_id := NEW.user_id,
        p_idempotency_key := 'kyc_reward_' || NEW.user_id::text,
        p_tx_type := 'credit',
        p_tx_subtype := 'kyc_completion',
        p_balance_type := 'withdrawable',
        p_amount_bsk := v_reward_bsk,
        p_meta_json := jsonb_build_object('reward_type','kyc_approval','destination','withdrawable')
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never let reward failures block the KYC approval itself
      RAISE LOG 'KYC reward credit skipped for user %: %', NEW.user_id, SQLERRM;
    END;

    BEGIN
      INSERT INTO public.bonus_ledger (user_id, type, amount_bsk, meta_json)
      VALUES (NEW.user_id, 'kyc_completion', v_reward_bsk,
        jsonb_build_object('reward_type','kyc_approval','destination','withdrawable'))
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    SELECT sponsor_id INTO v_sponsor_id
    FROM public.referral_relationships WHERE referee_id = NEW.user_id LIMIT 1;

    IF v_sponsor_id IS NOT NULL THEN
      BEGIN
        PERFORM record_bsk_transaction(
          p_user_id := v_sponsor_id,
          p_idempotency_key := 'kyc_sponsor_reward_' || NEW.user_id::text,
          p_tx_type := 'credit',
          p_tx_subtype := 'kyc_referral_bonus',
          p_balance_type := 'withdrawable',
          p_amount_bsk := v_reward_bsk,
          p_meta_json := jsonb_build_object('reward_type','kyc_referral_bonus','referee_id',NEW.user_id,'destination','withdrawable')
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'KYC sponsor reward skipped for sponsor %: %', v_sponsor_id, SQLERRM;
      END;

      BEGIN
        INSERT INTO public.bonus_ledger (user_id, type, amount_bsk, meta_json)
        VALUES (v_sponsor_id, 'kyc_referral_bonus', v_reward_bsk,
          jsonb_build_object('reward_type','kyc_referral_bonus','referee_id',NEW.user_id,'destination','withdrawable'))
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    BEGIN
      INSERT INTO public.bsk_admin_operations (admin_id, operation_type, recipient_id, amount, notes)
      VALUES (
        COALESCE(NEW.reviewer_id, NEW.user_id), 'kyc_approval_reward', NEW.user_id, v_reward_bsk,
        'KYC approval reward: ' || v_reward_bsk || ' BSK to user (withdrawable)'
        || CASE WHEN v_sponsor_id IS NOT NULL THEN ' + ' || v_reward_bsk || ' BSK sponsor' ELSE '' END
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    UPDATE public.profiles SET is_kyc_approved = true WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================================
-- RE-RUN E2E PROOF after fix
-- =====================================================================
CREATE OR REPLACE FUNCTION public._record_kyc_step(
  p_step int, p_case text, p_pillar text, p_action text, p_notes text,
  p_user uuid, p_admin uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_b record; v_a record; v_audit uuid; v_ok bool := true; v_err text := NULL;
BEGIN
  SELECT documents_status::text d, face_status::text f, mobile_status::text m, final_status::text fn
    INTO v_b FROM kyc_profiles_new WHERE user_id=p_user;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_admin::text, 'role','authenticated')::text, true);
    PERFORM admin_update_kyc_pillar(p_user, p_pillar, p_action, p_notes);
  EXCEPTION WHEN OTHERS THEN
    v_ok := false; v_err := SQLERRM;
  END;
  SELECT documents_status::text d, face_status::text f, mobile_status::text m, final_status::text fn,
         rejection_reason r INTO v_a FROM kyc_profiles_new WHERE user_id=p_user;
  SELECT id INTO v_audit FROM kyc_decision_audit
    WHERE user_id=p_user AND pillar=p_pillar AND action=p_action
    ORDER BY created_at DESC LIMIT 1;
  INSERT INTO _kyc_e2e_proof VALUES (
    p_step, p_case, p_pillar, p_action, p_notes, v_ok, v_err,
    v_b.d, v_a.d, v_b.f, v_a.f, v_b.m, v_a.m, v_b.fn, v_a.fn, v_a.r, v_audit, now()
  );
END $$;

TRUNCATE public._kyc_e2e_proof;

DO $$
DECLARE
  v_admin uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_user  uuid := 'ff784fe2-df8b-4944-8f09-2257af2f032e';
BEGIN
  UPDATE kyc_profiles_new SET
    documents_status='pending_review', face_status='pending_review', mobile_status='pending_review',
    final_status='submitted', rejection_reason=NULL,
    documents_notes=NULL, face_notes=NULL, mobile_notes=NULL,
    final_approved_at=NULL, final_approved_by=NULL
  WHERE user_id=v_user;

  PERFORM _record_kyc_step(1,  'Approve Documents',  'documents','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(2,  'Reject Documents',   'documents','reject', 'Doc photo blurry', v_user, v_admin);
  PERFORM _record_kyc_step(3,  'Resubmit Documents', 'documents','request_resubmission','Please reupload front', v_user, v_admin);
  PERFORM _record_kyc_step(4,  'Re-approve Documents','documents','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(5,  'Approve Face',       'face','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(6,  'Reject Face',        'face','reject','Face not matching ID', v_user, v_admin);
  PERFORM _record_kyc_step(7,  'Resubmit Face',      'face','request_resubmission','Retake selfie', v_user, v_admin);
  PERFORM _record_kyc_step(8,  'Re-approve Face',    'face','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(9,  'Approve Mobile',     'mobile','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(10, 'Reject Mobile',      'mobile','reject','Number unreachable', v_user, v_admin);
  PERFORM _record_kyc_step(11, 'Resubmit Mobile',    'mobile','request_resubmission','Provide alternate', v_user, v_admin);
  PERFORM _record_kyc_step(12, 'Re-approve Mobile',  'mobile','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(13, 'Final Approve',      'final','approve','All checks pass', v_user, v_admin);
END $$;

DROP FUNCTION public._record_kyc_step(int, text, text, text, text, uuid, uuid);