/**
 * DEPRECATED: sync-onchain-to-trading
 * 
 * This function is DISABLED as part of the hot-wallet custodial model.
 * 
 * In the new model:
 * - Trading balances are ONLY credited when users deposit to the platform hot wallet
 * - monitor-custodial-deposits is the only function that can credit wallet_balances
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

  console.log('[sync-onchain-to-trading] DEPRECATED: This function is disabled');
  console.log('[sync-onchain-to-trading] Use hot-wallet deposit flow instead');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'DEPRECATED: This function is disabled. Deposit funds to the platform hot wallet to credit your trading balance.',
      message: 'The sync-onchain-to-trading function has been replaced with the custodial hot-wallet model. Please deposit tokens to the platform deposit address to credit your trading account.'
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
