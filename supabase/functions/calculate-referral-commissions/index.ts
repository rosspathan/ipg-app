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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { earnerId, earningAmount, earningType, metadata } = await req.json()

    if (!earnerId || !earningAmount || earningAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calculating referral commissions:', { earnerId, earningAmount, earningType })

    // 1. Get team referral settings
    const { data: settings } = await supabase
      .from('team_referral_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!settings || !settings.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'Referral system is not active',
          commissions_distributed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get referral tree for the earner
    const { data: referralTree, error: treeError } = await supabase
      .from('referral_tree')
      .select('*')
      .eq('user_id', earnerId)
      .single()

    if (treeError || !referralTree || !referralTree.upline_path) {
      console.log('No referral tree found for user:', earnerId)
      return new Response(
        JSON.stringify({ 
          success: true, 
          reason: 'No sponsors found',
          commissions_distributed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse upline path (array of sponsor user IDs from direct to highest level)
    const uplinePath = referralTree.upline_path as string[]
    const maxLevels = Math.min(uplinePath.length, settings.max_levels || 50)

    console.log('Upline path:', uplinePath.slice(0, maxLevels))

    // 4. Calculate and distribute commissions level by level
    const commissions = []
    let totalDistributed = 0

    for (let level = 0; level < maxLevels; level++) {
      const sponsorId = uplinePath[level]
      const levelNumber = level + 1

      // Get commission rate for this level
      const commissionRate = settings.level_percentages?.[levelNumber] || 0

      if (commissionRate <= 0) {
        console.log(`No commission rate for level ${levelNumber}, skipping`)
        continue
      }

      const commissionAmount = (earningAmount * commissionRate) / 100

      if (commissionAmount <= 0) {
        continue
      }

      // Credit commission to sponsor's holding balance
      const { error: balanceError } = await supabase
        .from('user_bsk_balances')
        .upsert({
          user_id: sponsorId,
          holding_balance: supabase.rpc('increment', { x: commissionAmount }),
          total_earned_holding: supabase.rpc('increment', { x: commissionAmount })
        }, { onConflict: 'user_id' })

      if (balanceError) {
        console.error(`Error crediting sponsor ${sponsorId} at level ${levelNumber}:`, balanceError)
        continue
      }

      // Create referral ledger entry
      await supabase
        .from('referral_ledger')
        .insert({
          sponsor_id: sponsorId,
          referee_id: earnerId,
          level: levelNumber,
          commission_bsk: commissionAmount,
          earning_type: earningType || 'unknown',
          base_amount: earningAmount,
          commission_percent: commissionRate,
          metadata: metadata || {}
        })

      // Create bonus ledger entry
      await supabase
        .from('bonus_ledger')
        .insert({
          user_id: sponsorId,
          type: 'referral_commission',
          amount_bsk: commissionAmount,
          meta_json: {
            referee_id: earnerId,
            level: levelNumber,
            earning_type: earningType,
            base_amount: earningAmount,
            commission_rate: commissionRate
          }
        })

      commissions.push({
        sponsor_id: sponsorId,
        level: levelNumber,
        commission_bsk: commissionAmount,
        rate: commissionRate
      })

      totalDistributed += commissionAmount

      console.log(`Level ${levelNumber} commission: ${commissionAmount} BSK to sponsor ${sponsorId}`)
    }

    console.log('Commissions calculated successfully:', { total: totalDistributed, levels: commissions.length })

    return new Response(
      JSON.stringify({
        success: true,
        commissions_distributed: totalDistributed,
        levels_processed: commissions.length,
        commissions: commissions
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error calculating referral commissions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
