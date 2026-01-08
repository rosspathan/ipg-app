/**
 * Place Order Edge Function - SIMPLIFIED
 * Uses wallet_balances as single source of truth
 * No on-chain verification during order placement
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import BigNumber from "https://esm.sh/bignumber.js@9.1.2";

BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader! } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[place-order] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Check for idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');
    
    if (idempotencyKey) {
      console.log('[place-order] Checking idempotency key:', idempotencyKey);
      
      const { data: existing } = await supabaseClient
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .eq('user_id', user.id)
        .eq('operation_type', 'order')
        .single();
      
      if (existing) {
        console.log('[place-order] Returning cached response');
        return new Response(
          JSON.stringify(existing.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { symbol, side, type, quantity, price, trading_type } = await req.json();
    const FEE_BUFFER = new BigNumber('1.005'); // 0.5% fee buffer

    console.log('[place-order] Order request:', { user_id: user.id, symbol, side, type, quantity, price });

    // Validate inputs
    if (!symbol || !side || !type || !quantity || quantity <= 0) {
      throw new Error('Invalid order parameters');
    }

    if (type === 'limit' && (!price || price <= 0)) {
      throw new Error('Limit orders require a valid price');
    }

    // Parse symbol (e.g., "BTC/USDT" -> base: "BTC", quote: "USDT")
    const [base_symbol, quote_symbol] = symbol.split('/');
    if (!base_symbol || !quote_symbol) {
      throw new Error('Invalid symbol format. Expected: BASE/QUOTE');
    }

    // For market orders, fetch market price
    let order_price = price;
    if (type === 'market' && !price) {
      const { data: marketPriceData } = await supabaseClient
        .from('market_prices')
        .select('current_price')
        .eq('symbol', symbol)
        .single();
      
      order_price = marketPriceData?.current_price || 0;
      console.log('[place-order] Fetched market price:', order_price);
      
      if (!order_price || order_price <= 0) {
        throw new Error('Unable to fetch current market price');
      }
    }

    // Calculate required amount using BigNumber
    const quantityBN = new BigNumber(String(quantity));
    const priceBN = new BigNumber(String(order_price));
    const order_value = quantityBN.times(priceBN);
    
    const required_asset = side === 'buy' ? quote_symbol : base_symbol;
    
    // Add fee buffer for buy orders
    const required_amount = side === 'buy' 
      ? order_value.times(FEE_BUFFER).decimalPlaces(8, BigNumber.ROUND_UP)
      : quantityBN.decimalPlaces(8, BigNumber.ROUND_DOWN);

    console.log('[place-order] Required:', { 
      asset: required_asset, 
      amount: required_amount.toString()
    });

    // SIMPLIFIED: Lock balance using wallet_balances only
    const { data: lockSuccess, error: lockError } = await supabaseClient.rpc(
      'lock_balance_for_order',
      {
        p_user_id: user.id,
        p_asset_symbol: required_asset,
        p_amount: required_amount.toFixed(8),
      }
    );

    if (lockError) {
      console.error('[place-order] Lock balance error:', lockError);
      throw new Error(`Failed to lock balance: ${lockError.message}`);
    }

    if (!lockSuccess) {
      // Get current balance for error message
      const { data: balance } = await supabaseClient
        .from('wallet_balances')
        .select('available, asset:assets(symbol)')
        .eq('user_id', user.id)
        .eq('assets.symbol', required_asset)
        .single();
      
      const available = balance?.available || 0;
      throw new Error(
        `Insufficient ${required_asset} balance. ` +
        `Available: ${available} ${required_asset}, ` +
        `Required: ${required_amount.toFixed(8)} ${required_asset}`
      );
    }

    console.log('[place-order] Balance locked:', required_amount.toFixed(8), required_asset);

    // Insert order
    const { data: order, error: insertError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        symbol,
        side,
        order_type: type,
        amount: quantityBN.toNumber(),
        price: order_price ? priceBN.toNumber() : null,
        status: 'pending',
        trading_type: trading_type || 'spot',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[place-order] Insert failed:', insertError);
      
      // Rollback: unlock balance
      await supabaseClient.rpc('unlock_balance_for_order', {
        p_user_id: user.id,
        p_asset_symbol: required_asset,
        p_amount: required_amount.toFixed(8),
      });
      
      throw new Error('Failed to create order');
    }

    console.log('[place-order] Order created:', order.id);

    // Trigger matching engine
    const matchingAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    try {
      const { data: settings } = await matchingAdminClient
        .from('trading_engine_settings')
        .select('auto_matching_enabled, circuit_breaker_active')
        .single();
      
      if (settings?.auto_matching_enabled && !settings?.circuit_breaker_active) {
        console.log('[place-order] Triggering matching engine...');
        
        const matchResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/match-orders`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({})
          }
        );
        
        if (matchResponse.ok) {
          const matchResult = await matchResponse.json();
          console.log('[place-order] Matching result:', matchResult);
        }
      }
    } catch (matchErr) {
      console.warn('[place-order] Matching engine call failed:', matchErr);
    }

    const responseData = {
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.order_type,
        quantity: order.amount,
        price: order.price,
        status: order.status,
        created_at: order.created_at,
      },
    };

    // Store idempotency key
    if (idempotencyKey) {
      await supabaseClient.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type: 'order',
        resource_id: order.id,
        response_data: responseData,
      }).catch(err => {
        console.warn('[place-order] Failed to store idempotency key:', err);
      });
    }
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[place-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
