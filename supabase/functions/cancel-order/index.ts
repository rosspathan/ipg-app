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

    const { order_id, client_order_id } = await req.json();

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
        // Log but don't fail - order should still be cancelled
        console.warn('[cancel-order] Could not unlock balance, continuing with cancellation');
      } else if (!unlockSuccess) {
        console.warn('[cancel-order] Unlock returned false - possibly already unlocked');
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
