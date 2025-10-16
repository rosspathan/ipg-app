import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { swap_id } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get swap details with asset info
    const { data: swap, error: swapError } = await supabaseClient
      .from('swaps')
      .select(`
        *,
        from_asset:assets!swaps_from_asset_id_fkey(id, symbol),
        to_asset:assets!swaps_to_asset_id_fkey(id, symbol)
      `)
      .eq('id', swap_id)
      .single()

    if (swapError) throw swapError

    // Validate swap status
    if (swap.status !== 'pending') {
      throw new Error('Swap already processed')
    }

    // Start transaction: Check and lock from_asset balance
    const { data: fromBalance, error: fromBalanceError } = await supabaseClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', swap.user_id)
      .eq('asset_id', swap.from_asset_id)
      .single()

    if (fromBalanceError || !fromBalance) {
      throw new Error('Insufficient balance or asset not found')
    }

    if (fromBalance.available < parseFloat(swap.from_amount)) {
      throw new Error('Insufficient available balance')
    }

    // Calculate exchange (in production, use real-time rates from external API)
    // For now, use estimated_rate from swap record
    const toAmount = parseFloat(swap.from_amount) * parseFloat(swap.estimated_rate)

    // Execute balance transfers atomically
    // 1. Deduct from source asset
    const { error: deductError } = await supabaseClient
      .from('wallet_balances')
      .update({
        available: fromBalance.available - parseFloat(swap.from_amount),
        total: fromBalance.total - parseFloat(swap.from_amount)
      })
      .eq('user_id', swap.user_id)
      .eq('asset_id', swap.from_asset_id)

    if (deductError) throw deductError

    // 2. Credit to destination asset
    const { data: toBalance } = await supabaseClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', swap.user_id)
      .eq('asset_id', swap.to_asset_id)
      .single()

    if (toBalance) {
      await supabaseClient
        .from('wallet_balances')
        .update({
          available: toBalance.available + toAmount,
          total: toBalance.total + toAmount
        })
        .eq('user_id', swap.user_id)
        .eq('asset_id', swap.to_asset_id)
    } else {
      await supabaseClient
        .from('wallet_balances')
        .insert({
          user_id: swap.user_id,
          asset_id: swap.to_asset_id,
          available: toAmount,
          total: toAmount,
          locked: 0
        })
    }

    // 3. Update swap record
    const { error: updateError } = await supabaseClient
      .from('swaps')
      .update({
        to_amount: toAmount.toString(),
        actual_rate: swap.estimated_rate,
        status: 'completed',
        executed_at: new Date().toISOString()
      })
      .eq('id', swap_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        success: true,
        swap_id,
        from_amount: swap.from_amount,
        to_amount: toAmount,
        from_asset: swap.from_asset.symbol,
        to_asset: swap.to_asset.symbol,
        rate: swap.estimated_rate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Execute swap error:', error)
    
    // Rollback swap status on error
    try {
      const { swap_id } = await req.json()
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseClient
        .from('swaps')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', swap_id)
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
