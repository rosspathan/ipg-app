DO $$
DECLARE r record;
BEGIN
FOR r IN SELECT * FROM (VALUES
 ('bsk_rates','Users can view BSK rates'),
 ('bsk_rate_history','Anyone can read BSK rate history'),
 ('bsk_rate_snapshots','Users can view rate snapshots'),
 ('bsk_loan_settings','Users can view loan settings'),
 ('bsk_admin_settings','Users can view BSK settings'),
 ('ipg_admin_settings','Users can view IPG settings'),
 ('bonus_assets','Users can view bonus assets'),
 ('bonus_prices','Users can view bonus_prices'),
 ('crypto_staking_config','Anyone can read staking config'),
 ('referral_admin_config','Users can view referral config'),
 ('referral_global_settings','Users can view global settings'),
 ('team_referral_settings','Users can view team referral settings'),
 ('badge_system_settings','Users can view badge settings'),
 ('badge_card_config','Users can view badge card config'),
 ('ad_mining_settings','Users can view ad mining settings'),
 ('draw_prizes','Users can view draw prizes'),
 ('draw_results','Users can view draw results'),
 ('program_flags','Anyone can view program flags'),
 ('program_milestone_templates','Templates readable'),
 ('mobile_linking_settings','Everyone can read mobile linking settings'),
 ('scratch_card_config','config readable by authenticated')
) v(t,p) LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.p, r.t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', r.p, r.t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', r.t);
END LOOP;
END $$;