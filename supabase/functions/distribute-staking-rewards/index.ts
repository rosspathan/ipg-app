import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Starting daily staking rewards distribution...')

    // 1. Get all active staking pools
    const { data: pools, error: poolsError } = await supabase
      .from('staking_pools')
      .select('*')
      .eq('is_active', true)

    if (poolsError) {
      console.error('Error fetching staking pools:', poolsError)
      throw poolsError
    }

    if (!pools || pools.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active staking pools found',
          rewards_distributed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalRewardsDistributed = 0
    let totalStakesProcessed = 0
    const results = []

    // 2. Process each pool
    for (const pool of pools) {
      console.log(`Processing pool: ${pool.name} (${pool.id})`)

      // Get all active stakes for this pool
      const { data: stakes, error: stakesError } = await supabase
        .from('user_staking_submissions')
        .select('*')
        .eq('pool_id', pool.id)
        .eq('status', 'active')

      if (stakesError) {
        console.error(`Error fetching stakes for pool ${pool.id}:`, stakesError)
        continue
      }

      if (!stakes || stakes.length === 0) {
        console.log(`No active stakes in pool ${pool.id}`)
        continue
      }

      // Calculate daily reward rate from APY
      const dailyRate = pool.apy / 365 / 100

      // 3. Process each stake
      for (const stake of stakes) {
        const stakeDays = Math.floor(
          (Date.now() - new Date(stake.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Calculate daily reward
        const dailyReward = stake.amount * dailyRate

        // Check if lock period has expired
        const lockExpired = stakeDays >= pool.lock_period_days

        // Credit daily reward to holding balance
        const { error: rewardError } = await supabase
          .from('user_bsk_balances')
          .upsert({
            user_id: stake.user_id,
            holding_balance: supabase.rpc('increment', { x: dailyReward }),
            total_earned_holding: supabase.rpc('increment', { x: dailyReward })
          }, { onConflict: 'user_id' })

        if (rewardError) {
          console.error(`Error crediting reward to user ${stake.user_id}:`, rewardError)
          continue
        }

        // Update stake accumulated rewards
        const { error: updateError } = await supabase
          .from('user_staking_submissions')
          .update({
            accumulated_rewards: (stake.accumulated_rewards || 0) + dailyReward,
            last_reward_at: new Date().toISOString()
          })
          .eq('id', stake.id)

        if (updateError) {
          console.error(`Error updating stake ${stake.id}:`, updateError)
          continue
        }

        // Create bonus ledger entry
        await supabase
          .from('bonus_ledger')
          .insert({
            user_id: stake.user_id,
            type: 'staking_reward',
            amount_bsk: dailyReward,
            meta_json: {
              pool_id: pool.id,
              pool_name: pool.name,
              stake_id: stake.id,
              stake_amount: stake.amount,
              apy: pool.apy,
              stake_days: stakeDays,
              lock_expired: lockExpired
            }
          })

        totalRewardsDistributed += dailyReward
        totalStakesProcessed++

        console.log(`Rewarded ${dailyReward} BSK to user ${stake.user_id} for stake ${stake.id}`)
      }

      results.push({
        pool_id: pool.id,
        pool_name: pool.name,
        stakes_processed: stakes.length,
        total_rewards: stakes.length * (pool.apy / 365 / 100)
      })
    }

    console.log('Staking rewards distribution completed:', {
      total_rewards: totalRewardsDistributed,
      stakes_processed: totalStakesProcessed
    })

    return new Response(
      JSON.stringify({
        success: true,
        total_rewards_distributed: totalRewardsDistributed,
        total_stakes_processed: totalStakesProcessed,
        pools_processed: results.length,
        results: results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error distributing staking rewards:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
