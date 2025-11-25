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

    const { tier_id, payment_id, amount_bsk } = await req.json()

    if (!tier_id || !payment_id || !amount_bsk || amount_bsk <= 0) {
      throw new Error('Invalid request: tier_id, payment_id, and amount_bsk required')
    }

    console.log(`[subscribe-to-tier] User ${user.id} subscribing to tier ${tier_id}, amount: ${amount_bsk} BSK`)

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

    // Verify tier exists
    const { data: tier, error: tierError } = await supabaseClient
      .from('badge_card_config')
      .select('*')
      .eq('id', tier_id)
      .single()

    if (tierError || !tier) {
      throw new Error('Invalid tier')
    }

    // Validate amount matches tier price
    if (Math.abs(amount_bsk - tier.purchase_price) > 0.01) {
      throw new Error(`Amount mismatch: expected ${tier.purchase_price} BSK, got ${amount_bsk} BSK`)
    }

    // Create subscription record (debit user balance) - FIXED PARAMETER NAMES
    const idempotencyKey = `sub:purchase:${user.id}:${tier_id}:${payment_id}`
    
    const { data: debitResult, error: debitError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'subscription_purchase',
        p_amount_bsk: amount_bsk,  // FIXED: was p_amount
        p_balance_type: 'withdrawable',
        p_notes: `Purchased ${tier.tier_name} badge`,  // FIXED: was p_description
        p_meta_json: { tier_id, tier_name: tier.tier_name, payment_id }  // FIXED: was p_metadata
      }
    )

    if (debitError) {
      console.error('[subscribe-to-tier] Debit failed:', debitError)
      throw new Error(`Failed to process payment: ${debitError.message}`)
    }

    console.log('[subscribe-to-tier] Payment processed:', debitResult)

    // Assign badge to user
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id: user.id,
        badge_id: tier_id,
        acquired_at: new Date().toISOString(),
        purchase_price_paid: amount_bsk
      }, { onConflict: 'user_id,badge_id' })

    if (badgeError) {
      console.error('[subscribe-to-tier] Badge assignment failed:', badgeError)
      // Payment already debited, log but don't fail
    }

    // Get referrer (sponsor)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('referred_by')
      .eq('user_id', user.id)
      .single()

    let referrerBonus = null

    if (profile?.referred_by) {
      // Credit 10% to referrer's withdrawable balance
      const bonusAmount = amount_bsk * 0.1
      const bonusIdempotencyKey = `sub:bonus:${user.id}:${tier_id}:${payment_id}`

      const { data: bonusResult, error: bonusError } = await supabaseClient.rpc(
        'record_bsk_transaction',
        {
          p_user_id: profile.referred_by,
          p_idempotency_key: bonusIdempotencyKey,
          p_tx_type: 'credit',
          p_tx_subtype: 'subscription_bonus',
          p_amount_bsk: bonusAmount,  // FIXED: was p_amount
          p_balance_type: 'withdrawable',
          p_notes: `10% subscription bonus from ${tier.tier_name} purchase`,  // FIXED: was p_description
          p_meta_json: {   // FIXED: was p_metadata
            subscriber_id: user.id, 
            tier_id, 
            tier_name: tier.tier_name,
            subscription_amount: amount_bsk,
            payment_id 
          }
        }
      )

      if (bonusError) {
        console.error('[subscribe-to-tier] Referrer bonus failed:', bonusError)
        // Don't fail the subscription, just log
      } else {
        console.log('[subscribe-to-tier] Referrer bonus credited:', bonusResult)
        referrerBonus = { referrer_id: profile.referred_by, bonus_amount: bonusAmount }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: {
          user_id: user.id,
          tier_id,
          tier_name: tier.tier_name,
          amount_paid: amount_bsk,
          payment_id
        },
        referrer_bonus: referrerBonus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[subscribe-to-tier] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})