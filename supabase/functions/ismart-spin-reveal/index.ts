import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevealRequest {
  server_seed_hash: string
  client_seed: string
  nonce: number
  bet_inr: number
  bet_bsk: number
  fee_inr: number
  fee_bsk: number
  is_free_spin: boolean
  config_snapshot: any
  idempotency_key: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const revealData: RevealRequest = await req.json()

    // Check for duplicate processing
    const { data: existingSpin, error: existingError } = await supabase
      .from('ismart_spins')
      .select('*')
      .eq('idempotency_key', revealData.idempotency_key)
      .maybeSingle()

    if (existingSpin) {
      return new Response(JSON.stringify({
        success: true,
        result: existingSpin,
        duplicate: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the current server seed
    const { data: seedData, error: seedError } = await supabase
      .from('rng_seeds')
      .select('*')
      .eq('server_seed_hash', revealData.server_seed_hash)
      .single()

    if (seedError || !seedData) {
      return new Response(JSON.stringify({ error: 'Invalid server seed hash' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get active segments
    const { data: segments, error: segmentsError } = await supabase
      .from('ismart_spin_segments')
      .select('*')
      .eq('config_id', revealData.config_snapshot.id)
      .eq('is_active', true)
      .order('position_order')

    if (segmentsError || !segments || segments.length === 0) {
      return new Response(JSON.stringify({ error: 'No active segments found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate result using provable fairness
    const segmentsJson = segments.map(s => ({
      id: s.id,
      label: s.label,
      multiplier: s.multiplier,
      weight: s.weight,
      color_hex: s.color_hex
    }))

    // Create hash for result calculation
    const combinedString = `${seedData.server_seed}:${revealData.client_seed}:${revealData.nonce}`
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combinedString))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Convert first 8 hex chars to decimal for random number
    const randomHex = hashHex.slice(0, 8)
    const randomDecimal = parseInt(randomHex, 16)
    const randomFloat = randomDecimal / 0xffffffff
    
    // Calculate winning segment based on weights
    const totalWeight = segmentsJson.reduce((sum: number, s: any) => sum + s.weight, 0)
    let threshold = 0
    let segmentIndex = 0
    
    for (let i = 0; i < segmentsJson.length; i++) {
      threshold += segmentsJson[i].weight / totalWeight
      if (randomFloat <= threshold) {
        segmentIndex = i
        break
      }
    }

    const winningSegment = segments[segmentIndex]
    const multiplier = winningSegment.multiplier
    const payout_bsk = revealData.bet_bsk * multiplier
    const payout_inr = payout_bsk * revealData.config_snapshot.bsk_inr_rate

    // Handle risk-free free spins
    const actualBetLoss = revealData.is_free_spin && revealData.config_snapshot.risk_free_free_spins && multiplier === 0 
      ? 0 : revealData.bet_bsk
    const actualFeeLoss = revealData.fee_bsk

    // Calculate net BSK change
    const net_bsk_change = payout_bsk - actualBetLoss - actualFeeLoss

    // Get current user limits
    const { data: limits, error: getLimitsError } = await supabase
      .from('ismart_user_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (getLimitsError || !limits) {
      return new Response(JSON.stringify({ error: 'User limits not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create spin record
    const { data: spinRecord, error: spinError } = await supabase
      .from('ismart_spins')
      .insert({
        user_id: user.id,
        config_snapshot: revealData.config_snapshot,
        client_seed: revealData.client_seed,
        server_seed_hash: revealData.server_seed_hash,
        nonce: revealData.nonce,
        segment_id: winningSegment.id,
        segment_label: winningSegment.label,
        multiplier: multiplier,
        bet_bsk: revealData.bet_bsk,
        bet_inr_snapshot: revealData.bet_inr,
        fee_bsk: actualFeeLoss,
        fee_inr_snapshot: revealData.fee_inr,
        payout_bsk: payout_bsk,
        payout_inr_snapshot: payout_inr,
        bsk_inr_rate_snapshot: revealData.config_snapshot.bsk_inr_rate,
        was_free_spin: revealData.is_free_spin,
        was_risk_free: revealData.is_free_spin && revealData.config_snapshot.risk_free_free_spins,
        verify_payload: {
          server_seed: seedData.server_seed,
          client_seed: revealData.client_seed,
          nonce: revealData.nonce,
          segments: segmentsJson,
          calculation_hash: hashHex
        },
        idempotency_key: revealData.idempotency_key,
        settled_at: new Date().toISOString()
      })
      .select()
      .single()

    if (spinError) {
      return new Response(JSON.stringify({ error: 'Failed to create spin record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user BSK balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single()

    if (balanceError) {
      return new Response(JSON.stringify({ error: 'Failed to get current balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newBalance = currentBalance.withdrawable_balance + net_bsk_change

    const { error: updateBalanceError } = await supabase
      .from('user_bsk_balances')
      .update({ withdrawable_balance: newBalance })
      .eq('user_id', user.id)

    if (updateBalanceError) {
      return new Response(JSON.stringify({ error: 'Failed to update balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user limits
    const { error: limitsError } = await supabase
      .from('ismart_user_limits')
      .update({
        free_spins_used: limits.free_spins_used + (revealData.is_free_spin ? 1 : 0),
        free_spins_remaining: limits.free_spins_remaining - (revealData.is_free_spin ? 1 : 0),
        daily_spins_count: limits.daily_spins_count + 1,
        lifetime_spins_count: limits.lifetime_spins_count + 1,
        last_spin_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (limitsError) {
      return new Response(JSON.stringify({ error: 'Failed to update limits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        spin_id: spinRecord.id,
        segment: winningSegment,
        multiplier,
        bet_bsk: revealData.bet_bsk,
        fee_bsk: actualFeeLoss,
        payout_bsk,
        net_change_bsk: net_bsk_change,
        new_balance_bsk: newBalance,
        was_free_spin: revealData.is_free_spin,
        was_risk_free: revealData.is_free_spin && revealData.config_snapshot.risk_free_free_spins && multiplier === 0,
        verify_data: spinRecord.verify_payload
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Spin reveal error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})