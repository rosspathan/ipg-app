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
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the seed commit
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

    // Check if expired
    if (new Date(commit.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Commit has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get active wheel segments
    const { data: segments, error: segmentsError } = await supabase
      .from('spin_wheel_segments')
      .select('*')
      .eq('is_active', true)
      .order('id')

    if (segmentsError || !segments || segments.length === 0) {
      return new Response(JSON.stringify({ error: 'No active segments found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate result hash using server seed + client seed + nonce
    const resultHash = createHash('sha256')
      .update(`${commit.server_seed}:${client_seed}:${commit.nonce}`)
      .digest('hex')
    
    // Calculate random number (0-1)
    const randomNumber = hexToDecimal(resultHash)
    
    // Determine winning segment based on weights
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)
    const randomPick = Math.floor(randomNumber * totalWeight)
    
    let currentWeight = 0
    let winningSegment = segments[0] // fallback
    let winningIndex = 0
    
    for (let i = 0; i < segments.length; i++) {
      currentWeight += segments[i].weight
      if (randomPick < currentWeight) {
        winningSegment = segments[i]
        winningIndex = i
        break
      }
    }

    // Calculate payout
    let payoutAmount = 0
    if (winningSegment.payout_type === 'random') {
      payoutAmount = winningSegment.min_payout + (randomNumber * (winningSegment.max_payout - winningSegment.min_payout))
    } else {
      payoutAmount = winningSegment.min_payout
    }

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction')
    if (transactionError) {
      console.error('Failed to begin transaction:', transactionError)
      return new Response(JSON.stringify({ error: 'Transaction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    try {
      // Update commit status
      const { error: updateCommitError } = await supabase
        .from('spin_seed_commits')
        .update({
          client_seed,
          status: 'revealed',
          updated_at: new Date().toISOString()
        })
        .eq('id', commit_id)

      if (updateCommitError) {
        throw new Error(`Failed to update commit: ${updateCommitError.message}`)
      }

      // Create provably fair spin record
      const { error: spinRecordError } = await supabase
        .from('provably_fair_spins')
        .insert({
          user_id: user.id,
          server_seed: commit.server_seed,
          server_seed_hash: commit.server_seed_hash,
          client_seed,
          nonce: commit.nonce,
          bet_amount_usdt: commit.bet_amount,
          is_free_spin: commit.is_free_spin,
          fee_amount_usdt: commit.fee_amount,
          result_hash: resultHash,
          random_number: randomNumber,
          winning_segment_index: winningIndex,
          winning_segment_label: winningSegment.label,
          payout_amount: payoutAmount,
          payout_token: winningSegment.payout_token,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
          user_agent: req.headers.get('user-agent')
        })

      if (spinRecordError) {
        throw new Error(`Failed to create spin record: ${spinRecordError.message}`)
      }

      // Update user free spins if applicable
      if (commit.is_free_spin) {
        const { error: freeSpinsError } = await supabase
          .from('user_free_spins')
          .update({
            free_spins_used: commit.is_free_spin ? (commit.free_spins_used || 0) + 1 : (commit.free_spins_used || 0),
            free_spins_remaining: Math.max(0, (commit.free_spins_remaining || 0) - 1),
            last_spin_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (freeSpinsError) {
          throw new Error(`Failed to update free spins: ${freeSpinsError.message}`)
        }
      }

      // Update user balance
      const balanceChange = payoutAmount - (commit.is_free_spin ? 0 : commit.fee_amount)
      
      if (balanceChange !== 0) {
        const { error: balanceError } = await supabase
          .from('user_bonus_balances')
          .upsert({
            user_id: user.id,
            bsk_available: supabase.sql`bsk_available + ${balanceChange}`,
            last_spin_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (balanceError) {
          throw new Error(`Failed to update balance: ${balanceError.message}`)
        }

        // Create ledger entry
        const { error: ledgerError } = await supabase
          .from('bonus_ledger')
          .insert({
            user_id: user.id,
            amount_bsk: balanceChange,
            type: balanceChange > 0 ? 'spin_win' : 'spin_loss',
            asset: 'BSK',
            meta_json: {
              spin_id: commit_id,
              segment: winningSegment.label,
              is_free_spin: commit.is_free_spin,
              fee_amount: commit.fee_amount
            }
          })

        if (ledgerError) {
          console.error('Failed to create ledger entry:', ledgerError)
          // Don't fail the whole transaction for ledger entry
        }
      }

      // Commit transaction
      const { error: commitTransactionError } = await supabase.rpc('commit_transaction')
      if (commitTransactionError) {
        throw new Error(`Failed to commit transaction: ${commitTransactionError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        result: {
          winning_segment: winningSegment,
          winning_segment_index: winningIndex,
          payout_amount: payoutAmount,
          payout_token: winningSegment.payout_token,
          balance_delta: balanceChange,
          server_seed: commit.server_seed,
          client_seed,
          nonce: commit.nonce,
          result_hash: resultHash,
          random_number: randomNumber,
          is_free_spin: commit.is_free_spin,
          fee_amount: commit.fee_amount,
          calculation_steps: [
            `1. Combine: "${commit.server_seed}:${client_seed}:${commit.nonce}"`,
            `2. SHA-256 hash: ${resultHash}`,
            `3. Take first 8 hex chars: ${resultHash.slice(0, 8)}`,
            `4. Convert to decimal: ${parseInt(resultHash.slice(0, 8), 16)}`,
            `5. Normalize (0-1): ${randomNumber}`,
            `6. Scale to total weight (${totalWeight}): ${randomPick}`,
            `7. Selected segment: ${winningSegment.label} (index: ${winningIndex})`
          ]
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Transaction error:', error)
      // Rollback transaction
      await supabase.rpc('rollback_transaction')
      
      return new Response(JSON.stringify({ error: error.message || 'Spin failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Provably fair reveal error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})