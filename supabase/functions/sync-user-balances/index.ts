/**
 * DEPRECATED: sync-user-balances
 * 
 * This function is DISABLED as part of the hot-wallet custodial model.
 * 
 * SECURITY FIX: This function was bypassing the custodial deposit flow by
 * directly reading on-chain balances and crediting wallet_balances.
 * This allowed users to have trading funds without actual deposits.
 * 
 * In the correct model:
 * - Trading balances are ONLY credited via custodial deposits to hot wallet
 * - Use monitor-custodial-deposits for deposit detection
 * - Use sync-bep20-balances for on-chain balance DISPLAY only (onchain_balances table)
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

  console.log('[sync-user-balances] DEPRECATED: This function is disabled');
  console.log('[sync-user-balances] Trading balances must come from hot wallet deposits only');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'DEPRECATED: This function is disabled.',
      message: 'Direct balance syncing is disabled. Deposit to the platform hot wallet to credit your trading balance.',
      synced: 0
    }),
    { 
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
