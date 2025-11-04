import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create service role client for atomic operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create user client for auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { betBsk } = await req.json()

    console.log(`[spin-commit] User ${user.id} betting ${betBsk} BSK`)

    // Validate bet amount
    if (!betBsk || betBsk <= 0) {
      throw new Error('Invalid bet amount')
    }

    // Get spin config
    const { data: config, error: configError } = await supabaseClient
      .from('spin_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      throw new Error('Spin wheel is currently unavailable')
    }

    if (betBsk < config.min_bet_bsk || betBsk > config.max_bet_bsk) {
      throw new Error(`Bet must be between ${config.min_bet_bsk} and ${config.max_bet_bsk} BSK`)
    }

    // Get or create user limits
    let { data: limits, error: limitsError } = await supabaseClient
      .from('spin_user_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (limitsError && limitsError.code === 'PGRST116') {
      // User limits don't exist, create them
      const { data: newLimits, error: insertError } = await supabaseClient
        .from('spin_user_limits')
        .insert({
          user_id: user.id,
          free_spins_remaining: config.free_spins_per_user,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error('Failed to create user limits')
      }
      limits = newLimits
    } else if (limitsError) {
      throw new Error('Failed to fetch user limits')
    }

    // Check if this is a free spin
    const isFree = limits.free_spins_remaining > 0
    const spinFee = isFree ? 0 : config.post_free_spin_fee_bsk
    const totalCost = betBsk + spinFee

    // Generate idempotency key for this spin commit
    const nonce = limits.total_spins + 1
    const idempotencyKey = `spin_commit_${user.id}_${nonce}_${Date.now()}`

    console.log(`[spin-commit] Idempotency key: ${idempotencyKey}`)

    // ATOMIC TRANSACTION: Deduct bet using record_bsk_transaction()
    try {
      const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
        'record_bsk_transaction',
        {
          p_user_id: user.id,
          p_idempotency_key: idempotencyKey,
          p_tx_type: 'debit',
          p_tx_subtype: 'spin_bet',
          p_balance_type: 'withdrawable',
          p_amount_bsk: totalCost,
          p_notes: `Spin bet: ${betBsk} BSK + ${spinFee} BSK fee`,
          p_meta_json: {
            bet_bsk: betBsk,
            spin_fee_bsk: spinFee,
            is_free: isFree,
            nonce: nonce,
            config_id: config.id,
          },
        }
      )

      if (deductError) {
        console.error('[spin-commit] Deduction error:', deductError)
        throw new Error(deductError.message || 'Failed to deduct BSK - insufficient balance or duplicate transaction')
      }

      if (!deductResult) {
        throw new Error('Failed to deduct BSK')
      }

      console.log(`[spin-commit] ✅ Atomically deducted ${totalCost} BSK (tx: ${deductResult})`)
    } catch (error: any) {
      // Check if it's an insufficient balance error
      if (error.message?.includes('Insufficient balance')) {
        throw new Error('Insufficient BSK balance')
      }
      // Check if it's an idempotency error (already processed)
      if (error.message?.includes('duplicate key') || error.message?.includes('idempotency')) {
        throw new Error('This spin has already been committed')
      }
      throw error
    }

    // Generate server seed and hash
    const serverSeed = crypto.randomUUID() + Date.now().toString()
    const serverSeedHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(serverSeed)
    )
    const serverSeedHashHex = Array.from(new Uint8Array(serverSeedHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Generate client seed
    const clientSeed = crypto.randomUUID()

    console.log(`[spin-commit] ✅ Committed: hash=${serverSeedHashHex.substring(0, 16)}...`)

    return new Response(
      JSON.stringify({
        success: true,
        serverSeedHash: serverSeedHashHex,
        clientSeed,
        nonce,
        betBsk,
        spinFee,
        isFree,
        idempotencyKey, // Return for client tracking
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[spin-commit] ❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})