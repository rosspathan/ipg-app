import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { 
      trade_type, // 'buy' | 'sell' | 'swap'
      source_asset, 
      target_asset, 
      source_amount, 
      target_amount,
      market_pair, // e.g., 'BTC/USDT'
      order_id 
    } = await req.json()

    if (!trade_type || !source_asset || !target_asset || !source_amount || !target_amount || !order_id) {
      throw new Error('Invalid request: trade_type, source_asset, target_asset, source_amount, target_amount, and order_id required')
    }

    console.log(`[execute-atomic-trade] User ${user.id} executing ${trade_type}: ${source_amount} ${source_asset} → ${target_amount} ${target_asset}`)

    // Check if program is enabled
    const { data: programFlag } = await supabaseClient
      .from('program_flags')
      .select('enabled')
      .eq('program_code', 'trading')
      .single()

    if (programFlag && !programFlag.enabled) {
      return new Response(
        JSON.stringify({ error: 'PROGRAM_DISABLED', message: 'Trading is currently disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Acquire advisory lock to prevent concurrent trades by same user
    const lockId = parseInt(user.id.replace(/-/g, '').substring(0, 15), 16) % 2147483647
    console.log(`[execute-atomic-trade] Acquiring advisory lock ${lockId} for user ${user.id}`)

    const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc(
      'pg_try_advisory_xact_lock',
      { key: lockId }
    )

    if (lockError || !lockAcquired) {
      throw new Error('Failed to acquire trade lock. Please try again.')
    }

    // Generate idempotency keys
    const debitKey = `trade:debit:${user.id}:${order_id}`
    const creditKey = `trade:credit:${user.id}:${order_id}`

    // ATOMIC TRANSACTION: Debit source asset
    const { data: debitResult, error: debitError } = await supabaseAdmin.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: debitKey,
        p_tx_type: 'debit',
        p_tx_subtype: trade_type === 'swap' ? 'swap' : 'trade',
        p_amount: source_amount,
        p_balance_type: 'withdrawable',
        p_description: `${trade_type.toUpperCase()}: Sold ${source_amount} ${source_asset}`,
        p_metadata: { 
          trade_type,
          source_asset, 
          target_asset, 
          market_pair,
          order_id,
          leg: 'debit'
        }
      }
    )

    if (debitError) {
      console.error('[execute-atomic-trade] Debit failed:', debitError)
      throw new Error(`Trade failed: ${debitError.message}`)
    }

    console.log('[execute-atomic-trade] Source debit successful:', debitResult)

    // ATOMIC TRANSACTION: Credit target asset
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: creditKey,
        p_tx_type: 'credit',
        p_tx_subtype: trade_type === 'swap' ? 'swap' : 'trade',
        p_amount: target_amount,
        p_balance_type: 'withdrawable',
        p_description: `${trade_type.toUpperCase()}: Bought ${target_amount} ${target_asset}`,
        p_metadata: { 
          trade_type,
          source_asset, 
          target_asset, 
          market_pair,
          order_id,
          leg: 'credit'
        }
      }
    )

    if (creditError) {
      console.error('[execute-atomic-trade] Credit failed:', creditError)
      // Debit already went through, this is a critical error
      throw new Error(`Trade partially failed: ${creditError.message}. Please contact support with order ID: ${order_id}`)
    }

    console.log('[execute-atomic-trade] Target credit successful:', creditResult)

    // Record trade in orders table
    await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        market_pair: market_pair || `${source_asset}/${target_asset}`,
        order_type: trade_type,
        source_asset,
        target_asset,
        source_amount,
        target_amount,
        status: 'completed',
        order_id,
        executed_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        trade: {
          user_id: user.id,
          trade_type,
          source: { asset: source_asset, amount: source_amount },
          target: { asset: target_asset, amount: target_amount },
          market_pair,
          order_id,
          executed_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[execute-atomic-trade] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
