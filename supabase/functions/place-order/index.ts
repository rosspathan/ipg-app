/**
 * Place Order Edge Function - ATOMIC VERSION
 * Uses place_order_atomic RPC for guaranteed consistency
 * No orphan locks possible - lock + order creation in single transaction
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
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader! } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[place-order] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Check for idempotency key
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
        console.log('[place-order] Returning cached response');
        return new Response(
          JSON.stringify(existing.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { symbol, side, type, quantity, price, trading_type } = await req.json();

    console.log('[place-order] Order request:', { user_id: user.id, symbol, side, type, quantity, price });

    // Validate inputs
    if (!symbol || !side || !type || !quantity || quantity <= 0) {
      throw new Error('Invalid order parameters');
    }

    if (type === 'limit' && (!price || price <= 0)) {
      throw new Error('Limit orders require a valid price');
    }

    // Use atomic RPC - single transaction guarantees no orphan locks
    const { data: result, error: rpcError } = await supabaseClient.rpc(
      'place_order_atomic',
      {
        p_user_id: user.id,
        p_symbol: symbol,
        p_side: side,
        p_order_type: type,
        p_amount: quantity,
        p_price: price || null,
        p_trading_type: trading_type || 'spot'
      }
    );

    if (rpcError) {
      console.error('[place-order] RPC error:', rpcError);
      throw new Error(`Order placement failed: ${rpcError.message}`);
    }

    console.log('[place-order] Atomic RPC result:', result);

    if (!result?.success) {
      throw new Error(result?.error || 'Order placement failed');
    }

    // Fetch the created order details
    const { data: order, error: fetchError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', result.order_id)
      .single();

    if (fetchError || !order) {
      console.error('[place-order] Failed to fetch order:', fetchError);
      // Order was created, return minimal response
      const responseData = {
        success: true,
        order: {
          id: result.order_id,
          symbol,
          side,
          type,
          quantity,
          price: price || null,
          status: 'pending',
          locked_asset: result.locked_asset,
          locked_amount: result.locked_amount,
        },
      };
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[place-order] Order created successfully:', order.id);

    // Trigger matching engine
    const matchingAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    try {
      const { data: settings } = await matchingAdminClient
        .from('trading_engine_settings')
        .select('auto_matching_enabled, circuit_breaker_active')
        .single();
      
      console.log('[place-order] Engine settings:', settings);
      
      if (settings?.auto_matching_enabled && !settings?.circuit_breaker_active) {
        console.log('[place-order] Triggering matching engine...');
        
        const { data: matchResult, error: matchError } = await matchingAdminClient.functions.invoke('match-orders', {
          body: {}
        });
        
        if (matchError) {
          console.error('[place-order] Matching engine error:', matchError);
        } else {
          console.log('[place-order] Matching result:', matchResult);
        }
      }
    } catch (matchErr) {
      console.error('[place-order] Matching engine call failed:', matchErr);
    }

    const responseData = {
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.order_type,
        quantity: order.amount,
        price: order.price,
        status: order.status,
        created_at: order.created_at,
        locked_asset: result.locked_asset,
        locked_amount: result.locked_amount,
      },
    };

    // Store idempotency key
    if (idempotencyKey) {
      await supabaseClient.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type: 'order',
        resource_id: order.id,
        response_data: responseData,
      }).catch(err => {
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
