/**
 * Match Orders Edge Function
 * Phase 2.1: Fixed order matching priority (no infinite prices for market orders)
 * Phase 2.2: Fixed fee calculation (fees in correct assets)
 * Phase 4.3: Implemented circuit breaker logic
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EngineSettings {
  auto_matching_enabled: boolean;
  circuit_breaker_active: boolean;
  maker_fee_percent: number;
  taker_fee_percent: number;
}

const MAX_PRICE_DEVIATION = 0.10; // 10% price deviation triggers circuit breaker

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Matching Engine] Starting order matching process');

    // Get engine settings
    const { data: settings, error: settingsError } = await supabase
      .from('trading_engine_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('[Matching Engine] Error fetching settings:', settingsError);
      throw settingsError;
    }

    const engineSettings = settings as EngineSettings;

    // Check if matching is enabled
    if (!engineSettings.auto_matching_enabled || engineSettings.circuit_breaker_active) {
      console.log('[Matching Engine] Matching disabled or circuit breaker active');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Matching engine disabled',
          auto_matching_enabled: engineSettings.auto_matching_enabled,
          circuit_breaker_active: engineSettings.circuit_breaker_active
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all pending orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('[Matching Engine] Error fetching orders:', ordersError);
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('[Matching Engine] No pending orders');
      return new Response(
        JSON.stringify({ success: true, message: 'No orders to match', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group orders by symbol
    const ordersBySymbol = pendingOrders.reduce((acc, order) => {
      if (!acc[order.symbol]) {
        acc[order.symbol] = { buys: [], sells: [] };
      }
      if (order.side === 'buy') {
        acc[order.symbol].buys.push(order);
      } else {
        acc[order.symbol].sells.push(order);
      }
      return acc;
    }, {} as Record<string, { buys: any[], sells: any[] }>);

    let totalMatches = 0;

    // Match orders for each symbol
    for (const [symbol, orders] of Object.entries(ordersBySymbol)) {
      console.log(`[Matching Engine] Processing ${symbol}: ${orders.buys.length} buys, ${orders.sells.length} sells`);

      // PHASE 2.1 FIX: Sort market orders LAST (lower priority than limit orders)
      // Market orders should match against existing limit orders, not get infinite priority
      const sortedBuys = orders.buys.sort((a, b) => {
        // Market orders go to the back
        if (a.order_type === 'market' && b.order_type !== 'market') return 1;
        if (a.order_type !== 'market' && b.order_type === 'market') return -1;
        // Both limit orders: highest price first
        return (b.price || 0) - (a.price || 0);
      });

      const sortedSells = orders.sells.sort((a, b) => {
        // Market orders go to the back
        if (a.order_type === 'market' && b.order_type !== 'market') return 1;
        if (a.order_type !== 'market' && b.order_type === 'market') return -1;
        // Both limit orders: lowest price first
        return (a.price || 0) - (b.price || 0);
      });

      // Match orders using price-time priority
      for (const buyOrder of sortedBuys) {
        for (const sellOrder of sortedSells) {
          // PHASE 2.1 FIX: Determine if orders can match without infinite prices
          let canMatch = false;
          let executionPrice = 0;

          if (buyOrder.order_type === 'market' && sellOrder.order_type === 'market') {
            // Both market orders - should not match (no price reference)
            continue;
          } else if (buyOrder.order_type === 'market') {
            // Buy market order takes seller's limit price
            canMatch = true;
            executionPrice = sellOrder.price;
          } else if (sellOrder.order_type === 'market') {
            // Sell market order takes buyer's limit price
            canMatch = true;
            executionPrice = buyOrder.price;
          } else {
            // Both limit orders: match if buy price >= sell price
            canMatch = buyOrder.price >= sellOrder.price;
            executionPrice = sellOrder.price; // Maker (seller) sets the price
          }

          if (canMatch && executionPrice > 0) {
            // PHASE 4.3: Circuit Breaker Check
            const { data: lastTrade } = await supabase
              .from('trades')
              .select('price')
              .eq('symbol', symbol)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastTrade) {
              const priceDeviation = Math.abs((executionPrice - lastTrade.price) / lastTrade.price);
              
              if (priceDeviation > MAX_PRICE_DEVIATION) {
                console.warn(`[Circuit Breaker] Price deviation too high: ${(priceDeviation * 100).toFixed(2)}%`);
                
                // Activate circuit breaker
                await supabase
                  .from('trading_engine_settings')
                  .update({ circuit_breaker_active: true })
                  .eq('id', settings.id);
                
                console.error(`[Circuit Breaker] ACTIVATED for ${symbol}. Last: ${lastTrade.price}, Current: ${executionPrice}`);
                
                // Stop matching for this symbol
                break;
              }
            }

            // Calculate matched quantity
            const matchedQuantity = Math.min(buyOrder.remaining_amount, sellOrder.remaining_amount);

            console.log(`[Matching Engine] Matching ${matchedQuantity} ${symbol} at ${executionPrice}`);

            // PHASE 2.2 FIX: Calculate fees in correct assets
            // Buyer pays fee in quote asset (e.g., USDT when buying BTC/USDT)
            // Seller pays fee in base asset (e.g., BTC when selling BTC/USDT)
            const totalValueQuote = matchedQuantity * executionPrice;
            const buyerFeeQuote = totalValueQuote * (engineSettings.taker_fee_percent / 100);
            const sellerFeeBase = matchedQuantity * (engineSettings.maker_fee_percent / 100);

            // Parse symbol (e.g., BTC/USDT -> base: BTC, quote: USDT)
            const [baseSymbol, quoteSymbol] = symbol.split('/');

            try {
              // Settle trade (update balances) with corrected fee parameters
              const { error: settleError } = await supabase.rpc('settle_trade', {
                p_buyer_id: buyOrder.user_id,
                p_seller_id: sellOrder.user_id,
                p_base_symbol: baseSymbol,
                p_quote_symbol: quoteSymbol,
                p_quantity: matchedQuantity,
                p_price: executionPrice,
                p_buyer_fee: buyerFeeQuote,  // Fee in quote asset
                p_seller_fee: sellerFeeBase   // Fee in base asset (but converted to quote for ledger)
              });

              if (settleError) {
                console.error('[Matching Engine] Settle error:', settleError);
                continue;
              }

              // Create trade record
              const { error: tradeError } = await supabase
                .from('trades')
                .insert({
                  symbol,
                  buy_order_id: buyOrder.id,
                  sell_order_id: sellOrder.id,
                  buyer_id: buyOrder.user_id,
                  seller_id: sellOrder.user_id,
                  quantity: matchedQuantity,
                  price: executionPrice,
                  total_value: totalValueQuote,
                  buyer_fee: buyerFeeQuote,
                  seller_fee: sellerFeeBase * executionPrice, // Convert to quote asset for display
                  trading_type: buyOrder.trading_type || 'spot'
                });

              if (tradeError) {
                console.error('[Matching Engine] Trade creation error:', tradeError);
                continue;
              }

              // Update buy order
              const newBuyFilled = buyOrder.filled_amount + matchedQuantity;
              const newBuyRemaining = buyOrder.remaining_amount - matchedQuantity;
              const buyStatus = newBuyRemaining <= 0 ? 'filled' : 'partially_filled';

              await supabase
                .from('orders')
                .update({
                  filled_amount: newBuyFilled,
                  remaining_amount: newBuyRemaining,
                  status: buyStatus,
                  filled_at: buyStatus === 'filled' ? new Date().toISOString() : null
                })
                .eq('id', buyOrder.id);

              // Update sell order
              const newSellFilled = sellOrder.filled_amount + matchedQuantity;
              const newSellRemaining = sellOrder.remaining_amount - matchedQuantity;
              const sellStatus = newSellRemaining <= 0 ? 'filled' : 'partially_filled';

              await supabase
                .from('orders')
                .update({
                  filled_amount: newSellFilled,
                  remaining_amount: newSellRemaining,
                  status: sellStatus,
                  filled_at: sellStatus === 'filled' ? new Date().toISOString() : null
                })
                .eq('id', sellOrder.id);

              totalMatches++;

              // Update local order objects for next iteration
              buyOrder.remaining_amount = newBuyRemaining;
              sellOrder.remaining_amount = newSellRemaining;

              console.log(`[Matching Engine] ✓ Trade executed: ${matchedQuantity} ${symbol} at ${executionPrice}`);

              // If buy order is fully filled, break inner loop
              if (buyOrder.remaining_amount <= 0) {
                break;
              }
            } catch (error) {
              console.error('[Matching Engine] Error executing trade:', error);
            }
          }
        }
      }
    }

    console.log(`[Matching Engine] Completed: ${totalMatches} matches`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Matched ${totalMatches} orders`,
        matched: totalMatches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Matching Engine] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
