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

    // Get user BSK balance
    const { data: bskBalance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single()

    if (balanceError || !bskBalance) {
      throw new Error('Failed to fetch BSK balance')
    }

    if (bskBalance.withdrawable_balance < totalCost) {
      throw new Error('Insufficient BSK balance')
    }

    // Deduct bet + fee from balance
    const { error: deductError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: bskBalance.withdrawable_balance - totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (deductError) {
      throw new Error('Failed to deduct BSK')
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

    // Get nonce
    const nonce = limits.total_spins + 1

    console.log(`[spin-commit] Committed: hash=${serverSeedHashHex.substring(0, 16)}...`)

    return new Response(
      JSON.stringify({
        success: true,
        serverSeedHash: serverSeedHashHex,
        clientSeed,
        nonce,
        betBsk,
        spinFee,
        isFree,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[spin-commit] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
