/**
 * Cancel Order Edge Function - IMPROVED
 * Proper balance unlock for all pending/partially_filled orders
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
      price: order.price
    });

    // Check if order can be cancelled
    if (order.status === 'filled') {
      throw new Error('Cannot cancel filled order');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }

    // Calculate remaining amount to unlock
    const [base_symbol, quote_symbol] = order.symbol.split('/');
    const filled = new BigNumber(String(order.filled_amount || 0));
    const total = new BigNumber(String(order.amount));
    const remaining = total.minus(filled);
    
    if (remaining.isGreaterThan(0)) {
      const price = new BigNumber(String(order.price || 0));
      const FEE_BUFFER = new BigNumber('1.005'); // 0.5% fee buffer (same as place-order)
      
      let unlock_asset: string;
      let unlock_amount: BigNumber;
      
      if (order.side === 'buy') {
        // Buyer locked quote asset (e.g., USDT)
        unlock_asset = quote_symbol;
        // Must match the locked amount from place-order (including fee buffer)
        unlock_amount = remaining.times(price).times(FEE_BUFFER).decimalPlaces(8, BigNumber.ROUND_UP);
      } else {
        // Seller locked base asset (e.g., BTC)
        unlock_asset = base_symbol;
        unlock_amount = remaining.decimalPlaces(8, BigNumber.ROUND_DOWN);
      }

      console.log('[cancel-order] Unlocking balance:', { 
        unlock_asset, 
        unlock_amount: unlock_amount.toFixed(8),
        remaining: remaining.toString()
      });

      const { data: unlockSuccess, error: unlockError } = await supabaseClient.rpc(
        'unlock_balance_for_order',
        {
          p_user_id: user.id,
          p_asset_symbol: unlock_asset,
          p_amount: unlock_amount.toFixed(8),
        }
      );

      if (unlockError) {
        console.error('[cancel-order] Unlock error:', unlockError);
        // Try reconciliation as fallback
        console.log('[cancel-order] Attempting balance reconciliation as fallback...');
        const { error: reconcileError } = await supabaseClient.rpc(
          'reconcile_locked_balance',
          {
            p_user_id: user.id,
            p_asset_symbol: unlock_asset,
          }
        );
        if (reconcileError) {
          console.error('[cancel-order] Reconciliation also failed:', reconcileError);
        } else {
          console.log('[cancel-order] Balance reconciled via fallback');
        }
      } else if (!unlockSuccess) {
        console.warn('[cancel-order] Unlock returned false - attempting reconciliation fallback');
        const { error: reconcileError } = await supabaseClient.rpc(
          'reconcile_locked_balance',
          {
            p_user_id: user.id,
            p_asset_symbol: unlock_asset,
          }
        );
        if (reconcileError) {
          console.error('[cancel-order] Reconciliation fallback failed:', reconcileError);
        } else {
          console.log('[cancel-order] Balance reconciled via fallback after unlock returned false');
        }
      } else {
        console.log('[cancel-order] Balance unlocked successfully');
      }
    }

    // Update order status
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

    console.log('[cancel-order] Order cancelled:', order.id);

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
