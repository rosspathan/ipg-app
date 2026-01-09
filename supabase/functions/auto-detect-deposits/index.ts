/**
 * DEPRECATED: auto-detect-deposits
 * 
 * This function is DISABLED as part of the hot-wallet custodial model.
 * 
 * In the new model:
 * - Trading balances are ONLY credited when users deposit to the platform hot wallet
 * - monitor-custodial-deposits scans the hot wallet for incoming deposits
 * - Users' personal on-chain wallets are for display only, not for trading
 * 
 * DO NOT RE-ENABLE THIS FUNCTION.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[auto-detect-deposits] DEPRECATED: This function is disabled');
  console.log('[auto-detect-deposits] Use monitor-custodial-deposits instead');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'DEPRECATED: This function is disabled. The platform now uses custodial hot-wallet deposits.',
      message: 'The auto-detect-deposits function has been replaced. Deposits are now detected via monitor-custodial-deposits which scans the platform hot wallet.',
      processed: 0,
      deposits: []
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
