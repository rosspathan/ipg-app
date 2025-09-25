import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.64.4'
import { createHash } from 'https://deno.land/std@0.190.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommitRequest {
  bet_amount: number
  bet_token?: string
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

    // Get authenticated user
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

    const { bet_amount, bet_token = 'USDT' }: CommitRequest = await req.json()

    // Get wheel configuration
    const { data: config, error: configError } = await supabase
      .from('spin_wheel_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Spin wheel not available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate bet range
    if (bet_amount < config.min_bet_usdt || bet_amount > config.max_bet_usdt) {
      return new Response(JSON.stringify({ 
        error: `Bet must be between $${config.min_bet_usdt} and $${config.max_bet_usdt}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get or create user free spins record
    const { data: freeSpins, error: freeSpinsError } = await supabase
      .from('user_free_spins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (freeSpinsError) {
      return new Response(JSON.stringify({ error: 'Failed to check free spins' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize free spins record if not exists
    let userFreeSpins = freeSpins
    if (!userFreeSpins) {
      const { data: newRecord, error: insertError } = await supabase
        .from('user_free_spins')
        .insert({
          user_id: user.id,
          free_spins_used: 0,
          free_spins_remaining: config.free_spins_per_user
        })
        .select()
        .single()

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Failed to initialize free spins' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      userFreeSpins = newRecord
    }

    // Determine if this is a free spin
    const is_free_spin = userFreeSpins.free_spins_remaining > 0
    const fee_amount = is_free_spin ? 0 : bet_amount * (config.fee_percentage / 100)

    // Check user balance if fee is required
    if (fee_amount > 0) {
      const { data: balance, error: balanceError } = await supabase
        .from('user_bonus_balances')
        .select('bsk_available')
        .eq('user_id', user.id)
        .single()

      if (balanceError || !balance || balance.bsk_available < fee_amount) {
        return new Response(JSON.stringify({ error: 'Insufficient balance for spin fee' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Generate server seed (64 characters hex)
    const serverSeed = Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')

    // Create SHA-256 hash of server seed
    const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex')

    // Store seed commit
    const { data: commit, error: commitError } = await supabase
      .from('spin_seed_commits')
      .insert({
        user_id: user.id,
        server_seed_hash: serverSeedHash,
        server_seed: serverSeed, // We store it immediately, will be revealed after client seed
        bet_amount,
        bet_token,
        is_free_spin,
        fee_amount,
        nonce: 0,
        status: 'committed'
      })
      .select()
      .single()

    if (commitError) {
      return new Response(JSON.stringify({ error: 'Failed to create seed commit' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      commit_id: commit.id,
      server_seed_hash: serverSeedHash,
      bet_amount,
      bet_token,
      is_free_spin,
      fee_amount,
      free_spins_remaining: userFreeSpins.free_spins_remaining,
      expires_at: commit.expires_at
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