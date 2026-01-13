/**
 * Cancel Order Edge Function - IMPROVED v2
 * Always reconciles balance after cancel to ensure consistency
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import BigNumber from "https://esm.sh/bignumber.js@9.1.2";

BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('[cancel-order] Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[cancel-order] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No valid token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[cancel-order] User auth failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    // Accept both order_id and orderId for backward compatibility
    const order_id = body.order_id || body.orderId;
    const client_order_id = body.client_order_id || body.clientOrderId;

    console.log('[cancel-order] Request:', { user_id: user.id, order_id, client_order_id });

    // Find order
    let query = supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', user.id);

    if (order_id) {
      query = query.eq('id', order_id);
    } else if (client_order_id) {
      query = query.eq('client_order_id', client_order_id);
    } else {
      throw new Error('Either order_id or client_order_id required');
    }

    const { data: order, error: fetchError } = await query.single();

    if (fetchError || !order) {
      throw new Error('Order not found');
    }

    console.log('[cancel-order] Found order:', { 
      id: order.id, 
      status: order.status, 
      type: order.order_type,
      amount: order.amount,
      filled_amount: order.filled_amount,
      remaining_amount: order.remaining_amount,
      price: order.price
    });

    // Check if order can be cancelled
    if (order.status === 'filled') {
      throw new Error('Cannot cancel filled order');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }

    // Parse trading pair
    const [base_symbol, quote_symbol] = order.symbol.split('/');

    // Update order status FIRST (so reconcile sees correct state)
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[cancel-order] Update failed:', updateError);
      throw new Error('Failed to cancel order');
    }

    console.log('[cancel-order] Order status updated to cancelled:', order.id);

    // ALWAYS run reconciliation after cancel to ensure correct balance state
    // This is the source of truth - it recalculates locked from remaining open orders
    const assetsToReconcile = [base_symbol, quote_symbol];
    
    for (const asset of assetsToReconcile) {
      console.log(`[cancel-order] Reconciling ${asset} balance for user ${user.id}`);
      const { error: reconcileError } = await supabaseClient.rpc(
        'reconcile_locked_balance',
        {
          p_user_id: user.id,
          p_asset_symbol: asset,
        }
      );
      
      if (reconcileError) {
        // Log but don't fail - order is already cancelled
        console.warn(`[cancel-order] Reconciliation warning for ${asset}:`, reconcileError.message);
      } else {
        console.log(`[cancel-order] Successfully reconciled ${asset} balance`);
      }
    }

    console.log('[cancel-order] Order cancelled and balances reconciled:', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        message: 'Order cancelled successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cancel-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
