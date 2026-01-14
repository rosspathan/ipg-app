/**
 * Cancel Order Edge Function - ATOMIC VERSION
 * Uses execute_order_cancel RPC for single-transaction cancellation
 * Ensures balance unlock happens atomically with order status update
 */

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
    const authHeader = req.headers.get('Authorization');
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
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
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

    if (!order_id && !client_order_id) {
      throw new Error('order_id or client_order_id is required');
    }

    // If client_order_id provided, look up the actual order_id first
    let targetOrderId = order_id;
    
    if (!targetOrderId && client_order_id) {
      const { data: order, error: lookupError } = await supabaseClient
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('client_order_id', client_order_id)
        .single();
      
      if (lookupError || !order) {
        console.error('[cancel-order] Order lookup failed:', lookupError);
        throw new Error('Order not found');
      }
      
      targetOrderId = order.id;
    }

    console.log('[cancel-order] Calling atomic execute_order_cancel for order:', targetOrderId);

    // Use the atomic execute_order_cancel RPC function
    // This handles: validation, status update, balance unlock, and audit logging in one transaction
    const { data: result, error: cancelError } = await supabaseClient.rpc(
      'execute_order_cancel',
      {
        p_user_id: user.id,
        p_order_id: targetOrderId
      }
    );

    if (cancelError) {
      console.error('[cancel-order] RPC error:', cancelError);
      throw new Error(`Cancellation failed: ${cancelError.message}`);
    }

    console.log('[cancel-order] RPC result:', result);

    if (!result || !result.success) {
      const errorMsg = result?.error || 'Unknown cancellation error';
      console.error('[cancel-order] Cancellation failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[cancel-order] Order cancelled successfully:', {
      order_id: result.order_id,
      unlocked_amount: result.unlocked_amount,
      unlocked_asset: result.unlocked_asset
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: result.order_id,
        unlocked_amount: result.unlocked_amount,
        unlocked_asset: result.unlocked_asset,
        message: `Order cancelled. ${result.unlocked_amount} ${result.unlocked_asset} unlocked.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cancel-order] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
