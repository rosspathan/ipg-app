import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_limit';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  client_order_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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

    // Parse request body
    const orderRequest: PlaceOrderRequest = await req.json();

    // Validate required fields
    if (!orderRequest.symbol || !orderRequest.side || !orderRequest.type || !orderRequest.quantity) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: symbol, side, type, quantity' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate price for limit orders
    if (orderRequest.type === 'limit' && !orderRequest.price) {
      return new Response(JSON.stringify({ 
        error: 'Price is required for limit orders' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate stop price for stop limit orders
    if (orderRequest.type === 'stop_limit' && (!orderRequest.price || !orderRequest.stop_price)) {
      return new Response(JSON.stringify({ 
        error: 'Price and stop_price are required for stop limit orders' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create service role client for database operations
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if trading pair exists and is active
    const { data: tradingPair, error: pairError } = await serviceSupabase
      .from('trading_pairs')
      .select('*')
      .eq('symbol', orderRequest.symbol)
      .eq('active', true)
      .single();

    if (pairError || !tradingPair) {
      return new Response(JSON.stringify({ 
        error: 'Trading pair not found or not active' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For market orders, get current market price
    let finalPrice = orderRequest.price;
    if (orderRequest.type === 'market') {
      // Get last trade price or best ask/bid
      const { data: lastTrade } = await serviceSupabase
        .from('trades')
        .select('price')
        .eq('symbol', orderRequest.symbol)
        .order('trade_time', { ascending: false })
        .limit(1)
        .single();

      if (lastTrade) {
        finalPrice = parseFloat(lastTrade.price);
      } else {
        // Fallback to a default price if no trades exist
        finalPrice = 50000; // Default BTC price - this should be improved
      }
    }

    // Calculate fees
    const feeRate = orderRequest.type === 'market' ? tradingPair.taker_fee : tradingPair.maker_fee;
    const totalValue = orderRequest.quantity * (finalPrice || 0);
    const fee = totalValue * feeRate;

    // Create the order
    const { data: order, error: orderError } = await serviceSupabase
      .from('orders')
      .insert({
        user_id: user.id,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        quantity: orderRequest.quantity,
        price: finalPrice,
        stop_price: orderRequest.stop_price,
        remaining_quantity: orderRequest.quantity,
        total_fee: fee,
        fee_asset: 'USDT', // Default fee asset
        time_in_force: orderRequest.time_in_force || 'GTC',
        client_order_id: orderRequest.client_order_id,
        status: orderRequest.type === 'market' ? 'pending' : 'open'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create order',
        details: orderError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For market orders, try to match immediately
    if (orderRequest.type === 'market') {
      // This is a simplified matching - in production you'd want a more sophisticated engine
      await processMarketOrder(serviceSupabase, order);
    }

    // Log the order placement
    console.log(`Order placed: ${order.id} - ${orderRequest.side} ${orderRequest.quantity} ${orderRequest.symbol} at ${finalPrice}`);

    return new Response(JSON.stringify({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.quantity),
        price: order.price ? parseFloat(order.price) : null,
        status: order.status,
        filled_quantity: parseFloat(order.filled_quantity),
        remaining_quantity: parseFloat(order.remaining_quantity),
        created_at: order.created_at,
        client_order_id: order.client_order_id
      }
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Place order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified market order processing
async function processMarketOrder(supabase: any, order: any) {
  try {
    // Find matching orders on the opposite side
    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    
    const { data: matchingOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('symbol', order.symbol)
      .eq('side', oppositeSide)
      .in('status', ['open', 'partially_filled'])
      .gt('remaining_quantity', 0)
      .order('price', { ascending: order.side === 'buy' }) // Buy orders match against lowest sell prices
      .order('created_at', { ascending: true }); // FIFO for same price

    if (!matchingOrders || matchingOrders.length === 0) {
      // No matching orders - mark as open
      await supabase
        .from('orders')
        .update({ status: 'open' })
        .eq('id', order.id);
      return;
    }

    let remainingQuantity = parseFloat(order.quantity);
    let totalFilled = 0;
    let averagePrice = 0;
    let totalValue = 0;

    // Process matches
    for (const matchOrder of matchingOrders) {
      if (remainingQuantity <= 0) break;

      const matchQuantity = Math.min(remainingQuantity, parseFloat(matchOrder.remaining_quantity));
      const tradePrice = parseFloat(matchOrder.price);
      const tradeValue = matchQuantity * tradePrice;

      // Create trade record
      await supabase
        .from('trades')
        .insert({
          symbol: order.symbol,
          buyer_id: order.side === 'buy' ? order.user_id : matchOrder.user_id,
          seller_id: order.side === 'sell' ? order.user_id : matchOrder.user_id,
          buy_order_id: order.side === 'buy' ? order.id : matchOrder.id,
          sell_order_id: order.side === 'sell' ? order.id : matchOrder.id,
          quantity: matchQuantity,
          price: tradePrice,
          total_value: tradeValue,
          buyer_fee: tradeValue * 0.001, // 0.1% fee
          seller_fee: tradeValue * 0.001,
          trade_time: new Date().toISOString()
        });

      // Update matching order
      const newMatchRemaining = parseFloat(matchOrder.remaining_quantity) - matchQuantity;
      const newMatchFilled = parseFloat(matchOrder.filled_quantity) + matchQuantity;
      
      await supabase
        .from('orders')
        .update({
          filled_quantity: newMatchFilled,
          remaining_quantity: newMatchRemaining,
          status: newMatchRemaining <= 0 ? 'filled' : 'partially_filled',
          filled_at: newMatchRemaining <= 0 ? new Date().toISOString() : null
        })
        .eq('id', matchOrder.id);

      // Update current order tracking
      remainingQuantity -= matchQuantity;
      totalFilled += matchQuantity;
      totalValue += tradeValue;
    }

    // Calculate average price
    if (totalFilled > 0) {
      averagePrice = totalValue / totalFilled;
    }

    // Update current order
    await supabase
      .from('orders')
      .update({
        filled_quantity: totalFilled,
        remaining_quantity: remainingQuantity,
        average_price: averagePrice,
        status: remainingQuantity <= 0 ? 'filled' : 'partially_filled',
        filled_at: remainingQuantity <= 0 ? new Date().toISOString() : null
      })
      .eq('id', order.id);

  } catch (error) {
    console.error('Error processing market order:', error);
  }
}