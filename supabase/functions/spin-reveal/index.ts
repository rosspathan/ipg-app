import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.64.4'
import { createHash } from 'https://deno.land/std@0.190.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevealRequest {
  commit_id: string
  client_seed: string
}

// Convert hex string to decimal for calculation
function hexToDecimal(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) / 0xffffffff
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

    const { commit_id, client_seed }: RevealRequest = await req.json()

    if (!commit_id || !client_seed) {
      return new Response(JSON.stringify({ error: 'Missing commit_id or client_seed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get seed commit
    const { data: commit, error: commitError } = await supabase
      .from('spin_seed_commits')
      .select('*')
      .eq('id', commit_id)
      .eq('user_id', user.id)
      .eq('status', 'committed')
      .single()

    if (commitError || !commit) {
      return new Response(JSON.stringify({ error: 'Invalid or expired commit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if commit has expired
    if (new Date(commit.expires_at) < new Date()) {
      await supabase
        .from('spin_seed_commits')
        .update({ status: 'expired' })
        .eq('id', commit_id)

      return new Response(JSON.stringify({ error: 'Seed commit has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get wheel segments
    const { data: segments, error: segmentsError } = await supabase
      .from('spin_wheel_segments')
      .select('*')
      .eq('is_active', true)
      .order('id')

    if (segmentsError || !segments || segments.length === 0) {
      return new Response(JSON.stringify({ error: 'No active wheel segments' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate total weight
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)

    // Generate provably fair result
    const nonce = 0 // Could increment for multiple spins with same seeds
    const resultHash = createHash('sha256')
      .update(`${commit.server_seed}:${client_seed}:${nonce}`)
      .digest('hex')
    
    const random_number = hexToDecimal(resultHash)
    
    // Find winning segment based on weights
    let weightSum = 0
    let winningSegment = segments[0] // fallback
    
    for (const segment of segments) {
      weightSum += segment.weight
      if (random_number < (weightSum / totalWeight)) {
        winningSegment = segment
        break
      }
    }

    // Calculate payout
    let payout_amount = 0
    if (winningSegment.min_payout === winningSegment.max_payout) {
      payout_amount = winningSegment.min_payout
    } else {
      // Random between min and max (could use another hash for this)
      const payoutRange = winningSegment.max_payout - winningSegment.min_payout
      payout_amount = winningSegment.min_payout + (payoutRange * random_number)
    }

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction')

    try {
      // Update seed commit status and add client seed
      const { error: updateCommitError } = await supabase
        .from('spin_seed_commits')
        .update({ 
          status: 'revealed',
          client_seed,
          nonce 
        })
        .eq('id', commit_id)

      if (updateCommitError) throw updateCommitError

      // Create spin result record
      const { error: resultError } = await supabase
        .from('provably_fair_spins')
        .insert({
          user_id: user.id,
          seed_commit_id: commit_id,
          server_seed: commit.server_seed,
          client_seed,
          nonce,
          bet_amount: commit.bet_amount,
          bet_token: commit.bet_token,
          is_free_spin: commit.is_free_spin,
          fee_amount: commit.fee_amount,
          winning_segment_id: winningSegment.id,
          winning_segment_label: winningSegment.label,
          payout_amount,
          payout_token: winningSegment.payout_token,
          random_number,
          result_hash: resultHash
        })

      if (resultError) throw resultError

      // Update user free spins if this was a free spin
      if (commit.is_free_spin) {
        const { error: freeSpinError } = await supabase
          .from('user_free_spins')
          .update({
            free_spins_used: supabase.rpc('increment_safe', { current: 'free_spins_used' }),
            free_spins_remaining: supabase.rpc('decrement_safe', { current: 'free_spins_remaining' }),
            last_spin_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (freeSpinError) throw freeSpinError
      }

      // Update user balance (deduct fee, add payout)
      let balance_delta = payout_amount - commit.fee_amount
      
      if (balance_delta !== 0) {
        const { data: currentBalance, error: balanceError } = await supabase
          .from('user_bonus_balances')
          .select('bsk_available')
          .eq('user_id', user.id)
          .single()

        if (balanceError) throw balanceError

        const newBalance = Math.max(0, currentBalance.bsk_available + balance_delta)

        const { error: updateBalanceError } = await supabase
          .from('user_bonus_balances')
          .update({ bsk_available: newBalance })
          .eq('user_id', user.id)

        if (updateBalanceError) throw updateBalanceError

        // Create ledger entry
        const { error: ledgerError } = await supabase
          .from('bonus_ledger')
          .insert({
            user_id: user.id,
            type: 'spin_result',
            amount_bsk: balance_delta,
            asset: 'BSK',
            meta_json: {
              commit_id,
              winning_segment: winningSegment.label,
              server_seed: commit.server_seed,
              client_seed,
              nonce,
              result_hash: resultHash,
              random_number,
              is_free_spin: commit.is_free_spin,
              fee_amount: commit.fee_amount,
              payout_amount
            }
          })

        if (ledgerError) throw ledgerError
      }

      // Commit transaction
      const { error: commitTransactionError } = await supabase.rpc('commit_transaction')
      if (commitTransactionError) throw commitTransactionError

      // Get updated free spins info
      const { data: updatedFreeSpins } = await supabase
        .from('user_free_spins')
        .select('free_spins_remaining')
        .eq('user_id', user.id)
        .single()

      return new Response(JSON.stringify({
        success: true,
        result: {
          winning_segment_id: winningSegment.id,
          winning_segment_label: winningSegment.label,
          payout_amount,
          payout_token: winningSegment.payout_token,
          balance_delta,
          random_number,
          server_seed: commit.server_seed,
          client_seed,
          nonce,
          result_hash: resultHash,
          is_free_spin: commit.is_free_spin,
          fee_amount: commit.fee_amount,
          free_spins_remaining: updatedFreeSpins?.free_spins_remaining || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      // Rollback transaction on error
      await supabase.rpc('rollback_transaction')
      throw error
    }

  } catch (error) {
    console.error('Spin reveal error:', error)
    return new Response(JSON.stringify({ error: 'Failed to reveal spin result' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})