import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type'); // 'orders' or 'trades'

    if (type === 'trades') {
      // Get user's trade history
      let tradesQuery = supabase
        .from('trades')
        .select(`
          id,
          symbol,
          quantity,
          price,
          total_value,
          buyer_fee,
          seller_fee,
          trade_time,
          buyer_id,
          seller_id,
          buy_order_id,
          sell_order_id
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('trade_time', { ascending: false });

      if (symbol) {
        tradesQuery = tradesQuery.eq('symbol', symbol);
      }

      tradesQuery = tradesQuery.range(offset, offset + limit - 1);

      const { data: trades, error: tradesError } = await tradesQuery;

      if (tradesError) {
        console.error('Trades query error:', tradesError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch trade history' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Format trades with user's perspective
      const formattedTrades = trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.buyer_id === user.id ? 'buy' : 'sell',
        quantity: parseFloat(trade.quantity),
        price: parseFloat(trade.price),
        total_value: parseFloat(trade.total_value),
        fee: trade.buyer_id === user.id ? parseFloat(trade.buyer_fee) : parseFloat(trade.seller_fee),
        trade_time: trade.trade_time,
        order_id: trade.buyer_id === user.id ? trade.buy_order_id : trade.sell_order_id
      }));

      return new Response(JSON.stringify({
        success: true,
        data: formattedTrades,
        total: formattedTrades.length,
        offset,
        limit
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Get user's order history
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (symbol) {
        ordersQuery = ordersQuery.eq('symbol', symbol);
      }

      if (status) {
        ordersQuery = ordersQuery.eq('status', status);
      }

      ordersQuery = ordersQuery.range(offset, offset + limit - 1);

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('Orders query error:', ordersError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch order history' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Format orders
      const formattedOrders = orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.quantity),
        price: order.price ? parseFloat(order.price) : null,
        stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
        filled_quantity: parseFloat(order.filled_quantity),
        remaining_quantity: parseFloat(order.remaining_quantity),
        average_price: order.average_price ? parseFloat(order.average_price) : 0,
        total_fee: parseFloat(order.total_fee),
        fee_asset: order.fee_asset,
        status: order.status,
        time_in_force: order.time_in_force,
        client_order_id: order.client_order_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        filled_at: order.filled_at,
        cancelled_at: order.cancelled_at
      }));

      return new Response(JSON.stringify({
        success: true,
        data: formattedOrders,
        total: formattedOrders.length,
        offset,
        limit
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Order history error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});