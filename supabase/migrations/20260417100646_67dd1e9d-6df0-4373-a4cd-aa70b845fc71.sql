DO $$
DECLARE
  v_user_id UUID := '31e7316f-b1bc-44de-98ac-6c0da8b4fc96';
  v_admin_id UUID;
  v_amount NUMERIC := 3333;
  v_before NUMERIC;
  v_after NUMERIC;
  v_ref_id UUID := gen_random_uuid();
  v_idem TEXT := 'badge_bonus_remediation_vip_31e7316f_2025-11-22';
BEGIN
  -- Idempotency guard: skip if already credited
  IF EXISTS (SELECT 1 FROM unified_bsk_ledger WHERE idempotency_key = v_idem) THEN
    RAISE NOTICE 'Already credited (idempotency hit). Skipping.';
    RETURN;
  END IF;

  SELECT user_id INTO v_admin_id FROM user_roles WHERE role = 'admin' LIMIT 1;

  SELECT withdrawable_balance INTO v_before
  FROM user_bsk_balances WHERE user_id = v_user_id FOR UPDATE;

  IF v_before IS NULL THEN
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding)
    VALUES (v_user_id, 0, 0, 0, 0);
    v_before := 0;
  END IF;

  v_after := v_before + v_amount;

  UPDATE user_bsk_balances
  SET withdrawable_balance = v_after,
      total_earned_withdrawable = COALESCE(total_earned_withdrawable, 0) + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO unified_bsk_ledger (
    id, user_id, idempotency_key, tx_type, tx_subtype, balance_type, amount_bsk,
    notes, meta_json, status, created_at
  ) VALUES (
    v_ref_id, v_user_id, v_idem, 'credit', 'badge_bonus_remediation', 'withdrawable', v_amount,
    'Remediation: Missed VIP badge holding bonus (10,000 BSK) sunset-converted at 3:1 = 3,333 Tradable BSK (1 BSK remainder burned). Original purchase 2025-11-22 fffdb796-92f7-412e-bc36-e50f8bb56692.',
    jsonb_build_object(
      'remediation_type', 'missed_badge_bonus',
      'badge_name', 'VIP',
      'original_purchase_id', 'fffdb796-92f7-412e-bc36-e50f8bb56692',
      'original_purchase_date', '2025-11-22',
      'intended_holding_bonus', 10000,
      'conversion_ratio', 3,
      'remainder_burned', 1,
      'tradable_credited', 3333
    ),
    'completed', now()
  );

  INSERT INTO admin_balance_adjustments (
    admin_user_id, target_user_id, balance_type, operation, amount,
    before_balance, after_balance, reason
  ) VALUES (
    v_admin_id, v_user_id, 'withdrawable', 'credit', v_amount,
    v_before, v_after,
    'Remediation: Missed VIP badge bonus (10k holding @ purchase 2025-11-22) -> 3,333 Tradable BSK after 3:1 sunset conversion. Confirmed via forensic audit; no badge_bonus credit ever issued for purchase fffdb796.'
  );

  INSERT INTO bsk_balance_audit_log (
    user_id, operation, old_withdrawable, new_withdrawable,
    old_holding, new_holding, context, changed_by
  ) VALUES (
    v_user_id, 'remediation_credit', v_before, v_after, 0, 0,
    'VIP badge bonus remediation: 3333 Tradable BSK', v_admin_id
  );

  RAISE NOTICE 'Credited % Tradable BSK. Before: %, After: %', v_amount, v_before, v_after;
END $$;