/**
 * Release Trading Balance Edge Function
 * 
 * Releases funds from the trading balance back to the user's on-chain control.
 * Uses the atomic execute_internal_balance_transfer RPC with FOR UPDATE locking.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleaseRequest {
  asset_symbol: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ReleaseRequest = await req.json();
    const { asset_symbol, amount } = body;

    console.log(`[release-trading-balance] User ${user.id} releasing ${amount} ${asset_symbol}`);

    if (!asset_symbol || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, symbol')
      .eq('symbol', asset_symbol)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ success: false, error: `Asset ${asset_symbol} not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use atomic RPC with FOR UPDATE locking
    const { data: result, error: rpcError } = await supabase.rpc(
      'execute_internal_balance_transfer',
      {
        p_user_id: user.id,
        p_asset_id: asset.id,
        p_amount: amount,
        p_direction: 'from_trading',
      }
    );

    if (rpcError) {
      console.error('[release-trading-balance] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message || 'Failed to release balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!result?.success) {
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Failed to release balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[release-trading-balance] ✓ Released ${amount} ${asset_symbol} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        released: amount,
        symbol: asset_symbol,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[release-trading-balance] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
