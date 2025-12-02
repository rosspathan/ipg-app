-- Fix reward_kyc_approval trigger to use correct column name
CREATE OR REPLACE FUNCTION public.reward_kyc_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_exists BOOLEAN;
  v_reward_bsk NUMERIC := 5;
  v_sponsor_id UUID;
BEGIN
  -- Only proceed if status changed from non-approved to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Check if balance record exists
    SELECT EXISTS (
      SELECT 1 FROM public.user_bsk_balances WHERE user_id = NEW.user_id
    ) INTO v_balance_exists;
    
    -- Create balance record if it doesn't exist
    IF NOT v_balance_exists THEN
      INSERT INTO public.user_bsk_balances (user_id, holding_balance, withdrawable_balance, total_earned_holding, total_earned_withdrawable)
      VALUES (NEW.user_id, 0, 0, 0, 0);
    END IF;
    
    -- Credit 5 BSK to holding balance using record_bsk_transaction
    PERFORM record_bsk_transaction(
      p_user_id := NEW.user_id,
      p_idempotency_key := 'kyc_reward_' || NEW.user_id::text,
      p_tx_type := 'credit',
      p_tx_subtype := 'kyc_completion',
      p_balance_type := 'holding',
      p_amount_bsk := v_reward_bsk,
      p_meta_json := jsonb_build_object(
        'reward_type', 'kyc_approval',
        'destination', 'holding'
      )
    );
    
    -- Create bonus ledger entry
    INSERT INTO public.bonus_ledger (user_id, type, amount_bsk, meta_json)
    VALUES (NEW.user_id, 'kyc_completion', v_reward_bsk, jsonb_build_object(
      'reward_type', 'kyc_approval',
      'destination', 'holding'
    ))
    ON CONFLICT DO NOTHING;
    
    -- Lookup sponsor from referral_relationships
    SELECT referrer_id INTO v_sponsor_id
    FROM public.referral_relationships
    WHERE referee_id = NEW.user_id
    LIMIT 1;
    
    -- Credit sponsor if exists
    IF v_sponsor_id IS NOT NULL THEN
      -- Credit 5 BSK to sponsor's holding balance
      PERFORM record_bsk_transaction(
        p_user_id := v_sponsor_id,
        p_idempotency_key := 'kyc_sponsor_reward_' || NEW.user_id::text,
        p_tx_type := 'credit',
        p_tx_subtype := 'kyc_referral_bonus',
        p_balance_type := 'holding',
        p_amount_bsk := v_reward_bsk,
        p_meta_json := jsonb_build_object(
          'reward_type', 'kyc_referral_bonus',
          'referee_id', NEW.user_id,
          'destination', 'holding'
        )
      );
      
      -- Create sponsor ledger entry
      INSERT INTO public.bonus_ledger (user_id, type, amount_bsk, meta_json)
      VALUES (v_sponsor_id, 'kyc_referral_bonus', v_reward_bsk, jsonb_build_object(
        'reward_type', 'kyc_referral_bonus',
        'referee_id', NEW.user_id,
        'destination', 'holding'
      ))
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Log admin operation (FIX: use reviewer_id instead of reviewed_by)
    INSERT INTO public.bsk_admin_operations (
      admin_id,
      operation_type,
      recipient_id,
      amount,
      notes
    ) VALUES (
      COALESCE(NEW.reviewer_id, NEW.user_id),  -- FIXED: reviewer_id instead of reviewed_by
      'kyc_approval_reward',
      NEW.user_id,
      v_reward_bsk,
      'KYC approval reward: ' || v_reward_bsk || ' BSK to user' || 
      CASE WHEN v_sponsor_id IS NOT NULL THEN ' and ' || v_reward_bsk || ' BSK to sponsor' ELSE '' END
    );
    
    -- Update profiles.is_kyc_approved = TRUE
    UPDATE public.profiles
    SET is_kyc_approved = true
    WHERE user_id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;