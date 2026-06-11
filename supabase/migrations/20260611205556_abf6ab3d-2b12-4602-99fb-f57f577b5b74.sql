-- 1) Hide anti-sybil parameters from public reads of bsk_vesting_config.
DROP POLICY IF EXISTS "Users can view active vesting config" ON public.bsk_vesting_config;

CREATE OR REPLACE VIEW public.bsk_vesting_config_public
WITH (security_invoker = false) AS
SELECT
  id,
  is_enabled,
  vesting_duration_days,
  daily_release_percent,
  referral_reward_percent,
  eligible_chains,
  max_vesting_per_user,
  min_ipg_swap_amount,
  max_ipg_swap_amount,
  created_at,
  updated_at
FROM public.bsk_vesting_config
WHERE is_enabled = true;

GRANT SELECT ON public.bsk_vesting_config_public TO anon, authenticated;

-- 2) Lock down Realtime Broadcast/Presence authorization (deny by default).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;