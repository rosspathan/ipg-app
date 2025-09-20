import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  user_id: string;
  market_symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_limit';
  price?: number;
  stop_price?: number;
  quantity: number;
  quote_quantity?: number;
  time_in_force: 'GTC' | 'IOC';
  client_order_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderRequest: OrderRequest = await req.json();
    orderRequest.user_id = user.id;

    console.log('Processing order:', orderRequest);

    // Validate market exists and is active
    const { data: market } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('symbol', orderRequest.market_symbol)
      .eq('active', true)
      .single();

    if (!market) {
      return new Response(JSON.stringify({ error: 'Market not found or inactive' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and apply market constraints
    const validationError = validateOrder(orderRequest, market);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate required balance
    const [baseAsset, quoteAsset] = orderRequest.market_symbol.split('/');
    let requiredAsset: string;
    let requiredAmount: number;

    if (orderRequest.side === 'buy') {
      requiredAsset = quoteAsset;
      if (orderRequest.type === 'market') {
        // For market orders, estimate required amount with buffer
        requiredAmount = orderRequest.quote_quantity || (orderRequest.quantity * (orderRequest.price || 0) * 1.05);
      } else {
        requiredAmount = orderRequest.quantity * orderRequest.price!;
      }
    } else {
      requiredAsset = baseAsset;
      requiredAmount = orderRequest.quantity;
    }

    // Check and lock balance
    const { data: balanceCheck } = await supabase.rpc('check_and_lock_balance', {
      p_user_id: user.id,
      p_asset_symbol: requiredAsset,
      p_required_amount: requiredAmount
    });

    if (!balanceCheck?.success) {
      return new Response(JSON.stringify({ error: balanceCheck?.error || 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create order record
    const orderData = {
      user_id: user.id,
      market_symbol: orderRequest.market_symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      price: orderRequest.price,
      stop_price: orderRequest.stop_price,
      quantity: orderRequest.quantity,
      quote_quantity: orderRequest.quote_quantity,
      filled_quantity: 0,
      remaining_quantity: orderRequest.quantity,
      status: orderRequest.type === 'stop_limit' ? 'pending_trigger' : 'open',
      time_in_force: orderRequest.time_in_force,
      client_order_id: orderRequest.client_order_id,
      locked_asset: requiredAsset,
      locked_amount: requiredAmount
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      // Unlock balance on error
      await supabase.rpc('unlock_balance', {
        p_user_id: user.id,
        p_asset_symbol: requiredAsset,
        p_amount: requiredAmount
      });
      
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to match order immediately if it's a market or limit order
    let matchResult = { filled_quantity: 0, average_price: null, trades: [] };
    
    if (orderRequest.type === 'market' || orderRequest.type === 'limit') {
      try {
        const { data: matchData } = await supabase.rpc('match_order', {
          p_order_id: newOrder.id
        });
        
        if (matchData) {
          matchResult = matchData;
        }
      } catch (matchError) {
        console.error('Error matching order:', matchError);
      }
    }

    console.log('Order placed successfully:', {
      order_id: newOrder.id,
      filled_quantity: matchResult.filled_quantity,
      trades: matchResult.trades?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      order_id: newOrder.id,
      filled_quantity: matchResult.filled_quantity,
      average_price: matchResult.average_price,
      trades: matchResult.trades,
      status: newOrder.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in place-order function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateOrder(order: OrderRequest, market: any): string | null {
  // Validate tick size
  if (order.price && market.tick_size > 0) {
    const priceMod = order.price % market.tick_size;
    if (priceMod !== 0) {
      return `Price must be multiple of tick size ${market.tick_size}`;
    }
  }

  // Validate lot size
  if (market.lot_size > 0) {
    const qtyMod = order.quantity % market.lot_size;
    if (qtyMod !== 0) {
      return `Quantity must be multiple of lot size ${market.lot_size}`;
    }
  }

  // Validate min notional
  if (order.price && market.min_notional > 0) {
    const notional = order.quantity * order.price;
    if (notional < market.min_notional) {
      return `Order value must be at least ${market.min_notional}`;
    }
  }

  return null;
}