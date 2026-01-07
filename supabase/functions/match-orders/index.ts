/**
 * Match Orders Edge Function
 * Phase 2.1: Fixed order matching priority (no infinite prices for market orders)
 * Phase 2.2: Fixed fee calculation (fees in correct assets)
 * Phase 3.4: BigNumber precision-safe calculations
 * Phase 4.3: Implemented circuit breaker logic
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

const ADMIN_FEE_PERCENT = new BigNumber('0.5'); // 0.5% fee on each side (buy and sell)
const ADMIN_FEE_WALLET = '0x68e5bbd91c9b3bc74cbe47f649c6c58bd6aaae33';

const MAX_PRICE_DEVIATION = new BigNumber('0.50'); // 50% price deviation triggers circuit breaker (high for low-liquidity pairs)
const MIN_TRADES_FOR_CIRCUIT_BREAKER = 5; // Require at least 5 trades before enabling circuit breaker

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

    // Get all pending and partially_filled orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'partially_filled'])
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
      let referenceSource: 'market_prices' | 'last_trade' | 'none' = 'none';

      if (!tradeCountError && tradeCount && tradeCount >= MIN_TRADES_FOR_CIRCUIT_BREAKER) {
        // Prefer current market reference price (admin-set / internal price) over the last executed trade.
        const { data: marketRef, error: marketRefError } = await supabase
          .from('market_prices')
          .select('current_price')
          .eq('symbol', symbol)
          .single();

        if (!marketRefError && marketRef?.current_price && Number(marketRef.current_price) > 0) {
          referencePrice = new BigNumber(String(marketRef.current_price));
          referenceSource = 'market_prices';
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

          if (buyOrder.order_type === 'market' && sellOrder.order_type === 'market') {
            // Both market orders - should not match (no price reference)
            continue;
          } else if (buyOrder.order_type === 'market') {
            // Buy market order takes seller's limit price
            canMatch = true;
            executionPrice = new BigNumber(String(sellOrder.price));
          } else if (sellOrder.order_type === 'market') {
            // Sell market order takes buyer's limit price
            canMatch = true;
            executionPrice = new BigNumber(String(buyOrder.price));
          } else {
            // Both limit orders: match if buy price >= sell price
            canMatch = buyOrder.price >= sellOrder.price;
            executionPrice = new BigNumber(String(sellOrder.price)); // Maker (seller) sets the price
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

            // ADMIN FEE: 0.5% on each side (buyer and seller)
            // Both fees calculated in quote asset for simplicity
            const quoteAmount = matchedQuantity.times(executionPrice).decimalPlaces(8, BigNumber.ROUND_DOWN);
            const buyerFee = quoteAmount.times(ADMIN_FEE_PERCENT).dividedBy(100).decimalPlaces(8, BigNumber.ROUND_DOWN);
            const sellerFee = quoteAmount.times(ADMIN_FEE_PERCENT).dividedBy(100).decimalPlaces(8, BigNumber.ROUND_DOWN);
            const adminWallet = engineSettings.admin_fee_wallet || ADMIN_FEE_WALLET;

            // Parse symbol (e.g., BTC/USDT -> base: BTC, quote: USDT)
            const [baseSymbol, quoteSymbol] = symbol.split('/');

            console.log(`[Matching Engine] Fee calculation: Buyer fee=${buyerFee.toFixed(8)} ${quoteSymbol}, Seller fee=${sellerFee.toFixed(8)} ${quoteSymbol}, Admin wallet=${adminWallet}`);

            try {
              console.log(`[Matching Engine] Executing atomic trade: buyer=${buyOrder.id}, seller=${sellOrder.id}, base=${matchedQuantity.toFixed(8)} ${baseSymbol}, quote=${quoteAmount.toFixed(8)} ${quoteSymbol}`);

              // Use atomic execute_trade RPC that handles settle + trade record + order updates in one transaction
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
                continue;
              }

              console.log('[Matching Engine] Trade executed successfully, trade_id:', tradeId);

              // Record fees in trading_fees_collected ledger and transfer on-chain
              if (tradeId) {
                const feeRecordIds: string[] = [];

                // Buyer fee
                const { data: buyerFeeRecord } = await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: buyerFee.toNumber(),
                    fee_percent: ADMIN_FEE_PERCENT.toNumber(),
                    user_id: buyOrder.user_id,
                    side: 'buy',
                    admin_wallet: adminWallet,
                    status: 'pending'
                  })
                  .select('id')
                  .single();

                if (buyerFeeRecord) feeRecordIds.push(buyerFeeRecord.id);

                // Seller fee
                const { data: sellerFeeRecord } = await supabase
                  .from('trading_fees_collected')
                  .insert({
                    trade_id: tradeId,
                    symbol,
                    fee_asset: quoteSymbol,
                    fee_amount: sellerFee.toNumber(),
                    fee_percent: ADMIN_FEE_PERCENT.toNumber(),
                    user_id: sellOrder.user_id,
                    side: 'sell',
                    admin_wallet: adminWallet,
                    status: 'pending'
                  })
                  .select('id')
                  .single();

                if (sellerFeeRecord) feeRecordIds.push(sellerFeeRecord.id);

                console.log(`[Matching Engine] ✓ Fees recorded: Buyer=${buyerFee.toString()}, Seller=${sellerFee.toString()}`);

                // Transfer combined fees on-chain
                const totalFee = buyerFee.plus(sellerFee);
                if (totalFee.isGreaterThan(0)) {
                  try {
                    console.log(`[Matching Engine] Initiating on-chain fee transfer: ${totalFee.toString()} ${quoteSymbol}`);
                    
                    const { data: feeTransfer, error: feeError } = await supabase.functions.invoke('transfer-trading-fee', {
                      body: {
                        amount: totalFee.toString(),
                        asset: quoteSymbol,
                        trade_id: tradeId,
                        fee_record_ids: feeRecordIds
                      }
                    });

                    if (feeError) {
                      console.error(`[Matching Engine] Fee transfer error:`, feeError);
                    } else if (feeTransfer?.tx_hash) {
                      console.log(`[Matching Engine] ✓ Fees transferred on-chain: ${totalFee.toString()} ${quoteSymbol} -> tx: ${feeTransfer.tx_hash}`);
                    }
                  } catch (feeTransferError) {
                    // Log error but don't fail the trade - fees are still recorded in DB
                    console.error(`[Matching Engine] Fee transfer failed (non-fatal):`, feeTransferError);
                  }
                }

                // HYBRID MODEL: No P2P on-chain settlement needed
                // Trades are settled internally via execute_trade RPC
                // On-chain transfers only happen during user-initiated withdrawals
                console.log(`[Matching Engine] ✓ Trade settled internally (hybrid model)`)
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
