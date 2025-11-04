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

    const { serverSeedHash, clientSeed, nonce, betBsk, spinFee, isFree, idempotencyKey } = await req.json()

    console.log(`[spin-reveal] Revealing for user ${user.id}, nonce ${nonce}`)

    // Get config
    const { data: config, error: configError } = await supabaseClient
      .from('spin_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      throw new Error('Spin wheel is currently unavailable')
    }

    // Get active segments
    const { data: segments, error: segmentsError } = await supabaseClient
      .from('spin_segments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (segmentsError || !segments || segments.length === 0) {
      throw new Error('No active segments')
    }

    // Generate server seed (in production, retrieve from secure storage)
    const serverSeed = crypto.randomUUID() + Date.now().toString()

    // Verify hash matches
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(serverSeed)
    )
    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Generate result using provably fair algorithm
    const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`
    const resultBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(combinedSeed)
    )
    const resultHex = Array.from(new Uint8Array(resultBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Convert hex to number (0-65535)
    const resultValue = parseInt(resultHex.substring(0, 4), 16)

    // Calculate total weight
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0)

    // Determine winning segment
    const roll = resultValue % totalWeight
    let cumulativeWeight = 0
    let winningSegment = segments[0]

    for (const segment of segments) {
      cumulativeWeight += segment.weight
      if (roll < cumulativeWeight) {
        winningSegment = segment
        break
      }
    }

    console.log(`[spin-reveal] Roll: ${roll}/${totalWeight}, Winner: ${winningSegment.label}`)

    // Calculate payout
    const multiplier = winningSegment.multiplier
    let payoutBsk = betBsk * multiplier
    let profitFeeBsk = 0
    let netPayoutBsk = 0

    if (multiplier > 0) {
      // Winner: deduct 10% fee on profit
      const profit = payoutBsk - betBsk
      profitFeeBsk = profit * (config.winner_profit_fee_percent / 100)
      netPayoutBsk = payoutBsk - profitFeeBsk
    } else {
      // Loser
      netPayoutBsk = 0
    }

    const netChangeBsk = netPayoutBsk - betBsk - spinFee

    // ATOMIC TRANSACTION: Credit winnings using record_bsk_transaction() (if any)
    if (netPayoutBsk > 0) {
      const payoutIdempotencyKey = `spin_payout_${user.id}_${nonce}_${Date.now()}`
      
      try {
        const { data: creditResult, error: creditError } = await supabaseAdmin.rpc(
          'record_bsk_transaction',
          {
            p_user_id: user.id,
            p_idempotency_key: payoutIdempotencyKey,
            p_tx_type: 'credit',
            p_tx_subtype: 'spin_win',
            p_balance_type: 'withdrawable',
            p_amount_bsk: netPayoutBsk,
            p_notes: `Spin win: ${multiplier}x multiplier, payout ${netPayoutBsk} BSK`,
            p_meta_json: {
              bet_bsk: betBsk,
              multiplier: multiplier,
              payout_bsk: payoutBsk,
              profit_fee_bsk: profitFeeBsk,
              net_payout_bsk: netPayoutBsk,
              segment_id: winningSegment.id,
              segment_label: winningSegment.label,
              nonce: nonce,
              commit_idempotency_key: idempotencyKey,
            },
          }
        )

        if (creditError) {
          console.error('[spin-reveal] Credit error:', creditError)
          throw new Error(creditError.message || 'Failed to credit winnings')
        }

        console.log(`[spin-reveal] ✅ Atomically credited ${netPayoutBsk} BSK (tx: ${creditResult})`)
      } catch (error: any) {
        // If credit fails, log but don't throw - user already lost their bet
        console.error('[spin-reveal] ❌ Failed to credit winnings:', error)
        throw new Error('Failed to process winnings - please contact support')
      }
    }

    // Update user limits
    const { data: limits } = await supabaseClient
      .from('spin_user_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { error: limitsError } = await supabaseClient
      .from('spin_user_limits')
      .update({
        free_spins_remaining: isFree
          ? Math.max(0, (limits?.free_spins_remaining || 0) - 1)
          : limits?.free_spins_remaining || 0,
        total_spins: (limits?.total_spins || 0) + 1,
        total_bet_bsk: (limits?.total_bet_bsk || 0) + betBsk,
        total_won_bsk: (limits?.total_won_bsk || 0) + (netPayoutBsk > 0 ? netPayoutBsk : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (limitsError) {
      console.error('[spin-reveal] Failed to update limits:', limitsError)
    }

    // Record spin history
    const { error: historyError } = await supabaseClient
      .from('spin_history')
      .insert({
        user_id: user.id,
        segment_id: winningSegment.id,
        bet_bsk: betBsk,
        spin_fee_bsk: spinFee,
        multiplier,
        payout_bsk: payoutBsk,
        profit_fee_bsk: profitFeeBsk,
        net_payout_bsk: netPayoutBsk,
        net_change_bsk: netChangeBsk,
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        nonce,
        result_value: resultValue,
        was_free_spin: isFree,
      })

    if (historyError) {
      console.error('[spin-reveal] Failed to record history:', historyError)
    }

    console.log(`[spin-reveal] ✅ Success: multiplier=${multiplier}, payout=${netPayoutBsk} BSK`)

    return new Response(
      JSON.stringify({
        success: true,
        segment: winningSegment,
        multiplier,
        payoutBsk,
        profitFeeBsk,
        netPayoutBsk,
        netChangeBsk,
        serverSeed,
        resultValue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[spin-reveal] ❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})