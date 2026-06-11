-- 1. Record the verified treasury funding deposit (100 BSK)
SELECT public.scratch_fund_treasury_from_deposit(
  '0x8d2083d8dfc4f38503f3dcf16b0b05326d3329d54855743d314191790870f612',
  100,
  '0xd513bf1ee0f90f1a530ef7375dd54be9498d8661',
  'Initial treasury funding from verified hot wallet deposit (100 BSK)'
);

-- 2. Enable the campaign and move to live launch phase
UPDATE public.scratch_card_config
SET is_enabled = true,
    launch_phase = 2,
    campaign_start_at = COALESCE(campaign_start_at, now()),
    updated_at = now()
WHERE singleton = true;