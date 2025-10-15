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

    console.log('[cancel-order] Found order:', { id: order.id, status: order.status, type: order.type });

    // Check if order can be cancelled
    if (order.status === 'filled') {
      throw new Error('Cannot cancel filled order');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }

    // Unlock balance for limit orders
    if (order.type === 'limit' && order.status === 'pending') {
      const [base_symbol, quote_symbol] = order.symbol.split('/');
      const unlock_asset = order.side === 'buy' ? quote_symbol : base_symbol;
      const unlock_amount = order.side === 'buy' 
        ? order.remaining_quantity * order.price 
        : order.remaining_quantity;

      console.log('[cancel-order] Unlocking balance:', { unlock_asset, unlock_amount });

      const { data: unlockSuccess, error: unlockError } = await supabaseClient.rpc(
        'unlock_balance_for_order',
        {
          p_user_id: user.id,
          p_asset_symbol: unlock_asset,
          p_amount: unlock_amount,
        }
      );

      if (unlockError || !unlockSuccess) {
        console.error('[cancel-order] Unlock failed:', unlockError);
        throw new Error('Failed to unlock balance');
      }

      console.log('[cancel-order] Balance unlocked');
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
