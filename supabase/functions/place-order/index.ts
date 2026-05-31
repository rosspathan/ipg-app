/**
 * Place Order Edge Function - EXCHANGE GRADE v2
 * 
 * Enhancements:
 * 1. Per-user rate limiting (max_orders_per_user_per_minute from trading_engine_settings)
 * 2. Min/max order size enforcement per pair (trading_pair_settings)
 * 3. Per-pair circuit breaker (5% per 5 min, configurable per pair)
 * 4. Self-trade prevention (existing)
 * 5. Atomic RPC for zero orphan locks (existing)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

/**
 * Always return HTTP 200 for business / validation errors so the Supabase
 * SDK doesn't throw a generic FunctionsHttpError on the client. The client
 * inspects { success: false, error, error_code } in the body.
 *
 * Reserve non-2xx for true infrastructure failures (auth missing, server crash).
 */
function businessError(error: string, error_code?: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: false, error, error_code, ...extra }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'You must be logged in to place orders.', error_code: 'NO_TOKEN' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader! } },
        auth: { persistSession: false }
      }
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[place-order] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Your session expired. Please sign in again.', error_code: 'INVALID_SESSION' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ================================================================
    // KYC GATE — must be approved across all 3 pillars before trading
    // ================================================================
    {
      const { data: kycOk, error: kycErr } = await adminClient.rpc('is_kyc_approved', { _user_id: user.id });
      if (kycErr) {
        console.error('[place-order] KYC check failed:', kycErr);
        return businessError(
          'Could not verify your KYC status. Please try again in a moment.',
          'KYC_CHECK_FAILED'
        );
      }
      if (!kycOk) {
        console.warn(`[place-order] Blocked — user ${user.id} not KYC approved`);
        return businessError(
          'KYC approval required before trading. Complete document verification, face verification, and admin mobile verification to continue.',
          'KYC_REQUIRED'
        );
      }
    }

    // Check for idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');
    
    if (idempotencyKey) {
      const { data: existing } = await supabaseClient
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .eq('user_id', user.id)
        .eq('operation_type', 'order')
        .maybeSingle();
      
      if (existing) {
        console.log('[place-order] Returning cached idempotent response');
        return new Response(
          JSON.stringify(existing.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body = await req.json();
    const { symbol, side, type, quantity, price, trading_type } = body;

    // ================================================================
    // STRICT INPUT VALIDATION
    // ================================================================
    if (!symbol || typeof symbol !== 'string' || !/^[A-Z0-9_/-]{1,20}$/i.test(symbol)) {
      return businessError('Invalid trading pair symbol.', 'INVALID_SYMBOL');
    }
    if (!side || (side !== 'buy' && side !== 'sell')) {
      return businessError('Please select Buy or Sell.', 'INVALID_SIDE');
    }
    if (!type || (type !== 'market' && type !== 'limit')) {
      return businessError('Please select order type (Market or Limit).', 'INVALID_TYPE');
    }
    if (quantity === undefined || typeof quantity !== 'number' || !isFinite(quantity) || quantity <= 0 || quantity > 1e12) {
      return businessError('Please enter a valid quantity greater than 0.', 'INVALID_QUANTITY');
    }
    // Reject "dust" quantities that are non-tradable and would render as 0.00000
    // in the order book. Keep in sync with ORDER_BOOK_DUST_THRESHOLD / DB dust constant.
    const DUST_QUANTITY = 0.00001;
    if (quantity < DUST_QUANTITY) {
      return businessError(
        `Order quantity is too small to trade. Minimum is ${DUST_QUANTITY}.`,
        'DUST_QUANTITY',
      );
    }
    if (type === 'limit') {
      if (price === undefined || typeof price !== 'number' || !isFinite(price) || price <= 0 || price > 1e12) {
        return businessError('Limit orders require a valid positive price.', 'INVALID_PRICE');
      }
    }
    if (trading_type !== undefined && trading_type !== null && !['spot', 'margin'].includes(trading_type)) {
      return businessError('Invalid trading type.', 'INVALID_TRADING_TYPE');
    }

    // ================================================================
    // ENHANCEMENT 4: RATE LIMITING
    // Fetch engine settings and pair settings in parallel
    // ================================================================
    const [engineSettingsResult, pairSettingsResult] = await Promise.all([
      adminClient.from('trading_engine_settings').select('*').single(),
      adminClient.from('trading_pair_settings').select('*').eq('symbol', symbol).maybeSingle(),
    ]);

    const engineSettings = engineSettingsResult.data;
    const pairSettings = pairSettingsResult.data;

    // Rate limit check using DB
    const maxOrdersPerMinute = engineSettings?.max_orders_per_user_per_minute ?? 5;
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(); // floor to minute

    const { data: rateRow, error: rateError } = await adminClient
      .from('order_rate_limits')
      .select('order_count')
      .eq('user_id', user.id)
      .eq('window_start', windowStart)
      .maybeSingle();

    const currentCount = rateRow?.order_count ?? 0;

    if (currentCount >= maxOrdersPerMinute) {
      console.warn(`[place-order] Rate limit exceeded for user ${user.id}: ${currentCount}/${maxOrdersPerMinute} orders/min`);
      return businessError(
        `Rate limit exceeded: Maximum ${maxOrdersPerMinute} orders per minute. Please wait before placing more orders.`,
        'RATE_LIMITED',
        { retry_after: 60 - (Math.floor(Date.now() / 1000) % 60) }
      );
    }

    // ================================================================
    // ENHANCEMENT 2: MIN/MAX ORDER SIZE ENFORCEMENT
    // ================================================================
    if (pairSettings) {
      const minSize = Number(pairSettings.min_order_size);
      const maxSize = pairSettings.max_order_size ? Number(pairSettings.max_order_size) : null;

      if (quantity < minSize) {
        return businessError(
          `Minimum order size for ${symbol} is ${minSize}. Your order (${quantity}) is too small.`,
          'BELOW_MIN_ORDER_SIZE'
        );
      }
      if (maxSize && quantity > maxSize) {
        return businessError(
          `Maximum order size for ${symbol} is ${maxSize}. Your order (${quantity}) exceeds the limit.`,
          'ABOVE_MAX_ORDER_SIZE'
        );
      }
    }

    // ================================================================
    // ENHANCEMENT 3: PER-PAIR CIRCUIT BREAKER (5% / 5 min default)
    // Only applies to limit orders where we know the price
    // ================================================================
    if (type === 'limit' && price && pairSettings) {
      const { data: cbResult } = await adminClient.rpc('check_pair_circuit_breaker', {
        p_symbol: symbol,
        p_trade_price: price
      });

      if (cbResult && !cbResult.allowed) {
        console.warn(`[place-order] Circuit breaker triggered for ${symbol}: ${cbResult.reason}`);
        return businessError(
          cbResult.reason || `Circuit breaker active for ${symbol}. Trading halted due to excessive price movement.`,
          'CIRCUIT_BREAKER',
          { circuit_breaker: true, change_pct: cbResult.change_pct }
        );
      }
    }

    // ================================================================
    // SELF-TRADE PREVENTION (existing logic)
    // ================================================================
    if (type === 'limit' && price) {
      const oppositeSide = side === 'buy' ? 'sell' : 'buy';
      let conflictQuery = supabaseClient
        .from('orders')
        .select('id, price, remaining_amount', { count: 'exact', head: false })
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .eq('side', oppositeSide)
        .in('status', ['pending', 'partially_filled'])
        .eq('order_type', 'limit')
        .limit(1);

      if (side === 'buy') {
        conflictQuery = conflictQuery.lte('price', price);
      } else {
        conflictQuery = conflictQuery.gte('price', price);
      }

      const { data: conflicting, error: conflictError } = await conflictQuery;

      if (!conflictError && conflicting && conflicting.length > 0) {
        const conflictPrice = conflicting[0].price;
        return businessError(
          `Self-trade prevention: You have a ${oppositeSide} order at ₮${conflictPrice} that would match this ${side} order at ₮${price}. Cancel your existing ${oppositeSide} order first.`,
          'SELF_TRADE_PREVENTED'
        );
      }
    }

    // ================================================================
    // INCREMENT RATE LIMIT COUNTER (upsert)
    // ================================================================
    await adminClient.from('order_rate_limits').upsert(
      { user_id: user.id, window_start: windowStart, order_count: currentCount + 1 },
      { onConflict: 'user_id,window_start' }
    );

    // ================================================================
    // ATOMIC ORDER PLACEMENT
    // ================================================================
    const { data: result, error: rpcError } = await supabaseClient.rpc(
      'place_order_atomic',
      {
        p_user_id: user.id,
        p_symbol: symbol,
        p_side: side,
        p_order_type: type,
        p_amount: quantity,
        p_price: price || null,
        p_trading_type: trading_type || 'spot'
      }
    );

    if (rpcError) {
      console.error('[place-order] RPC error:', rpcError);
      // Translate common SQL errors into friendly messages
      const msg = rpcError.message || '';
      if (/insufficient.*balance/i.test(msg)) {
        return businessError(msg, 'INSUFFICIENT_BALANCE');
      }
      if (/pair.*disabled|trading_disabled/i.test(msg)) {
        return businessError('This trading pair is currently disabled.', 'PAIR_DISABLED');
      }
      return businessError(`Order could not be placed: ${msg}`, 'RPC_ERROR');
    }

    if (!result?.success) {
      const errMsg = result?.error || 'Order placement failed';
      const code = /insufficient/i.test(errMsg) ? 'INSUFFICIENT_BALANCE' : 'ORDER_REJECTED';
      return businessError(errMsg, code);
    }

    // Fetch the created order details
    const { data: order } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', result.order_id)
      .maybeSingle();

    // ================================================================
    // TRIGGER MATCHING ENGINE
    // ================================================================
    let matchResult = null;
    try {
      const settings = engineSettings;

      // Auto-reset circuit breaker for low-liquidity markets
      if (settings?.circuit_breaker_active) {
        await adminClient
          .from('trading_engine_settings')
          .update({ circuit_breaker_active: false, updated_at: new Date().toISOString() })
          .eq('id', settings.id || '00000000-0000-0000-0000-000000000001');
      }
      
      if (settings?.auto_matching_enabled) {
        const { data: mResult, error: matchError } = await adminClient.functions.invoke('match-orders', {
          body: { symbol }
        });
        
        if (matchError) {
          console.error('[place-order] Matching engine error:', matchError);
        } else {
          matchResult = mResult;
        }
      }
    } catch (matchErr) {
      console.error('[place-order] Matching engine call failed:', matchErr);
    }

    // Re-fetch order to get post-match status
    const { data: updatedOrder } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', result.order_id)
      .maybeSingle();

    const finalOrder = updatedOrder || order;

    if (!finalOrder) {
      return new Response(
        JSON.stringify({
          success: true,
          order: { id: result.order_id, symbol, side, type, quantity, price: price || null, status: 'pending' },
          matched: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = {
      success: true,
      order: {
        id: finalOrder.id,
        symbol: finalOrder.symbol,
        side: finalOrder.side,
        type: finalOrder.order_type,
        quantity: finalOrder.amount,
        price: finalOrder.price,
        status: finalOrder.status,
        filled_amount: finalOrder.filled_amount || 0,
        remaining_amount: finalOrder.remaining_amount || finalOrder.amount,
        created_at: finalOrder.created_at,
        locked_asset: result.locked_asset,
        locked_amount: result.locked_amount,
      },
      matched: matchResult?.matched || 0,
      rate_limit: {
        remaining: maxOrdersPerMinute - (currentCount + 1),
        limit: maxOrdersPerMinute,
        window: '1 minute'
      }
    };

    // Store idempotency key
    if (idempotencyKey) {
      await supabaseClient.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type: 'order',
        resource_id: finalOrder.id,
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
    console.error('[place-order] Unhandled error:', error);
    // Still return 200 so client can read the message reliably
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unexpected error placing order',
        error_code: 'UNHANDLED_EXCEPTION',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
