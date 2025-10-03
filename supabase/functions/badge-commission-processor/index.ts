import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BadgePurchaseRequest {
  userId: string
  toBadge: string
  fromBadge?: string
  paidAmountBSK: number
  paymentRef: string
  paymentMethod?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, toBadge, fromBadge, paidAmountBSK, paymentRef, paymentMethod } = await req.json() as BadgePurchaseRequest

    console.log(`[Badge Commission] Processing badge purchase for user ${userId}: ${fromBadge || 'NONE'} -> ${toBadge}`)

    // 1. Get settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('team_referral_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('[Badge Commission] Settings error:', settingsError)
      throw new Error('Failed to load settings')
    }

    if (!settings.enabled) {
      console.log('[Badge Commission] Program disabled')
      return new Response(JSON.stringify({ success: true, message: 'Program disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Get badge prices for commissionable amount calculation
    const { data: badges, error: badgesError } = await supabaseClient
      .from('badge_thresholds')
      .select('badge_name, bsk_threshold')
      .eq('is_active', true)

    if (badgesError || !badges) {
      console.error('[Badge Commission] Badge threshold error:', badgesError)
      throw new Error('Failed to load badge thresholds')
    }

    const badgeMap = badges.reduce((acc, b) => ({ ...acc, [b.badge_name]: b.bsk_threshold }), {} as Record<string, number>)
    const toBadgePrice = badgeMap[toBadge] || 0
    const fromBadgePrice = fromBadge ? (badgeMap[fromBadge] || 0) : 0

    // Calculate commissionable amount (incremental for upgrades)
    const commissionableAmount = toBadgePrice - fromBadgePrice
    const eventType = fromBadge && fromBadge !== 'NONE' ? 'badge_upgrade' : 'badge_purchase'

    console.log(`[Badge Commission] Commissionable amount: ${commissionableAmount} BSK (${eventType})`)

    // 3. Create badge purchase event
    const { data: event, error: eventError } = await supabaseClient
      .from('badge_purchase_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        from_badge: fromBadge || null,
        to_badge: toBadge,
        paid_amount_bsk: paidAmountBSK,
        commissionable_amount_bsk: commissionableAmount,
        rate_snapshot: settings.bsk_inr_rate,
        payment_ref: paymentRef,
        payment_method: paymentMethod || 'BSK',
      })
      .select()
      .single()

    if (eventError) {
      console.error('[Badge Commission] Event creation error:', eventError)
      throw new Error('Failed to create event')
    }

    // 4. Update user badge holdings
    const badgeHistory = fromBadge ? [{
      from: fromBadge,
      to: toBadge,
      at: new Date().toISOString(),
      price_bsk: paidAmountBSK
    }] : []

    await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id: userId,
        current_badge: toBadge,
        previous_badge: fromBadge || null,
        purchased_at: new Date().toISOString(),
        price_bsk: toBadgePrice,
        payment_ref: paymentRef,
        history: badgeHistory
      })

    // 5. Get referral link (sponsor)
    const { data: referralLink } = await supabaseClient
      .from('referral_links')
      .select('sponsor_id')
      .eq('user_id', userId)
      .single()

    if (!referralLink?.sponsor_id) {
      console.log('[Badge Commission] No sponsor found')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No sponsor',
        eventId: event.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const sponsorId = referralLink.sponsor_id

    // 6. Check sponsor badge eligibility
    const { data: sponsorBadge } = await supabaseClient
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsorId)
      .single()

    const sponsorCurrentBadge = sponsorBadge?.current_badge || 'NONE'
    
    // Use the eligibility check function
    const { data: eligibilityCheck } = await supabaseClient
      .rpc('check_badge_eligibility', {
        sponsor_badge: sponsorCurrentBadge,
        required_badge: settings.min_referrer_badge_required || 'ANY_BADGE'
      })

    const eligibilityMet = eligibilityCheck === true

    console.log(`[Badge Commission] Sponsor ${sponsorId} badge: ${sponsorCurrentBadge}, required: ${settings.min_referrer_badge_required}, eligible: ${eligibilityMet}`)

    // 7. Log audit entry
    await supabaseClient
      .from('commission_audit_log')
      .insert({
        event_id: event.id,
        sponsor_id: sponsorId,
        action: 'eligibility_check',
        reason: eligibilityMet ? 'eligible' : 'ineligible_badge',
        eligibility_met: eligibilityMet,
        sponsor_badge: sponsorCurrentBadge,
        required_badge: settings.min_referrer_badge_required,
        metadata: { event_type: eventType, commissionable_amount: commissionableAmount }
      })

    if (!eligibilityMet) {
      // Create void commission record
      await supabaseClient
        .from('commission_payouts')
        .insert({
          sponsor_id: sponsorId,
          referred_user_id: userId,
          event_id: event.id,
          commissionable_bsk: commissionableAmount,
          commission_percent: settings.direct_commission_percent,
          commission_bsk: 0,
          destination: settings.payout_destination || 'WITHDRAWABLE',
          status: 'void',
          eligibility_met: false,
          sponsor_badge_at_event: sponsorCurrentBadge,
          required_badge_at_event: settings.min_referrer_badge_required,
          reason: `Sponsor badge ${sponsorCurrentBadge} does not meet minimum requirement ${settings.min_referrer_badge_required}`,
          idempotency_key: `direct:${event.id}:${sponsorId}`
        })

      console.log('[Badge Commission] Commission voided - eligibility not met')

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Sponsor not eligible',
        eventId: event.id,
        eligibilityMet: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. Calculate commission
    const commissionPercent = settings.direct_commission_percent
    let commissionBSK = (commissionableAmount * commissionPercent) / 100

    // 9. Check daily cap
    const today = new Date().toISOString().split('T')[0]
    const { data: dailyTotal } = await supabaseClient
      .from('daily_commission_totals')
      .select('total_commission_bsk')
      .eq('user_id', sponsorId)
      .eq('date', today)
      .single()

    const currentDailyTotal = dailyTotal?.total_commission_bsk || 0
    const maxDailyCommission = settings.max_daily_direct_commission_bsk || 0
    let capped = false

    if (maxDailyCommission > 0 && currentDailyTotal + commissionBSK > maxDailyCommission) {
      const remainingCap = Math.max(0, maxDailyCommission - currentDailyTotal)
      commissionBSK = remainingCap
      capped = true
      console.log(`[Badge Commission] Daily cap applied: ${remainingCap} BSK`)
    }

    // 10. Create commission payout
    const { data: payout, error: payoutError } = await supabaseClient
      .from('commission_payouts')
      .insert({
        sponsor_id: sponsorId,
        referred_user_id: userId,
        event_id: event.id,
        commissionable_bsk: commissionableAmount,
        commission_percent: commissionPercent,
        commission_bsk: commissionBSK,
        destination: settings.payout_destination || 'WITHDRAWABLE',
        status: 'settled',
        eligibility_met: true,
        sponsor_badge_at_event: sponsorCurrentBadge,
        required_badge_at_event: settings.min_referrer_badge_required,
        capped,
        idempotency_key: `direct:${event.id}:${sponsorId}`
      })
      .select()
      .single()

    if (payoutError) {
      console.error('[Badge Commission] Payout error:', payoutError)
      throw new Error('Failed to create payout')
    }

    // 11. Credit BSK to sponsor
    const destination = settings.payout_destination === 'HOLDING' ? 'holding_balance' : 'withdrawable_balance'
    
    await supabaseClient
      .from('user_bsk_balances')
      .upsert({
        user_id: sponsorId,
        [destination]: commissionBSK,
        [`total_earned_${settings.payout_destination === 'HOLDING' ? 'holding' : 'withdrawable'}`]: commissionBSK
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    // 12. Update daily commission total
    await supabaseClient
      .from('daily_commission_totals')
      .upsert({
        user_id: sponsorId,
        date: today,
        total_commission_bsk: currentDailyTotal + commissionBSK
      }, {
        onConflict: 'user_id,date'
      })

    // 13. Log to referral ledger (legacy table)
    await supabaseClient
      .from('referral_ledger')
      .insert({
        user_id: sponsorId,
        source_user_id: userId,
        ledger_type: 'direct_badge_bonus',
        badge_at_event: sponsorCurrentBadge,
        trigger_type: eventType,
        inr_amount_snapshot: commissionableAmount * settings.bsk_inr_rate,
        bsk_rate_snapshot: settings.bsk_inr_rate,
        bsk_amount: commissionBSK,
        status: 'settled',
        tx_refs: { event_id: event.id, payout_id: payout.id }
      })

    console.log(`[Badge Commission] SUCCESS: ${commissionBSK} BSK credited to sponsor ${sponsorId}`)

    return new Response(JSON.stringify({ 
      success: true,
      eventId: event.id,
      payoutId: payout.id,
      commissionBSK,
      capped,
      eligibilityMet: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Badge Commission] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
