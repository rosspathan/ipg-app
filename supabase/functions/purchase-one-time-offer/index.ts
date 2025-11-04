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

    const { offer_id, order_id, amount_bsk } = await req.json()

    if (!offer_id || !order_id || !amount_bsk || amount_bsk <= 0) {
      throw new Error('Invalid request: offer_id, order_id, and amount_bsk required')
    }

    console.log(`[purchase-one-time-offer] User ${user.id} purchasing offer ${offer_id}, amount: ${amount_bsk} BSK`)

    // Check if program is enabled
    const { data: programFlag } = await supabaseClient
      .from('program_flags')
      .select('enabled')
      .eq('program_code', 'one_time_purchase')
      .single()

    if (programFlag && !programFlag.enabled) {
      return new Response(
        JSON.stringify({ error: 'PROGRAM_DISABLED', message: 'One-time purchase program is currently disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TIER REQUIREMENT CHECK - Must have at least one active badge
    const { data: userBadges, error: badgesError } = await supabaseClient
      .from('user_badge_holdings')
      .select('badge_id')
      .eq('user_id', user.id)

    if (badgesError || !userBadges || userBadges.length === 0) {
      console.warn(`[purchase-one-time-offer] User ${user.id} has no active tier badge`)
      return new Response(
        JSON.stringify({ 
          error: 'TIER_REQUIRED', 
          message: 'You must purchase a tier badge before accessing one-time purchase offers. Please purchase a Silver, Gold, Platinum, Diamond, or VIP badge first.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[purchase-one-time-offer] User has ${userBadges.length} active tier(s), proceeding...`)

    // Get offer details
    const { data: offer, error: offerError } = await supabaseClient
      .from('bsk_purchase_bonuses')
      .select('*')
      .eq('id', offer_id)
      .eq('is_active', true)
      .single()

    if (offerError || !offer) {
      throw new Error('Invalid or inactive offer')
    }

    // Validate amount
    if (Math.abs(amount_bsk - offer.purchase_amount_bsk) > 0.01) {
      throw new Error(`Amount mismatch: expected ${offer.purchase_amount_bsk} BSK, got ${amount_bsk} BSK`)
    }

    const baseAmount = amount_bsk
    const bonusAmount = amount_bsk * 0.5 // +50% bonus to holding

    // Debit payment from withdrawable
    const debitIdempotencyKey = `otp:debit:${user.id}:${order_id}`
    
    const { data: debitResult, error: debitError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: debitIdempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'one_time_purchase',
        p_amount: amount_bsk,
        p_balance_type: 'withdrawable',
        p_description: `One-time purchase: ${offer.campaign_name}`,
        p_metadata: { offer_id, order_id, campaign: offer.campaign_name }
      }
    )

    if (debitError) {
      console.error('[purchase-one-time-offer] Debit failed:', debitError)
      throw new Error(`Payment failed: ${debitError.message}`)
    }

    console.log('[purchase-one-time-offer] Payment processed:', debitResult)

    // Credit base amount to withdrawable
    const creditWithdrawableKey = `otp:credit:withdrawable:${user.id}:${order_id}`
    
    const { data: creditWithdrawable, error: creditWithdrawableError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: creditWithdrawableKey,
        p_tx_type: 'credit',
        p_tx_subtype: 'one_time_purchase',
        p_amount: baseAmount,
        p_balance_type: 'withdrawable',
        p_description: `One-time purchase credited: ${offer.campaign_name}`,
        p_metadata: { offer_id, order_id, type: 'base_amount' }
      }
    )

    if (creditWithdrawableError) {
      console.error('[purchase-one-time-offer] Withdrawable credit failed:', creditWithdrawableError)
      throw new Error(`Failed to credit purchased amount: ${creditWithdrawableError.message}`)
    }

    console.log('[purchase-one-time-offer] Withdrawable credited:', creditWithdrawable)

    // Credit +50% bonus to holding
    const creditHoldingKey = `otp:credit:holding:${user.id}:${order_id}`
    
    const { data: creditHolding, error: creditHoldingError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: creditHoldingKey,
        p_tx_type: 'credit',
        p_tx_subtype: 'one_time_purchase',
        p_amount: bonusAmount,
        p_balance_type: 'locked',
        p_description: `+50% holding bonus: ${offer.campaign_name}`,
        p_metadata: { offer_id, order_id, type: 'holding_bonus', bonus_percent: 50 }
      }
    )

    if (creditHoldingError) {
      console.error('[purchase-one-time-offer] Holding credit failed:', creditHoldingError)
      // Don't fail, withdrawable was already credited
    } else {
      console.log('[purchase-one-time-offer] Holding bonus credited:', creditHolding)
    }

    // Record purchase
    await supabaseClient
      .from('user_purchase_bonus_claims')
      .insert({
        user_id: user.id,
        bonus_id: offer_id,
        claimed_at: new Date().toISOString(),
        purchase_amount_bsk: amount_bsk,
        bonus_amount_bsk: bonusAmount,
        order_id
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchase: {
          user_id: user.id,
          offer_id,
          campaign: offer.campaign_name,
          amount_paid: amount_bsk,
          credited_withdrawable: baseAmount,
          credited_holding: bonusAmount,
          order_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[purchase-one-time-offer] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
