import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Resolve rate from market_prices for a pair.
 * Tries direct, reverse, and 2-hop via USDT/USDI.
 */
function resolveRate(
  prices: { symbol: string; current_price: number }[],
  fromAsset: string,
  toAsset: string
): { rate: number; routeType: 'direct' | '2hop'; intermediateAsset?: string } | null {
  const findPrice = (sym: string) => {
    const entry = prices.find(p => p.symbol === sym)
    return entry?.current_price ?? null
  }

  // Direct
  const direct = findPrice(`${fromAsset}/${toAsset}`)
  if (direct && direct > 0) return { rate: direct, routeType: 'direct' }

  // Reverse
  const reverse = findPrice(`${toAsset}/${fromAsset}`)
  if (reverse && reverse > 0) return { rate: 1 / reverse, routeType: 'direct' }

  // Helper to get price for an asset in terms of a bridge asset
  const getRate = (asset: string, bridge: string): number | null => {
    const direct = findPrice(`${asset}/${bridge}`)
    if (direct && direct > 0) return direct
    const reverse = findPrice(`${bridge}/${asset}`)
    if (reverse && reverse > 0) return 1 / reverse
    return null
  }

  // 2-hop via USDT
  if (fromAsset !== 'USDT' && toAsset !== 'USDT') {
    const fromUsdt = getRate(fromAsset, 'USDT')
    const toUsdt = getRate(toAsset, 'USDT')
    if (fromUsdt && toUsdt && isFinite(fromUsdt) && isFinite(toUsdt)) {
      return { rate: fromUsdt / toUsdt, routeType: '2hop', intermediateAsset: 'USDT' }
    }
  }

  // 2-hop via USDI
  if (fromAsset !== 'USDI' && toAsset !== 'USDI') {
    const fromUsdi = getRate(fromAsset, 'USDI')
    const toUsdi = getRate(toAsset, 'USDI')
    if (fromUsdi && toUsdi && isFinite(fromUsdi) && isFinite(toUsdi)) {
      return { rate: fromUsdi / toUsdi, routeType: '2hop', intermediateAsset: 'USDI' }
    }
  }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Parse body ONCE at the top
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const {
    from_asset,
    to_asset,
    from_amount,
    expected_rate,
    slippage_percent = 0.5,
    min_receive,
    idempotency_key,
  } = body

  // Validate required fields
  if (!from_asset || !to_asset || !from_amount || !expected_rate || !idempotency_key) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: from_asset, to_asset, from_amount, expected_rate, idempotency_key' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const amount = parseFloat(from_amount)
  if (isNaN(amount) || amount <= 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid from_amount' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Auth: get user from token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = claimsData.claims.sub as string

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`[execute-swap] User ${userId}: ${amount} ${from_asset} → ${to_asset}`)

    // 1. Fetch current market prices
    const { data: prices, error: pricesError } = await supabaseAdmin
      .from('market_prices')
      .select('symbol, current_price')

    if (pricesError || !prices) {
      throw new Error('Failed to fetch market prices')
    }

    // 2. Resolve current rate
    const resolved = resolveRate(prices, from_asset, to_asset)
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: 'ROUTE_UNAVAILABLE', message: `No trading route for ${from_asset} → ${to_asset}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { rate: currentRate, routeType, intermediateAsset } = resolved

    // 3. Slippage check: compare current rate vs expected rate
    const priceDrift = Math.abs(currentRate - parseFloat(expected_rate)) / parseFloat(expected_rate)
    const slippageTolerance = parseFloat(slippage_percent) / 100
    if (priceDrift > slippageTolerance) {
      return new Response(
        JSON.stringify({
          error: 'SLIPPAGE_EXCEEDED',
          message: `Price moved ${(priceDrift * 100).toFixed(2)}% beyond ${slippage_percent}% tolerance`,
          expected_rate,
          current_rate: currentRate,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Calculate output with server-side fee deduction
    const feePercent = routeType === '2hop' ? 0.0015 : 0.001 // 0.15% or 0.1%
    const grossOutput = amount * currentRate
    const feeAmount = grossOutput * feePercent
    const netOutput = grossOutput - feeAmount

    // 5. Check minimum receive
    if (min_receive && netOutput < parseFloat(min_receive)) {
      return new Response(
        JSON.stringify({
          error: 'MIN_RECEIVE_NOT_MET',
          message: `Output ${netOutput.toFixed(8)} is below minimum ${min_receive}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Advisory lock to prevent concurrent swaps
    const lockId = parseInt(userId.replace(/-/g, '').substring(0, 15), 16) % 2147483647
    const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc(
      'pg_try_advisory_xact_lock',
      { key: lockId }
    )
    if (lockError || !lockAcquired) {
      throw new Error('Failed to acquire swap lock. Please try again.')
    }

    // 7. Atomic debit source asset via record_bsk_transaction
    const debitKey = `swap:debit:${idempotency_key}`
    const creditKey = `swap:credit:${idempotency_key}`

    const { data: debitResult, error: debitError } = await supabaseAdmin.rpc(
      'record_bsk_transaction',
      {
        p_user_id: userId,
        p_idempotency_key: debitKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'swap',
        p_amount_bsk: amount,
        p_balance_type: 'withdrawable',
        p_notes: `SWAP: Sold ${amount} ${from_asset} for ${to_asset}`,
        p_meta_json: {
          swap_type: routeType,
          from_asset,
          to_asset,
          intermediate_asset: intermediateAsset || null,
          rate: currentRate,
          fee_percent: feePercent * 100,
          fee_amount: feeAmount,
          idempotency_key,
          leg: 'debit',
        },
      }
    )

    if (debitError) {
      console.error('[execute-swap] Debit failed:', debitError)
      // Check for insufficient balance
      if (debitError.message?.includes('Insufficient balance')) {
        return new Response(
          JSON.stringify({ error: 'INSUFFICIENT_BALANCE', message: debitError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Swap debit failed: ${debitError.message}`)
    }

    // 8. Atomic credit target asset
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc(
      'record_bsk_transaction',
      {
        p_user_id: userId,
        p_idempotency_key: creditKey,
        p_tx_type: 'credit',
        p_tx_subtype: 'swap',
        p_amount_bsk: netOutput,
        p_balance_type: 'withdrawable',
        p_notes: `SWAP: Bought ${netOutput.toFixed(8)} ${to_asset} from ${from_asset}`,
        p_meta_json: {
          swap_type: routeType,
          from_asset,
          to_asset,
          intermediate_asset: intermediateAsset || null,
          rate: currentRate,
          fee_percent: feePercent * 100,
          fee_amount: feeAmount,
          idempotency_key,
          leg: 'credit',
        },
      }
    )

    if (creditError) {
      console.error('[execute-swap] Credit failed:', creditError)
      throw new Error(`Swap partially failed: ${creditError.message}. Contact support with key: ${idempotency_key}`)
    }

    // 9. Record swap in swaps table
    const { error: swapRecordError } = await supabaseAdmin
      .from('swaps')
      .insert({
        user_id: userId,
        from_asset,
        to_asset,
        from_amount: amount,
        to_amount: netOutput,
        estimated_rate: parseFloat(expected_rate),
        actual_rate: currentRate,
        route_type: routeType,
        intermediate_asset: intermediateAsset || null,
        slippage_percent: parseFloat(slippage_percent),
        min_receive: min_receive ? parseFloat(min_receive) : null,
        platform_fee: feeAmount,
        trading_fees: 0,
        total_fees: feeAmount,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })

    if (swapRecordError) {
      console.error('[execute-swap] Swap record insert error (non-critical):', swapRecordError)
    }

    // 10. Record fee in trading_fees_collected
    try {
      await supabaseAdmin
        .from('trading_fees_collected')
        .insert({
          symbol: `${from_asset}/${to_asset}`,
          fee_asset: to_asset,
          fee_amount: feeAmount,
          fee_percent: feePercent * 100,
          user_id: userId,
          side: 'swap',
          status: 'collected',
        })
    } catch (feeErr) {
      console.error('[execute-swap] Fee record error (non-critical):', feeErr)
    }

    console.log(`[execute-swap] SUCCESS: ${amount} ${from_asset} → ${netOutput.toFixed(8)} ${to_asset} (fee: ${feeAmount.toFixed(8)})`)

    return new Response(
      JSON.stringify({
        success: true,
        from_asset,
        to_asset,
        from_amount: amount,
        to_amount: netOutput,
        rate: currentRate,
        fee_amount: feeAmount,
        fee_percent: feePercent * 100,
        route_type: routeType,
        intermediate_asset: intermediateAsset || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[execute-swap] Error:', error)

    // Try to record failed swap
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseAdmin
        .from('swaps')
        .insert({
          user_id: body?.user_id || '00000000-0000-0000-0000-000000000000',
          from_asset: from_asset || 'UNKNOWN',
          to_asset: to_asset || 'UNKNOWN',
          from_amount: amount || 0,
          to_amount: 0,
          estimated_rate: parseFloat(expected_rate) || 0,
          status: 'failed',
        })
    } catch (recordErr) {
      console.error('[execute-swap] Failed swap record error:', recordErr)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
