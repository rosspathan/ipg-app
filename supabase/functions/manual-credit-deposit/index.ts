/**
 * DEPRECATED: manual-credit-deposit
 * 
 * This function is PERMANENTLY DISABLED.
 * 
 * SECURITY: All deposit crediting now happens exclusively via:
 * - monitor-custodial-deposits (server-side blockchain scanning)
 * - credit_custodial_deposit RPC (SECURITY DEFINER, atomic)
 * 
 * Direct balance manipulation is blocked at the database level by:
 * - trg_guard_custodial_deposits_insert (blocks authenticated inserts)
 * - trg_guard_wallet_balances_insert (blocks authenticated modifications)
 * - trg_guard_trading_ledger_insert (blocks authenticated inserts)
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

  console.log('[manual-credit-deposit] DEPRECATED: This function is permanently disabled');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'DEPRECATED: manual-credit-deposit is permanently disabled.',
      message: 'All deposit crediting is handled server-side by monitor-custodial-deposits. Direct balance manipulation is blocked at DB level.',
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
