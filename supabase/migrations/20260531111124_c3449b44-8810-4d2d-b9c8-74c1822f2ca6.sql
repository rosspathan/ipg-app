DO $$
DECLARE
  v_user uuid := '7786866b-ec98-4911-b065-ae3d2ffe5c91';
  v_admin uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_wallet text := '0xDBdf59C206972E3EDDc8D9eEE95ec0BC6B834534';
  v_prev text;
BEGIN
  SELECT account_status INTO v_prev FROM public.profiles WHERE user_id = v_user;

  UPDATE public.profiles
  SET account_status = 'held',
      is_suspended = true,
      suspension_reason = 'Wallet under investigation: ' || v_wallet,
      suspended_at = now(),
      suspended_by = v_admin,
      withdrawal_locked = true,
      updated_at = now()
  WHERE user_id = v_user;

  INSERT INTO public.account_holds
    (user_id, wallet_address, action, reason, previous_status, new_status, performed_by)
  VALUES
    (v_user, v_wallet, 'hold',
     'Wallet under investigation: ' || v_wallet,
     v_prev, 'held', v_admin);
END $$;