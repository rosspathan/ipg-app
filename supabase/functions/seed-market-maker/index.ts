/**
 * Seed Market Maker Orders
 * Creates buy and sell orders at spreads around the last trade price
 * to provide liquidity for the trading pairs.
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

    // Get or create market maker user
    let marketMakerUserId = mmSettings.market_maker_user_id;
    
    if (!marketMakerUserId) {
      // Try to find existing market maker user
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('identifier', 'MARKET_MAKER')
        .single();
      
      if (existingUser) {
        marketMakerUserId = existingUser.id;
        // Update settings with the user ID
        await supabase
          .from('trading_engine_settings')
          .update({ market_maker_user_id: marketMakerUserId })
          .eq('id', settings.id);
      } else {
        console.error('[Market Maker] No market maker user found. Please create one first.');
        return new Response(
          JSON.stringify({ success: false, message: 'No market maker user configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    for (const market of markets || []) {
      const symbol = `${market.base_asset.symbol}/${market.quote_asset.symbol}`;
      console.log(`[Market Maker] Processing ${symbol}`);

      // Get last trade price for this symbol
      const { data: lastTrade } = await supabase
        .from('trades')
        .select('price')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get best bid and ask from order book
      const { data: bestBid } = await supabase
        .from('orders')
        .select('price')
        .eq('symbol', symbol)
        .eq('side', 'buy')
        .eq('status', 'pending')
        .order('price', { ascending: false })
        .limit(1)
        .single();

      const { data: bestAsk } = await supabase
        .from('orders')
        .select('price')
        .eq('symbol', symbol)
        .eq('side', 'sell')
        .eq('status', 'pending')
        .order('price', { ascending: true })
        .limit(1)
        .single();

      // Determine reference price (priority: last trade > midpoint > fallback)
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

      // Cancel existing market maker orders for this symbol
      await supabase
        .from('orders')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', marketMakerUserId)
        .eq('symbol', symbol)
        .eq('status', 'pending');

      // Create buy orders at decreasing prices
      for (let level = 1; level <= depthLevels; level++) {
        const priceOffset = (spreadPercent * level) / 100;
        const buyPrice = referencePrice * (1 - priceOffset);
        const quantity = orderSize / buyPrice;

        // Lock quote balance for buy order
        const quoteAmount = quantity * buyPrice;
        const { data: quoteBalance } = await supabase
          .from('wallet_balances')
          .select('available')
          .eq('user_id', marketMakerUserId)
          .eq('asset_id', market.quote_asset.id)
          .single();

        if (!quoteBalance || quoteBalance.available < quoteAmount) {
          console.warn(`[Market Maker] Insufficient ${market.quote_asset.symbol} balance for buy order`);
          continue;
        }

        // Lock the balance
        await supabase
          .from('wallet_balances')
          .update({ 
            available: quoteBalance.available - quoteAmount,
            locked: quoteAmount
          })
          .eq('user_id', marketMakerUserId)
          .eq('asset_id', market.quote_asset.id);

        // Create buy order
        const { error: buyError } = await supabase
          .from('orders')
          .insert({
            user_id: marketMakerUserId,
            symbol,
            side: 'buy',
            order_type: 'limit',
            amount: quantity,
            price: buyPrice,
            status: 'pending',
            trading_type: 'spot',
            order_source: 'market_maker'
          });

        if (!buyError) {
          ordersCreated++;
          console.log(`[Market Maker] Created buy order: ${quantity.toFixed(6)} ${symbol} @ ${buyPrice.toFixed(6)}`);
        }
      }

      // Create sell orders at increasing prices
      for (let level = 1; level <= depthLevels; level++) {
        const priceOffset = (spreadPercent * level) / 100;
        const sellPrice = referencePrice * (1 + priceOffset);
        const quantity = orderSize / sellPrice;

        // Lock base balance for sell order
        const { data: baseBalance } = await supabase
          .from('wallet_balances')
          .select('available')
          .eq('user_id', marketMakerUserId)
          .eq('asset_id', market.base_asset.id)
          .single();

        if (!baseBalance || baseBalance.available < quantity) {
          console.warn(`[Market Maker] Insufficient ${market.base_asset.symbol} balance for sell order`);
          continue;
        }

        // Lock the balance
        await supabase
          .from('wallet_balances')
          .update({ 
            available: baseBalance.available - quantity,
            locked: quantity
          })
          .eq('user_id', marketMakerUserId)
          .eq('asset_id', market.base_asset.id);

        // Create sell order
        const { error: sellError } = await supabase
          .from('orders')
          .insert({
            user_id: marketMakerUserId,
            symbol,
            side: 'sell',
            order_type: 'limit',
            amount: quantity,
            price: sellPrice,
            status: 'pending',
            trading_type: 'spot',
            order_source: 'market_maker'
          });

        if (!sellError) {
          ordersCreated++;
          console.log(`[Market Maker] Created sell order: ${quantity.toFixed(6)} ${symbol} @ ${sellPrice.toFixed(6)}`);
        }
      }
    }

    console.log(`[Market Maker] Completed: ${ordersCreated} orders created`);

    // Trigger order matching
    await supabase.functions.invoke('match-orders');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${ordersCreated} market maker orders`,
        ordersCreated
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
