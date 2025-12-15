/**
 * Place Order Edge Function
 * Phase 2.3: Added idempotency key support
 * Phase 2.4: Added atomic transaction handling
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT token explicitly for proper auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
        auth: { persistSession: false }
      }
    );

    // Pass token explicitly to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[place-order] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // PHASE 2.3: Check for idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');
    
    if (idempotencyKey) {
      console.log('[place-order] Checking idempotency key:', idempotencyKey);
      
      const { data: existing } = await supabaseClient
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .eq('user_id', user.id)
        .eq('operation_type', 'order')
        .single();
      
      if (existing) {
        console.log('[place-order] Returning cached response for idempotency key');
        return new Response(
          JSON.stringify(existing.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
    const estimated_market_price = type === 'market' 
      ? (side === 'buy' ? price || 999999999 : price || 0.00000001) 
      : price!;
    const order_value = quantity * estimated_market_price;
    const required_asset = side === 'buy' ? quote_symbol : base_symbol;
    const required_amount = side === 'buy' ? order_value : quantity;

    console.log('[place-order] Required:', { required_asset, required_amount });

    // PHASE 2.4: Atomic balance locking for limit orders
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

    // For market orders, validate balance
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
        order_type: type,
        quantity,
        price: price || null,
        remaining_amount: quantity,
        filled_amount: 0,
        status: 'pending',
        trading_type: trading_type || 'spot',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[place-order] Insert failed:', insertError);
      
      // Rollback: unlock balance if limit order insert failed
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

    const responseData = {
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.order_type,
        quantity: order.quantity,
        price: order.price,
        status: order.status,
        created_at: order.created_at,
      },
    };

    // PHASE 2.3: Store idempotency key after successful operation
    if (idempotencyKey) {
      await supabaseClient.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type: 'order',
        resource_id: order.id,
        response_data: responseData,
      }).catch(err => {
        // Non-fatal: log but don't fail the request
        console.warn('[place-order] Failed to store idempotency key:', err);
      });
    }
    
    return new Response(
      JSON.stringify(responseData),
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
