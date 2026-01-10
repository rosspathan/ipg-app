/**
 * Release Trading Balance Edge Function
 * 
 * Releases funds from the trading balance back to the user's on-chain control.
 * This is a ledger-only operation - the tokens are already in the user's wallet,
 * we just reduce the internal "available for trading" balance.
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
    // Get user from auth header
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

    // Get user's current balance
    const { data: balance, error: balanceError } = await supabase
      .from('wallet_balances')
      .select('available, locked, total')
      .eq('user_id', user.id)
      .eq('asset_id', asset.id)
      .single();

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ success: false, error: 'No trading balance found for this asset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const available = balance.available || 0;

    if (amount > available) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient available balance. Available: ${available}, Requested: ${amount}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reduce the trading balance (release back to on-chain control)
    const newAvailable = available - amount;

    // Update balance (total is auto-calculated from available + locked)
    const { error: updateError } = await supabase
      .from('wallet_balances')
      .update({
        available: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('asset_id', asset.id);

    if (updateError) {
      console.error('[release-trading-balance] Update failed:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[release-trading-balance] ✓ Released ${amount} ${asset_symbol} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        released: amount,
        symbol: asset_symbol,
        new_available: newAvailable
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
