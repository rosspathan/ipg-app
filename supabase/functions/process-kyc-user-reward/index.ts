// PERMANENTLY DISABLED 2026-04-29
//
// KYC bonuses and KYC referral bonuses have been removed from the platform.
// KYC is compliance-only — no BSK (or any other token) is credited for KYC
// submission, KYC approval, KYC pillar approval, KYC final approval, or KYC
// referrals.
//
// This function is kept as a safe no-op so any stale frontend or edge-function
// caller (or queued retry) cannot accidentally credit balances. Do NOT
// re-enable. If a future business decision reverses this, create a new
// function with a different name and a new audit trail.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[KYC Reward] DISABLED — KYC bonuses permanently removed (compliance-only).');

  return new Response(
    JSON.stringify({
      success: true,
      disabled: true,
      reward_bsk: 0,
      sponsor_reward_bsk: 0,
      message: 'KYC rewards are permanently disabled. KYC is compliance-only.',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
});
