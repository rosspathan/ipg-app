import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { new_tier_id, payment_id } = await req.json()

    if (!new_tier_id || !payment_id) {
      throw new Error('Invalid request: new_tier_id and payment_id required')
    }

    console.log(`[upgrade-tier] User ${user.id} upgrading to tier ${new_tier_id}`)

    // Check if program is enabled
    const { data: programFlag } = await supabaseClient
      .from('program_flags')
      .select('enabled')
      .eq('program_code', 'team_referrals')
      .single()

    if (programFlag && !programFlag.enabled) {
      return new Response(
        JSON.stringify({ error: 'PROGRAM_DISABLED', message: 'Team referrals program is currently disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current highest tier
    const { data: currentHoldings } = await supabaseClient
      .from('user_badge_holdings')
      .select(`
        *,
        badge:badge_card_config(*)
      `)
      .eq('user_id', user.id)

    if (!currentHoldings || currentHoldings.length === 0) {
      throw new Error('No current tier found. Please purchase a tier first.')
    }

    // Find highest tier
    const currentTier = currentHoldings
      .map(h => h.badge)
      .filter(b => b)
      .sort((a: any, b: any) => b.tier_level - a.tier_level)[0]

    if (!currentTier) {
      throw new Error('No valid current tier')
    }

    // Get new tier details
    const { data: newTier, error: tierError } = await supabaseClient
      .from('badge_card_config')
      .select('*')
      .eq('id', new_tier_id)
      .single()

    if (tierError || !newTier) {
      throw new Error('Invalid new tier')
    }

    // Validate upgrade (must be higher tier)
    if (newTier.tier_level <= currentTier.tier_level) {
      throw new Error(`Cannot upgrade from ${currentTier.tier_name} (level ${currentTier.tier_level}) to ${newTier.tier_name} (level ${newTier.tier_level})`)
    }

    // Calculate upgrade difference
    const upgradeDiff = newTier.purchase_price - currentTier.purchase_price

    if (upgradeDiff <= 0) {
      throw new Error(`Invalid pricing: new tier price (${newTier.purchase_price}) must be higher than current tier (${currentTier.purchase_price})`)
    }

    console.log(`[upgrade-tier] Upgrade diff: ${upgradeDiff} BSK (${currentTier.tier_name} → ${newTier.tier_name})`)

    // Debit upgrade difference
    const idempotencyKey = `sub:upgrade:${user.id}:${currentTier.id}-${new_tier_id}:${payment_id}`
    
    const { data: debitResult, error: debitError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'subscription_upgrade',
        p_amount: upgradeDiff,
        p_balance_type: 'withdrawable',
        p_description: `Upgraded from ${currentTier.tier_name} to ${newTier.tier_name}`,
        p_metadata: { 
          from_tier_id: currentTier.id,
          from_tier_name: currentTier.tier_name,
          to_tier_id: new_tier_id, 
          to_tier_name: newTier.tier_name,
          upgrade_diff: upgradeDiff,
          payment_id 
        }
      }
    )

    if (debitError) {
      console.error('[upgrade-tier] Debit failed:', debitError)
      throw new Error(`Failed to process upgrade payment: ${debitError.message}`)
    }

    console.log('[upgrade-tier] Upgrade payment processed:', debitResult)

    // Assign new badge
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id: user.id,
        badge_id: new_tier_id,
        acquired_at: new Date().toISOString(),
        purchase_price_paid: upgradeDiff,
        upgraded_from: currentTier.id
      }, { onConflict: 'user_id,badge_id' })

    if (badgeError) {
      console.error('[upgrade-tier] Badge assignment failed:', badgeError)
    }

    // Process commission through centralized system
    let commissionResult = null
    try {
      const { data: commissionData, error: commissionError } = await supabaseClient.functions.invoke(
        'process-badge-subscription-commission',
        {
          body: {
            user_id: user.id,
            badge_name: newTier.tier_name,
            bsk_amount: upgradeDiff,
            previous_badge: currentTier.tier_name
          }
        }
      )

      if (commissionError) {
        console.error('[upgrade-tier] Commission processing error:', commissionError)
      } else {
        console.log('[upgrade-tier] Upgrade commission processed:', commissionData)
        commissionResult = commissionData
      }
    } catch (err) {
      console.error('[upgrade-tier] Exception processing upgrade commission:', err)
    }

    // Process multi-level commissions (L2-50) - non-blocking
    try {
      console.log('[upgrade-tier] Triggering multi-level commissions (L2-50)...')
      const { data: mlCommissionData, error: mlCommissionError } = await supabaseClient.functions.invoke(
        'process-multi-level-commissions',
        {
          body: {
            user_id: user.id,
            event_type: 'badge_upgrade',
            base_amount: upgradeDiff
          }
        }
      )

      if (mlCommissionError) {
        console.error('[upgrade-tier] Multi-level commission error:', mlCommissionError)
      } else {
        console.log('[upgrade-tier] Multi-level commissions processed:', mlCommissionData)
      }
    } catch (mlErr) {
      console.error('[upgrade-tier] Exception processing multi-level commissions:', mlErr)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        upgrade: {
          user_id: user.id,
          from_tier: currentTier.tier_name,
          to_tier: newTier.tier_name,
          upgrade_cost: upgradeDiff,
          payment_id
        },
        commission: commissionResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[upgrade-tier] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
