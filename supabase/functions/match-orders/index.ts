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
  admin_fee_wallet: string;
}

const ADMIN_FEE_PERCENT = 0.5; // 0.5% fee on each side (buy and sell)
const ADMIN_FEE_WALLET = '0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1';

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
        // Skip fully filled buy orders
        if (buyOrder.remaining_amount <= 0) continue;
        
        for (const sellOrder of sortedSells) {
          // Skip fully filled sell orders
          if (sellOrder.remaining_amount <= 0) continue;
          
          // SELF-TRADE PREVENTION: Skip if same user
          if (buyOrder.user_id === sellOrder.user_id) {
            console.log(`[Matching Engine] Skipping self-trade: user ${buyOrder.user_id}`);
            continue;
          }
          
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

            // ADMIN FEE: 0.5% on each side (buyer and seller)
            // Both fees calculated in quote asset for simplicity
            const totalValueQuote = matchedQuantity * executionPrice;
            const buyerFee = totalValueQuote * (ADMIN_FEE_PERCENT / 100);
            const sellerFee = totalValueQuote * (ADMIN_FEE_PERCENT / 100);
            const adminWallet = engineSettings.admin_fee_wallet || ADMIN_FEE_WALLET;

            // Parse symbol (e.g., BTC/USDT -> base: BTC, quote: USDT)
            const [baseSymbol, quoteSymbol] = symbol.split('/');

            console.log(`[Matching Engine] Fee calculation: Buyer fee=${buyerFee} ${quoteSymbol}, Seller fee=${sellerFee} ${quoteSymbol}, Admin wallet=${adminWallet}`);

            try {
              // Calculate quote amount (base * price)
              const quoteAmount = matchedQuantity * executionPrice;

              console.log(`[Matching Engine] Settling trade: buyer=${buyOrder.id}, seller=${sellOrder.id}, base=${matchedQuantity} ${baseSymbol}, quote=${quoteAmount} ${quoteSymbol}`);

              // Settle trade (update balances) with correct parameter names
              const { data: settleData, error: settleError } = await supabase.rpc('settle_trade', {
                p_buyer_id: buyOrder.user_id,
                p_seller_id: sellOrder.user_id,
                p_base_asset: baseSymbol,
                p_quote_asset: quoteSymbol,
                p_base_amount: matchedQuantity,
                p_quote_amount: quoteAmount,
                p_buyer_fee: buyerFee,
                p_seller_fee: sellerFee
              });

              if (settleError) {
                console.error('[Matching Engine] Settle error:', settleError);
                console.error('[Matching Engine] Settle error details:', JSON.stringify(settleError));
                continue;
              }

              console.log('[Matching Engine] Settle success:', settleData);

              // Create trade record
              const { data: tradeData, error: tradeError } = await supabase
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
                  buyer_fee: buyerFee,
                  seller_fee: sellerFee,
                  trading_type: buyOrder.trading_type || 'spot'
                })
                .select('id')
                .single();

              const tradeId = tradeData?.id;

              if (tradeError) {
                console.error('[Matching Engine] Trade creation error:', tradeError);
                continue;
              }

              // Record fees in trading_fees_collected ledger
              if (tradeId) {
                // Buyer fee
                await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: buyerFee,
                    fee_percent: ADMIN_FEE_PERCENT,
                    user_id: buyOrder.user_id,
                    side: 'buy',
                    admin_wallet: adminWallet,
                    status: 'collected'
                  });

                // Seller fee
                await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: sellerFee,
                    fee_percent: ADMIN_FEE_PERCENT,
                    user_id: sellOrder.user_id,
                    side: 'sell',
                    admin_wallet: adminWallet,
                    status: 'collected'
                  });

                console.log(`[Matching Engine] ✓ Fees recorded: Buyer=${buyerFee}, Seller=${sellerFee} -> ${adminWallet}`);
              }

              // Update buy order - DO NOT update remaining_amount (it's a generated column)
              const newBuyFilled = Number(buyOrder.filled_amount) + matchedQuantity;
              const buyIsFilled = newBuyFilled >= Number(buyOrder.amount);
              const buyStatus = buyIsFilled ? 'filled' : 'partially_filled';

              const { error: buyUpdateError } = await supabase
                .from('orders')
                .update({
                  filled_amount: newBuyFilled,
                  status: buyStatus,
                  filled_at: buyIsFilled ? new Date().toISOString() : null
                })
                .eq('id', buyOrder.id);

              if (buyUpdateError) {
                console.error('[Matching Engine] Buy order update error:', buyUpdateError);
                continue;
              }

              // Update sell order - DO NOT update remaining_amount (it's a generated column)
              const newSellFilled = Number(sellOrder.filled_amount) + matchedQuantity;
              const sellIsFilled = newSellFilled >= Number(sellOrder.amount);
              const sellStatus = sellIsFilled ? 'filled' : 'partially_filled';

              const { error: sellUpdateError } = await supabase
                .from('orders')
                .update({
                  filled_amount: newSellFilled,
                  status: sellStatus,
                  filled_at: sellIsFilled ? new Date().toISOString() : null
                })
                .eq('id', sellOrder.id);

              if (sellUpdateError) {
                console.error('[Matching Engine] Sell order update error:', sellUpdateError);
                continue;
              }

              totalMatches++;

              // Update local order objects for next iteration
              buyOrder.filled_amount = newBuyFilled;
              buyOrder.remaining_amount = Number(buyOrder.amount) - newBuyFilled;
              sellOrder.filled_amount = newSellFilled;
              sellOrder.remaining_amount = Number(sellOrder.amount) - newSellFilled;

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
