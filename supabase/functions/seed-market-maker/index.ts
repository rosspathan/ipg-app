/**
 * Seed Market Maker Orders
 * Creates buy and sell orders at spreads around the last trade price
 * to provide liquidity for the trading pairs.
 * 
 * FIXED: Proper balance locking (increment locked, not overwrite)
 * FIXED: Unlock funds before cancelling old orders
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketMakerSettings {
  market_maker_enabled: boolean;
  market_maker_user_id: string | null;
  market_maker_spread_percent: number;
  market_maker_depth_levels: number;
  market_maker_order_size: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Market Maker] Starting order seeding process');

    // Get trading engine settings
    const { data: settings, error: settingsError } = await supabase
      .from('trading_engine_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('[Market Maker] Error fetching settings:', settingsError);
      throw settingsError;
    }

    const mmSettings = settings as MarketMakerSettings;

    // Check if market maker is enabled
    if (!mmSettings.market_maker_enabled) {
      console.log('[Market Maker] Market maker is disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Market maker is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require market_maker_user_id to be set
    const marketMakerUserId = mmSettings.market_maker_user_id;
    
    if (!marketMakerUserId) {
      console.error('[Market Maker] No market_maker_user_id configured. Run admin-setup-market-maker first.');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No market maker user configured. Please run Setup Market Maker first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Market Maker] Using market maker user:', marketMakerUserId);

    const spreadPercent = mmSettings.market_maker_spread_percent || 1.0;
    const depthLevels = mmSettings.market_maker_depth_levels || 3;
    const orderSize = mmSettings.market_maker_order_size || 100;

    // Get all active trading pairs
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select(`
        id,
        base_asset:assets!markets_base_asset_id_fkey(id, symbol),
        quote_asset:assets!markets_quote_asset_id_fkey(id, symbol)
      `)
      .eq('is_active', true);

    if (marketsError) {
      console.error('[Market Maker] Error fetching markets:', marketsError);
      throw marketsError;
    }

    let ordersCreated = 0;
    let ordersUnlocked = 0;

    for (const market of markets || []) {
      const symbol = `${market.base_asset.symbol}/${market.quote_asset.symbol}`;
      console.log(`[Market Maker] Processing ${symbol}`);

      // ============================================
      // STEP 1: Unlock funds from existing MM orders BEFORE cancelling
      // ============================================
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('id, side, remaining_amount, price')
        .eq('user_id', marketMakerUserId)
        .eq('symbol', symbol)
        .eq('status', 'pending');

      if (existingOrders && existingOrders.length > 0) {
        console.log(`[Market Maker] Found ${existingOrders.length} existing orders to cancel`);
        
        // Calculate total locked amounts to unlock
        let unlockBase = 0;
        let unlockQuote = 0;

        for (const order of existingOrders) {
          const remaining = order.remaining_amount || 0;
          if (order.side === 'buy') {
            unlockQuote += remaining * order.price;
          } else {
            unlockBase += remaining;
          }
        }

        // Unlock quote asset (for buy orders)
        if (unlockQuote > 0) {
          const { data: quoteBalance } = await supabase
            .from('wallet_balances')
            .select('id, available, locked')
            .eq('user_id', marketMakerUserId)
            .eq('asset_id', market.quote_asset.id)
            .single();

          if (quoteBalance) {
            await supabase
              .from('wallet_balances')
              .update({
                available: quoteBalance.available + unlockQuote,
                locked: Math.max(0, quoteBalance.locked - unlockQuote)
              })
              .eq('id', quoteBalance.id);
            console.log(`[Market Maker] Unlocked ${unlockQuote.toFixed(4)} ${market.quote_asset.symbol}`);
            ordersUnlocked++;
          }
        }

        // Unlock base asset (for sell orders)
        if (unlockBase > 0) {
          const { data: baseBalance } = await supabase
            .from('wallet_balances')
            .select('id, available, locked')
            .eq('user_id', marketMakerUserId)
            .eq('asset_id', market.base_asset.id)
            .single();

          if (baseBalance) {
            await supabase
              .from('wallet_balances')
              .update({
                available: baseBalance.available + unlockBase,
                locked: Math.max(0, baseBalance.locked - unlockBase)
              })
              .eq('id', baseBalance.id);
            console.log(`[Market Maker] Unlocked ${unlockBase.toFixed(4)} ${market.base_asset.symbol}`);
            ordersUnlocked++;
          }
        }

        // Now cancel the orders
        await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('user_id', marketMakerUserId)
          .eq('symbol', symbol)
          .eq('status', 'pending');
      }

      // ============================================
      // STEP 2: Determine reference price
      // ============================================
      const { data: lastTrade } = await supabase
        .from('trades')
        .select('price')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: bestBid } = await supabase
        .from('orders')
        .select('price')
        .eq('symbol', symbol)
        .eq('side', 'buy')
        .eq('status', 'pending')
        .neq('user_id', marketMakerUserId) // Exclude MM orders
        .order('price', { ascending: false })
        .limit(1)
        .single();

      const { data: bestAsk } = await supabase
        .from('orders')
        .select('price')
        .eq('symbol', symbol)
        .eq('side', 'sell')
        .eq('status', 'pending')
        .neq('user_id', marketMakerUserId) // Exclude MM orders
        .order('price', { ascending: true })
        .limit(1)
        .single();

      let referencePrice: number;
      
      if (lastTrade?.price) {
        referencePrice = lastTrade.price;
      } else if (bestBid?.price && bestAsk?.price) {
        referencePrice = (bestBid.price + bestAsk.price) / 2;
      } else if (bestBid?.price) {
        referencePrice = bestBid.price;
      } else if (bestAsk?.price) {
        referencePrice = bestAsk.price;
      } else {
        // No reference price available, use asset initial price
        const { data: asset } = await supabase
          .from('assets')
          .select('initial_price')
          .eq('symbol', market.base_asset.symbol)
          .single();
        
        referencePrice = asset?.initial_price || 1;
      }

      console.log(`[Market Maker] Reference price for ${symbol}: ${referencePrice}`);

      // ============================================
      // STEP 3: Create new orders with proper locking (INCREMENT locked)
      // ============================================

      // Get fresh balances after unlock
      const { data: freshQuoteBalance } = await supabase
        .from('wallet_balances')
        .select('id, available, locked')
        .eq('user_id', marketMakerUserId)
        .eq('asset_id', market.quote_asset.id)
        .single();

      const { data: freshBaseBalance } = await supabase
        .from('wallet_balances')
        .select('id, available, locked')
        .eq('user_id', marketMakerUserId)
        .eq('asset_id', market.base_asset.id)
        .single();

      if (!freshQuoteBalance || !freshBaseBalance) {
        console.warn(`[Market Maker] Missing balance for ${symbol}, skipping`);
        continue;
      }

      let currentQuoteAvailable = freshQuoteBalance.available;
      let currentQuoteLocked = freshQuoteBalance.locked;
      let currentBaseAvailable = freshBaseBalance.available;
      let currentBaseLocked = freshBaseBalance.locked;

      // Create buy orders at decreasing prices
      for (let level = 1; level <= depthLevels; level++) {
        const priceOffset = (spreadPercent * level) / 100;
        const buyPrice = referencePrice * (1 - priceOffset);
        const quantity = orderSize / buyPrice;
        const quoteAmount = quantity * buyPrice;

        if (currentQuoteAvailable < quoteAmount) {
          console.warn(`[Market Maker] Insufficient ${market.quote_asset.symbol} for buy level ${level}`);
          continue;
        }

        // Lock by decrementing available and incrementing locked
        currentQuoteAvailable -= quoteAmount;
        currentQuoteLocked += quoteAmount;

        // Create buy order
        const { error: buyError } = await supabase
          .from('orders')
          .insert({
            user_id: marketMakerUserId,
            symbol,
            side: 'buy',
            order_type: 'limit',
            amount: quantity,
            remaining_amount: quantity,
            price: buyPrice,
            status: 'pending',
            trading_type: 'spot',
            order_source: 'market_maker'
          });

        if (!buyError) {
          ordersCreated++;
          console.log(`[Market Maker] Created buy: ${quantity.toFixed(6)} ${symbol} @ ${buyPrice.toFixed(6)}`);
        } else {
          console.error(`[Market Maker] Buy order error:`, buyError);
          // Rollback the lock tracking
          currentQuoteAvailable += quoteAmount;
          currentQuoteLocked -= quoteAmount;
        }
      }

      // Create sell orders at increasing prices
      for (let level = 1; level <= depthLevels; level++) {
        const priceOffset = (spreadPercent * level) / 100;
        const sellPrice = referencePrice * (1 + priceOffset);
        const quantity = orderSize / sellPrice;

        if (currentBaseAvailable < quantity) {
          console.warn(`[Market Maker] Insufficient ${market.base_asset.symbol} for sell level ${level}`);
          continue;
        }

        // Lock by decrementing available and incrementing locked
        currentBaseAvailable -= quantity;
        currentBaseLocked += quantity;

        // Create sell order
        const { error: sellError } = await supabase
          .from('orders')
          .insert({
            user_id: marketMakerUserId,
            symbol,
            side: 'sell',
            order_type: 'limit',
            amount: quantity,
            remaining_amount: quantity,
            price: sellPrice,
            status: 'pending',
            trading_type: 'spot',
            order_source: 'market_maker'
          });

        if (!sellError) {
          ordersCreated++;
          console.log(`[Market Maker] Created sell: ${quantity.toFixed(6)} ${symbol} @ ${sellPrice.toFixed(6)}`);
        } else {
          console.error(`[Market Maker] Sell order error:`, sellError);
          // Rollback the lock tracking
          currentBaseAvailable += quantity;
          currentBaseLocked -= quantity;
        }
      }

      // Update balances with final locked amounts
      await supabase
        .from('wallet_balances')
        .update({
          available: currentQuoteAvailable,
          locked: currentQuoteLocked
        })
        .eq('id', freshQuoteBalance.id);

      await supabase
        .from('wallet_balances')
        .update({
          available: currentBaseAvailable,
          locked: currentBaseLocked
        })
        .eq('id', freshBaseBalance.id);
    }

    console.log(`[Market Maker] Completed: ${ordersCreated} orders created, ${ordersUnlocked} unlock operations`);

    // Trigger order matching
    try {
      await supabase.functions.invoke('match-orders');
    } catch (e) {
      console.warn('[Market Maker] Match-orders invocation failed (non-critical):', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${ordersCreated} market maker orders`,
        ordersCreated,
        ordersUnlocked
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Market Maker] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
