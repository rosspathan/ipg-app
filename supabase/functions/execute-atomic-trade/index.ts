/**
 * DEPRECATED: execute-atomic-trade
 * 
 * This edge function is DISABLED.
 * 
 * All trade settlement now happens inside the database via:
 * - execute_trade() — atomic PL/pgSQL settlement engine
 * - execute_trade_serializable() — serializable wrapper with retry
 * 
 * The match-orders edge function calls execute_trade_serializable directly.
 * No edge function should perform separate debit/credit RPCs.
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

  console.log('[execute-atomic-trade] DEPRECATED: Use execute_trade_serializable RPC via match-orders');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'DEPRECATED: This function is disabled. Trade settlement is handled atomically inside the database.',
    }),
    { 
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
