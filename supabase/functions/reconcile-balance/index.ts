import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { asset_symbol } = await req.json();
    
    if (!asset_symbol) {
      return new Response(
        JSON.stringify({ error: 'asset_symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reconciling balance for user ${user.id}, asset: ${asset_symbol}`);

    // Get current balance state
    const { data: balanceBefore } = await supabaseClient
      .from('wallet_balances')
      .select(`
        available,
        locked,
        assets!inner(symbol)
      `)
      .eq('user_id', user.id)
      .eq('assets.symbol', asset_symbol)
      .maybeSingle();

    // Count actual pending orders for this asset
    const { data: pendingOrders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('id, symbol, side, remaining_amount, price')
      .eq('user_id', user.id)
      .in('status', ['pending', 'partially_filled']);

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      throw ordersError;
    }

    // Calculate what SHOULD be locked based on pending orders
    let expectedLocked = 0;
    const FEE_PERCENT = 0.005; // 0.5% fee

    for (const order of (pendingOrders || [])) {
      const [baseSymbol, quoteSymbol] = order.symbol.split('/');
      
      if (order.side === 'buy' && quoteSymbol === asset_symbol) {
        // Buy order locks quote currency (+ fee)
        expectedLocked += order.remaining_amount * order.price * (1 + FEE_PERCENT);
      } else if (order.side === 'sell' && baseSymbol === asset_symbol) {
        // Sell order locks base currency
        expectedLocked += order.remaining_amount;
      }
    }

    console.log(`Expected locked: ${expectedLocked}, Current locked: ${balanceBefore?.locked || 0}`);

    // If there's a discrepancy, fix it
    const currentLocked = balanceBefore?.locked || 0;
    const discrepancy = currentLocked - expectedLocked;

    if (Math.abs(discrepancy) < 0.00000001) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Balance already reconciled',
          discrepancy: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the reconcile function via RPC
    const { data: reconcileResult, error: rpcError } = await supabaseClient.rpc(
      'reconcile_locked_balance',
      {
        p_user_id: user.id,
        p_asset_symbol: asset_symbol
      }
    );

    if (rpcError) {
      console.error('Reconcile RPC error:', rpcError);
      throw rpcError;
    }

    // Get updated balance
    const { data: balanceAfter } = await supabaseClient
      .from('wallet_balances')
      .select(`
        available,
        locked,
        assets!inner(symbol)
      `)
      .eq('user_id', user.id)
      .eq('assets.symbol', asset_symbol)
      .maybeSingle();

    console.log(`Balance reconciled. Before: locked=${currentLocked}, After: locked=${balanceAfter?.locked}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Balance reconciled successfully',
        discrepancy: discrepancy,
        before: {
          available: balanceBefore?.available || 0,
          locked: currentLocked
        },
        after: {
          available: balanceAfter?.available || 0,
          locked: balanceAfter?.locked || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error reconciling balance:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
