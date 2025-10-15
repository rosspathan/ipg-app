import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { symbol, side, type, quantity, price, trading_type } = await req.json();

    console.log('[place-order] Received order:', { user_id: user.id, symbol, side, type, quantity, price });

    // Validate inputs
    if (!symbol || !side || !type || !quantity || quantity <= 0) {
      throw new Error('Invalid order parameters');
    }

    if (type === 'limit' && (!price || price <= 0)) {
      throw new Error('Limit orders require a valid price');
    }

    // Parse symbol (e.g., "BTC/USDT" -> base: "BTC", quote: "USDT")
    const [base_symbol, quote_symbol] = symbol.split('/');
    if (!base_symbol || !quote_symbol) {
      throw new Error('Invalid symbol format. Expected: BASE/QUOTE');
    }

    // Calculate required balance
    const order_value = type === 'market' ? quantity : quantity * price!;
    const required_asset = side === 'buy' ? quote_symbol : base_symbol;
    const required_amount = side === 'buy' ? order_value : quantity;

    console.log('[place-order] Required:', { required_asset, required_amount });

    // For limit orders, lock the balance
    if (type === 'limit') {
      const { data: lockSuccess, error: lockError } = await supabaseClient.rpc(
        'lock_balance_for_order',
        {
          p_user_id: user.id,
          p_asset_symbol: required_asset,
          p_amount: required_amount,
        }
      );

      if (lockError || !lockSuccess) {
        console.error('[place-order] Lock balance failed:', lockError);
        throw new Error('Insufficient balance or lock failed');
      }

      console.log('[place-order] Balance locked successfully');
    }

    // For market orders, just check balance
    if (type === 'market') {
      const { data: assetData } = await supabaseClient
        .from('assets')
        .select('id')
        .eq('symbol', required_asset)
        .single();

      if (!assetData) {
        throw new Error(`Asset ${required_asset} not found`);
      }

      const { data: balanceData } = await supabaseClient
        .from('wallet_balances')
        .select('available')
        .eq('user_id', user.id)
        .eq('asset_id', assetData.id)
        .single();

      if (!balanceData || balanceData.available < required_amount) {
        throw new Error('Insufficient balance');
      }
    }

    // Insert order
    const { data: order, error: insertError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        symbol,
        side,
        type,
        quantity,
        price: price || null,
        remaining_quantity: quantity,
        status: 'pending',
        trading_type: trading_type || 'spot',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[place-order] Insert failed:', insertError);
      
      // Unlock balance if limit order insert failed
      if (type === 'limit') {
        await supabaseClient.rpc('unlock_balance_for_order', {
          p_user_id: user.id,
          p_asset_symbol: required_asset,
          p_amount: required_amount,
        });
      }
      
      throw new Error('Failed to create order');
    }

    console.log('[place-order] Order created:', order.id);

    // Trigger matching engine for market orders or limit orders
    // The match-orders function will handle this asynchronously via database triggers
    
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          price: order.price,
          status: order.status,
          created_at: order.created_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[place-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
