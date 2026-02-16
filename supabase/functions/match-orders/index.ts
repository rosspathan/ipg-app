/**
 * Match Orders Edge Function
 * Phase 2.1: Fixed order matching priority (no infinite prices for market orders)
 * Phase 2.2: Fixed fee calculation (fees in correct assets)
 * Phase 3.4: BigNumber precision-safe calculations
 * Phase 4.3: Implemented circuit breaker logic
 * Phase 5.0: Dynamic fees from settings, fees credited to platform account (no on-chain transfer)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import BigNumber from "https://esm.sh/bignumber.js@9.1.2";

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

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

const MAX_PRICE_DEVIATION = new BigNumber('0.90'); // 90% price deviation triggers circuit breaker (very high for low-liquidity pairs)
const MIN_TRADES_FOR_CIRCUIT_BREAKER = 20; // Require at least 20 trades before enabling circuit breaker

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse optional symbol filter for pair-scoped matching
    let targetSymbol: string | null = null;
    try {
      const body = await req.json();
      if (body?.symbol) {
        targetSymbol = body.symbol;
      }
    } catch {
      // No body or invalid JSON — run global matching
    }

    console.log(`[Matching Engine] Starting order matching${targetSymbol ? ` for ${targetSymbol}` : ' (global)'}`);

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

    // Get dynamic fee percentages from settings (default to 0.5% if not set)
    const makerFeePercent = new BigNumber(String(engineSettings.maker_fee_percent ?? 0.5));
    const takerFeePercent = new BigNumber(String(engineSettings.taker_fee_percent ?? 0.5));
    
    console.log(`[Matching Engine] Fee config: Maker=${makerFeePercent.toString()}%, Taker=${takerFeePercent.toString()}%`);

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

    // Get pending and partially_filled orders — optionally scoped to a single symbol
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'partially_filled'])
      .order('created_at', { ascending: true });

    if (targetSymbol) {
      ordersQuery = ordersQuery.eq('symbol', targetSymbol);
    }

    const { data: pendingOrders, error: ordersError } = await ordersQuery;

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

      // Prefetch circuit breaker reference price once per symbol.
      // Using last trade price alone can permanently block low-liquidity markets after a large gap.
      const { count: tradeCount, error: tradeCountError } = await supabase
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('symbol', symbol);

      if (tradeCountError) {
        console.warn('[Matching Engine] Trade count lookup failed (circuit breaker will be skipped):', tradeCountError);
      }

      let referencePrice: BigNumber | null = null;
      let referenceSource: 'market_prices' | 'last_trade' | 'order_book_midpoint' | 'none' = 'none';

      // Calculate order book midpoint as a dynamic fallback reference
      const limitBuys = orders.buys.filter(o => o.order_type === 'limit' && o.price > 0);
      const limitSells = orders.sells.filter(o => o.order_type === 'limit' && o.price > 0);
      const bestBidPrice = limitBuys.length > 0 ? Math.max(...limitBuys.map(o => o.price)) : null;
      const bestAskPrice = limitSells.length > 0 ? Math.min(...limitSells.map(o => o.price)) : null;
      const orderBookMidpoint = bestBidPrice && bestAskPrice ? new BigNumber(bestBidPrice).plus(bestAskPrice).dividedBy(2) : null;

      console.log(`[Matching Engine] Order book for ${symbol}: bestBid=${bestBidPrice}, bestAsk=${bestAskPrice}, midpoint=${orderBookMidpoint?.toFixed(2) || 'N/A'}`);

      if (!tradeCountError && tradeCount && tradeCount >= MIN_TRADES_FOR_CIRCUIT_BREAKER) {
        // Prefer current market reference price (admin-set / internal price) over the last executed trade.
        const { data: marketRef, error: marketRefError } = await supabase
          .from('market_prices')
          .select('current_price, last_updated')
          .eq('symbol', symbol)
          .single();

        // Check if market price is stale (older than 1 hour)
        const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
        const isMarketPriceStale = marketRef?.last_updated && 
          (Date.now() - new Date(marketRef.last_updated).getTime()) > STALE_THRESHOLD_MS;

        if (!marketRefError && marketRef?.current_price && Number(marketRef.current_price) > 0 && !isMarketPriceStale) {
          referencePrice = new BigNumber(String(marketRef.current_price));
          referenceSource = 'market_prices';
          console.log(`[Matching Engine] Using market_prices reference: ${referencePrice.toFixed(2)}`);
        } else if (isMarketPriceStale && orderBookMidpoint) {
          // Market price is stale - use order book midpoint instead
          referencePrice = orderBookMidpoint;
          referenceSource = 'order_book_midpoint';
          console.log(`[Matching Engine] Market price stale (last_updated: ${marketRef?.last_updated}), using order book midpoint: ${referencePrice.toFixed(2)}`);
        } else if (orderBookMidpoint) {
          // No market price available - use order book midpoint
          referencePrice = orderBookMidpoint;
          referenceSource = 'order_book_midpoint';
          console.log(`[Matching Engine] No market price, using order book midpoint: ${referencePrice.toFixed(2)}`);
        } else {
          const { data: lastTrade } = await supabase
            .from('trades')
            .select('price')
            .eq('symbol', symbol)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastTrade?.price && Number(lastTrade.price) > 0) {
            referencePrice = new BigNumber(String(lastTrade.price));
            referenceSource = 'last_trade';
            console.log(`[Matching Engine] Using last trade reference: ${referencePrice.toFixed(2)}`);
          }
        }
      }

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
        // Skip fully filled buy orders - use BigNumber for comparison
        const buyRemaining = new BigNumber(String(buyOrder.remaining_amount));
        if (buyRemaining.isLessThanOrEqualTo(0)) continue;
        
        for (const sellOrder of sortedSells) {
          // Skip fully filled sell orders - use BigNumber for comparison
          const sellRemaining = new BigNumber(String(sellOrder.remaining_amount));
          if (sellRemaining.isLessThanOrEqualTo(0)) continue;
          
          // SELF-TRADE PREVENTION: Skip if same user
          if (buyOrder.user_id === sellOrder.user_id) {
            console.log(`[Matching Engine] Skipping self-trade: user ${buyOrder.user_id}`);
            continue;
          }
          
          // PHASE 2.1 FIX: Determine if orders can match without infinite prices
          let canMatch = false;
          let executionPrice = new BigNumber(0);
          let buyerIsTaker = false; // Track who is the taker for fee purposes

          if (buyOrder.order_type === 'market' && sellOrder.order_type === 'market') {
            // Both market orders - should not match (no price reference)
            continue;
          } else if (buyOrder.order_type === 'market') {
            // Buy market order takes seller's limit price (buyer is taker)
            canMatch = true;
            executionPrice = new BigNumber(String(sellOrder.price));
            buyerIsTaker = true;
          } else if (sellOrder.order_type === 'market') {
            // Sell market order takes buyer's limit price (seller is taker)
            canMatch = true;
            executionPrice = new BigNumber(String(buyOrder.price));
            buyerIsTaker = false;
          } else {
            // Both limit orders: match if buy price >= sell price
            // The order that was placed first is the maker
            canMatch = buyOrder.price >= sellOrder.price;
            executionPrice = new BigNumber(String(sellOrder.price)); // Maker (seller who had resting order) sets the price
            // Determine taker: the order placed later is the taker
            buyerIsTaker = new Date(buyOrder.created_at) > new Date(sellOrder.created_at);
          }

          if (canMatch && executionPrice.isGreaterThan(0)) {
            // PHASE 4.3: Circuit Breaker Check - only after MIN_TRADES_FOR_CIRCUIT_BREAKER trades
            if (referencePrice && referenceSource !== 'none') {
              const priceDeviation = executionPrice.minus(referencePrice).abs().dividedBy(referencePrice);

              if (priceDeviation.isGreaterThan(MAX_PRICE_DEVIATION)) {
                console.warn(`[Circuit Breaker] Price deviation too high vs ${referenceSource}: ${priceDeviation.times(100).toFixed(2)}%`);

                // Activate circuit breaker
                await supabase
                  .from('trading_engine_settings')
                  .update({ circuit_breaker_active: true })
                  .eq('id', settings.id);

                console.error(
                  `[Circuit Breaker] ACTIVATED for ${symbol}. Reference(${referenceSource}): ${referencePrice.toString()}, Execution: ${executionPrice.toString()}`
                );

                // Stop matching for this symbol
                break;
              }
            } else if ((tradeCount || 0) < MIN_TRADES_FOR_CIRCUIT_BREAKER) {
              console.log(
                `[Circuit Breaker] Skipped - only ${tradeCount || 0} trades for ${symbol} (need ${MIN_TRADES_FOR_CIRCUIT_BREAKER})`
              );
            } else {
              console.log(`[Circuit Breaker] Skipped - no reference price available for ${symbol}`);
            }

            // PHASE 3.4: Calculate matched quantity using BigNumber, quantized to 8 decimals
            const matchedQuantity = BigNumber.min(buyRemaining, sellRemaining).decimalPlaces(8, BigNumber.ROUND_DOWN);

            console.log(`[Matching Engine] Matching ${matchedQuantity.toFixed(8)} ${symbol} at ${executionPrice.toFixed(8)}`);

            // PHASE 5.0: Dynamic fees from settings
            // Buyer fee: taker fee if buyer is taker, maker fee otherwise
            // Seller fee: taker fee if seller is taker, maker fee otherwise
            const quoteAmount = matchedQuantity.times(executionPrice).decimalPlaces(8, BigNumber.ROUND_DOWN);
            const buyerFee = quoteAmount.times(buyerIsTaker ? takerFeePercent : makerFeePercent).dividedBy(100).decimalPlaces(8, BigNumber.ROUND_DOWN);
            const sellerFee = quoteAmount.times(buyerIsTaker ? makerFeePercent : takerFeePercent).dividedBy(100).decimalPlaces(8, BigNumber.ROUND_DOWN);

            // Parse symbol (e.g., BTC/USDT -> base: BTC, quote: USDT)
            const [baseSymbol, quoteSymbol] = symbol.split('/');

            console.log(`[Matching Engine] Fee calculation: Buyer fee=${buyerFee.toFixed(8)} ${quoteSymbol} (${buyerIsTaker ? 'taker' : 'maker'}), Seller fee=${sellerFee.toFixed(8)} ${quoteSymbol} (${buyerIsTaker ? 'maker' : 'taker'})`);

            try {
              console.log(`[Matching Engine] Executing atomic trade: buyer=${buyOrder.id}, seller=${sellOrder.id}, base=${matchedQuantity.toFixed(8)} ${baseSymbol}, quote=${quoteAmount.toFixed(8)} ${quoteSymbol}`);

              // Use atomic execute_trade RPC that handles settle + trade record + order updates + fee credit in one transaction
              const { data: tradeId, error: executeError } = await supabase.rpc('execute_trade', {
                p_buy_order_id: buyOrder.id,
                p_sell_order_id: sellOrder.id,
                p_buyer_id: buyOrder.user_id,
                p_seller_id: sellOrder.user_id,
                p_symbol: symbol,
                p_base_asset: baseSymbol,
                p_quote_asset: quoteSymbol,
                p_base_amount: matchedQuantity.toFixed(8),
                p_quote_amount: quoteAmount.toFixed(8),
                p_buyer_fee: buyerFee.toFixed(8),
                p_seller_fee: sellerFee.toFixed(8),
                p_trading_type: buyOrder.trading_type || 'spot'
              });

              if (executeError) {
                console.error('[Matching Engine] Execute trade error:', executeError);
                console.error('[Matching Engine] Execute trade error message:', executeError.message);
                
                // Audit log: Trade execution failed
                const { error: auditError } = await supabase.from('trading_audit_log').insert({
                  user_id: buyOrder.user_id,
                  order_id: buyOrder.id,
                  event_type: 'TRADE_EXECUTION_FAILED',
                  payload: {
                    error: executeError.message,
                    buy_order_id: buyOrder.id,
                    sell_order_id: sellOrder.id,
                    symbol,
                    execution_price: executionPrice.toNumber(),
                    matched_quantity: matchedQuantity.toNumber()
                  }
                });
                if (auditError) console.warn('Audit log insert failed:', auditError);
                
                continue;
              }

              console.log('[Matching Engine] Trade executed successfully, trade_id:', tradeId);
              
              // Audit log: Trade executed successfully
              const { error: auditLogError } = await supabase.from('trading_audit_log').insert([
                {
                  user_id: buyOrder.user_id,
                  order_id: buyOrder.id,
                  event_type: 'TRADE_EXECUTED',
                  payload: {
                    trade_id: tradeId,
                    symbol,
                    side: 'buy',
                    execution_price: executionPrice.toNumber(),
                    quantity: matchedQuantity.toNumber(),
                    quote_amount: quoteAmount.toNumber(),
                    fee: buyerFee.toNumber(),
                    counterparty_order_id: sellOrder.id
                  }
                },
                {
                  user_id: sellOrder.user_id,
                  order_id: sellOrder.id,
                  event_type: 'TRADE_EXECUTED',
                  payload: {
                    trade_id: tradeId,
                    symbol,
                    side: 'sell',
                    execution_price: executionPrice.toNumber(),
                    quantity: matchedQuantity.toNumber(),
                    quote_amount: quoteAmount.toNumber(),
                    fee: sellerFee.toNumber(),
                    counterparty_order_id: buyOrder.id
                  }
                }
              ]);
              if (auditLogError) console.warn('Audit log insert failed:', auditLogError);

              // #6: Fill Notifications — notify both buyer and seller
              if (tradeId) {
                const fillNotifications = [
                  {
                    user_id: buyOrder.user_id,
                    type: 'trade_fill',
                    title: `Buy Order Filled`,
                    body: `Your buy order for ${matchedQuantity.toFixed(8)} ${symbol.split('/')[0]} was filled at ${executionPrice.toFixed(8)} ${symbol.split('/')[1]}`,
                    meta: { trade_id: tradeId, symbol, side: 'buy', quantity: matchedQuantity.toNumber(), price: executionPrice.toNumber(), fee: buyerFee.toNumber() },
                    link_url: `/trading/${symbol.replace('/', '-')}`
                  },
                  {
                    user_id: sellOrder.user_id,
                    type: 'trade_fill',
                    title: `Sell Order Filled`,
                    body: `Your sell order for ${matchedQuantity.toFixed(8)} ${symbol.split('/')[0]} was filled at ${executionPrice.toFixed(8)} ${symbol.split('/')[1]}`,
                    meta: { trade_id: tradeId, symbol, side: 'sell', quantity: matchedQuantity.toNumber(), price: executionPrice.toNumber(), fee: sellerFee.toNumber() },
                    link_url: `/trading/${symbol.replace('/', '-')}`
                  }
                ];
                const { error: notifError } = await supabase.from('notifications').insert(fillNotifications);
                if (notifError) console.warn('[Matching Engine] Fill notification insert failed:', notifError);
                else console.log('[Matching Engine] ✓ Fill notifications sent to both parties');
              }

              // Record fees in trading_fees_collected ledger (status: collected - no on-chain transfer needed)
              if (tradeId) {
                // Buyer fee record
                await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: buyerFee.toNumber(),
                    fee_percent: (buyerIsTaker ? takerFeePercent : makerFeePercent).toNumber(),
                    user_id: buyOrder.user_id,
                    side: 'buy',
                    admin_wallet: 'platform_account',
                    status: 'collected' // Fees credited to platform account internally
                  });

                // Seller fee record
                await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: sellerFee.toNumber(),
                    fee_percent: (buyerIsTaker ? makerFeePercent : takerFeePercent).toNumber(),
                    user_id: sellOrder.user_id,
                    side: 'sell',
                    admin_wallet: 'platform_account',
                    status: 'collected' // Fees credited to platform account internally
                  });

                const totalFee = buyerFee.plus(sellerFee);
                console.log(`[Matching Engine] ✓ Fees collected: Total=${totalFee.toString()} ${quoteSymbol} (credited to platform account)`);

                // HYBRID MODEL: No P2P on-chain settlement needed
                // Trades are settled internally via execute_trade RPC
                // Fees are credited to platform account (user_id: 00000000-0000-0000-0000-000000000001)
                // On-chain transfers only happen during user-initiated withdrawals
                console.log(`[Matching Engine] ✓ Trade settled internally (hybrid model)`);

                // Update market_prices with the latest execution price using RPC for reliability
                const { error: updatePriceError } = await supabase.rpc('update_last_traded_price', {
                  p_symbol: symbol,
                  p_price: executionPrice.toNumber()
                });

                if (updatePriceError) {
                  console.warn(`[Matching Engine] Failed to update market_prices for ${symbol}:`, updatePriceError);
                } else {
                  console.log(`[Matching Engine] ✓ Updated market_prices.current_price to ${executionPrice.toFixed(8)} for ${symbol}`);
                }
              }

              totalMatches++;

              // Update local order objects for next iteration
              const newBuyFilled = new BigNumber(String(buyOrder.filled_amount)).plus(matchedQuantity);
              const buyOrderAmount = new BigNumber(String(buyOrder.amount));
              buyOrder.filled_amount = newBuyFilled.toNumber();
              buyOrder.remaining_amount = buyOrderAmount.minus(newBuyFilled).toNumber();
              
              const newSellFilled = new BigNumber(String(sellOrder.filled_amount)).plus(matchedQuantity);
              const sellOrderAmount = new BigNumber(String(sellOrder.amount));
              sellOrder.filled_amount = newSellFilled.toNumber();
              sellOrder.remaining_amount = sellOrderAmount.minus(newSellFilled).toNumber();

              console.log(`[Matching Engine] ✓ Trade executed: ${matchedQuantity.toString()} ${symbol} at ${executionPrice.toString()}`);

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
