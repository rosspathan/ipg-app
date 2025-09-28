import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommitRequest {
  bet_inr: number
  client_seed: string
  idempotency_key?: string
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

    const { bet_inr, client_seed, idempotency_key }: CommitRequest = await req.json()

    // Validate inputs
    if (!bet_inr || bet_inr <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!client_seed || client_seed.length < 8) {
      return new Response(JSON.stringify({ error: 'Client seed must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get active spin configuration
    const { data: config, error: configError } = await supabase
      .from('ismart_spin_config')
      .select('*')
      .eq('is_enabled', true)
      .single()

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Spin wheel not available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate bet range
    if (bet_inr < config.min_bet_inr || bet_inr > config.max_bet_inr) {
      return new Response(JSON.stringify({ 
        error: `Bet must be between ₹${config.min_bet_inr} and ₹${config.max_bet_inr}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get or create user limits
    const { data: userLimits, error: limitsError } = await supabase
      .from('ismart_user_limits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let limits = userLimits
    if (!limits) {
      const { data: newLimits, error: insertError } = await supabase
        .from('ismart_user_limits')
        .insert({
          user_id: user.id,
          free_spins_remaining: config.free_spins_count
        })
        .select()
        .single()

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Failed to initialize user limits' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      limits = newLimits
    }

    // Check daily limits
    const today = new Date().toISOString().split('T')[0]
    if (limits.last_spin_date !== today) {
      // Reset daily counts
      await supabase
        .from('ismart_user_limits')
        .update({
          daily_spins_count: 0,
          last_spin_date: today
        })
        .eq('user_id', user.id)
      
      limits.daily_spins_count = 0
    }

    // Check spin caps
    if (config.daily_spin_cap_per_user && limits.daily_spins_count >= config.daily_spin_cap_per_user) {
      return new Response(JSON.stringify({ error: 'Daily spin limit reached' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (config.lifetime_spin_cap_per_user && limits.lifetime_spins_count >= config.lifetime_spin_cap_per_user) {
      return new Response(JSON.stringify({ error: 'Lifetime spin limit reached' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate costs
    const bet_bsk = bet_inr / config.bsk_inr_rate
    const is_free_spin = limits.free_spins_remaining > 0
    const fee_inr = is_free_spin ? 0 : config.post_free_fee_inr
    const fee_bsk = fee_inr / config.bsk_inr_rate

    // Check BSK balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single()

    if (balanceError || !balance || balance.withdrawable_balance < (bet_bsk + fee_bsk)) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient BSK balance',
        required: bet_bsk + fee_bsk,
        available: balance?.withdrawable_balance || 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get current RNG seed
    const { data: seedData, error: seedError } = await supabase
      .from('rng_seeds')
      .select('server_seed_hash')
      .eq('is_current', true)
      .single()

    if (seedError || !seedData) {
      return new Response(JSON.stringify({ error: 'RNG seed not available' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get nonce (count of user's previous spins)
    const { count: nonce } = await supabase
      .from('ismart_spins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const spinNonce = (nonce || 0) + 1

    return new Response(JSON.stringify({
      success: true,
      commit_data: {
        server_seed_hash: seedData.server_seed_hash,
        client_seed,
        nonce: spinNonce,
        bet_inr,
        bet_bsk,
        fee_inr,
        fee_bsk,
        is_free_spin,
        free_spins_remaining: limits.free_spins_remaining,
        config_snapshot: config,
        idempotency_key: idempotency_key || crypto.randomUUID()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Spin commit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})