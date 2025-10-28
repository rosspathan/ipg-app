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

    // 2. Get referral tree for the earner (get all levels)
    let { data: referralTreeRows, error: treeError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level, path')
      .eq('user_id', earnerId)
      .order('level', { ascending: true })

    // If no tree found or tree is incomplete, try to build it automatically
    if (treeError || !referralTreeRows || referralTreeRows.length === 0) {
      console.log('No referral tree found for earner, attempting to build...')
      
      // Check if user has a locked sponsor
      const { data: referralLink } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, locked_at')
        .eq('user_id', earnerId)
        .maybeSingle()

      if (referralLink?.sponsor_id && referralLink?.locked_at) {
        // Try to build the tree
        console.log('Building referral tree for earner...')
        const buildResponse = await supabase.functions.invoke('build-referral-tree', {
          body: { user_id: earnerId }
        })

        if (buildResponse.error) {
          console.error('Failed to auto-build tree:', buildResponse.error)
        } else {
          console.log('Tree built successfully, fetching again...')
          // Fetch the newly built tree
          const { data: newTree } = await supabase
            .from('referral_tree')
            .select('ancestor_id, level, path')
            .eq('user_id', earnerId)
            .order('level', { ascending: true })
          
          referralTreeRows = newTree
        }
      }
    }

    if (!referralTreeRows || referralTreeRows.length === 0) {
      console.log('No sponsors found in referral tree after build attempt')
      return new Response(
        JSON.stringify({ 
          success: true, 
          reason: 'No sponsors found',
          commissions_distributed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${referralTreeRows.length} levels in referral tree`)

    // 3. Build upline path from tree rows
    const uplinePath = referralTreeRows.map(row => row.ancestor_id)
    const maxLevels = Math.min(uplinePath.length, settings.max_levels || 50)

    console.log('Upline path:', uplinePath.slice(0, maxLevels))

    // 4. Calculate and distribute commissions level by level
    const commissions = []
    let totalDistributed = 0

    for (let level = 0; level < maxLevels; level++) {
      const sponsorId = uplinePath[level]
      const levelNumber = level + 1

      // Get sponsor's current badge and unlock levels
      const { data: sponsorBadgeData } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', sponsorId)
        .order('purchased_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sponsorBadge = sponsorBadgeData?.current_badge || 'None'

      // Get unlock levels for sponsor's badge
      const { data: badgeThreshold } = await supabase
        .from('badge_thresholds')
        .select('unlock_levels')
        .eq('badge_name', sponsorBadge)
        .maybeSingle()

      const unlockedLevels = badgeThreshold?.unlock_levels || 1

      // Check if sponsor's badge unlocks this level
      if (levelNumber > unlockedLevels) {
        console.log(`Level ${levelNumber} commission skipped for sponsor ${sponsorId}: requires badge with ${levelNumber}+ unlock levels (current: ${sponsorBadge} with ${unlockedLevels} levels)`)
        continue
      }

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
      const { data: existingBalance } = await supabase
        .from('user_bsk_balances')
        .select('holding_balance, total_earned_holding')
        .eq('user_id', sponsorId)
        .maybeSingle()

      if (existingBalance) {
        // Update existing balance
        const { error: updateError } = await supabase
          .from('user_bsk_balances')
          .update({
            holding_balance: Number(existingBalance.holding_balance) + commissionAmount,
            total_earned_holding: Number(existingBalance.total_earned_holding) + commissionAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', sponsorId)

        if (updateError) {
          console.error(`Error updating balance for sponsor ${sponsorId}:`, updateError)
          continue
        }
      } else {
        // Create new balance record
        const { error: insertError } = await supabase
          .from('user_bsk_balances')
          .insert({
            user_id: sponsorId,
            holding_balance: commissionAmount,
            total_earned_holding: commissionAmount,
            withdrawable_balance: 0,
            total_earned_withdrawable: 0
          })

        if (insertError) {
          console.error(`Error creating balance for sponsor ${sponsorId}:`, insertError)
          continue
        }
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
