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
    const authHeader = req.headers.get('Authorization');
    console.log('[purchase-one-time-offer] Request received', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      contentType: req.headers.get('Content-Type')
    });

    if (!authHeader) {
      console.error('[purchase-one-time-offer] No Authorization header found');
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError) {
      console.error('[purchase-one-time-offer] Auth error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'UNAUTHORIZED', 
          message: 'Invalid authentication token',
          details: userError.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      console.error('[purchase-one-time-offer] No user found from token');
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'User not found. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { offer_id, order_id, purchase_amount_bsk } = await req.json()

    if (!offer_id || !order_id) {
      throw new Error('Invalid request: offer_id and order_id required')
    }

    console.log(`[purchase-one-time-offer] User ${user.id} purchasing offer ${offer_id}`)

    // Get offer details with time validation
    const { data: offer, error: offerError } = await supabaseClient
      .from('bsk_purchase_bonuses')
      .select('*')
      .eq('id', offer_id)
      .eq('is_active', true)
      .lte('start_at', new Date().toISOString())
      .gte('end_at', new Date().toISOString())
      .single()

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ error: 'OFFER_NOT_AVAILABLE', message: 'This offer is not currently available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already claimed this offer
    const { data: existingClaim, error: claimCheckError } = await supabaseClient
      .from('user_purchase_bonus_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('bonus_id', offer_id)
      .maybeSingle()

    if (existingClaim) {
      return new Response(
        JSON.stringify({ error: 'ALREADY_CLAIMED', message: 'You have already claimed this offer' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const purchaseAmount = purchase_amount_bsk || offer.min_purchase_amount_bsk

    // Validate amount is within range
    if (purchaseAmount < offer.min_purchase_amount_bsk || purchaseAmount > offer.max_purchase_amount_bsk) {
      return new Response(
        JSON.stringify({ 
          error: 'INVALID_AMOUNT', 
          message: `Amount must be between ${offer.min_purchase_amount_bsk} and ${offer.max_purchase_amount_bsk} BSK` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[purchase-one-time-offer] Purchasing ${purchaseAmount} BSK`)

    // Check user balance
    const { data: userBalance } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single()

    if (!userBalance || userBalance.withdrawable_balance < purchaseAmount) {
      return new Response(
        JSON.stringify({ 
          error: 'INSUFFICIENT_BALANCE', 
          message: 'Insufficient BSK balance',
          required: purchaseAmount,
          available: userBalance?.withdrawable_balance || 0
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate bonuses
    const withdrawableBonus = (purchaseAmount * offer.withdrawable_bonus_percent) / 100
    const holdingBonus = (purchaseAmount * offer.holding_bonus_percent) / 100

    console.log(`[purchase-one-time-offer] Purchase: ${purchaseAmount} BSK, W: ${withdrawableBonus}, H: ${holdingBonus}`)

    // Debit payment from withdrawable
    const debitIdempotencyKey = `otp:debit:${user.id}:${order_id}`
    
    const { data: debitResult, error: debitError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: debitIdempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'one_time_purchase',
        p_amount: purchaseAmount,
        p_balance_type: 'withdrawable',
        p_description: `One-time purchase: ${offer.campaign_name}`,
        p_metadata: { offer_id, order_id, campaign: offer.campaign_name }
      }
    )

    if (debitError) {
      console.error('[purchase-one-time-offer] Debit failed:', debitError)
      throw new Error(`Payment failed: ${debitError.message}`)
    }

    console.log('[purchase-one-time-offer] Payment debited:', debitResult)

    // Credit back purchase amount (promotional refund)
    const refundIdempotencyKey = `otp:refund:${user.id}:${order_id}`
    
    const { data: refundResult, error: refundError } = await supabaseClient.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: refundIdempotencyKey,
        p_tx_type: 'credit',
        p_tx_subtype: 'one_time_purchase_refund',
        p_amount: purchaseAmount,
        p_balance_type: 'withdrawable',
        p_description: `Promotional refund: ${offer.campaign_name}`,
        p_metadata: { 
          offer_id, 
          order_id, 
          campaign: offer.campaign_name,
          type: 'promotional_refund',
          original_amount: purchaseAmount
        }
      }
    )

    if (refundError) {
      console.error('[purchase-one-time-offer] Refund failed:', refundError)
      throw new Error(`Promotional refund failed: ${refundError.message}`)
    }

    console.log('[purchase-one-time-offer] Purchase amount refunded:', refundResult)

    // Credit withdrawable bonus if any
    if (withdrawableBonus > 0) {
      const creditWithdrawableKey = `otp:credit:withdrawable:${user.id}:${order_id}`
      
      const { data: creditWithdrawable, error: creditWithdrawableError } = await supabaseClient.rpc(
        'record_bsk_transaction',
        {
          p_user_id: user.id,
          p_idempotency_key: creditWithdrawableKey,
          p_tx_type: 'credit',
          p_tx_subtype: 'one_time_purchase_bonus',
          p_amount: withdrawableBonus,
          p_balance_type: 'withdrawable',
          p_description: `${offer.withdrawable_bonus_percent}% withdrawable bonus: ${offer.campaign_name}`,
          p_metadata: { offer_id, order_id, type: 'withdrawable_bonus', bonus_percent: offer.withdrawable_bonus_percent }
        }
      )

      if (creditWithdrawableError) {
        console.error('[purchase-one-time-offer] Withdrawable bonus failed:', creditWithdrawableError)
      } else {
        console.log('[purchase-one-time-offer] Withdrawable bonus credited:', creditWithdrawable)
      }
    }

    // Credit holding bonus if any
    if (holdingBonus > 0) {
      const creditHoldingKey = `otp:credit:holding:${user.id}:${order_id}`
      
      const { data: creditHolding, error: creditHoldingError } = await supabaseClient.rpc(
        'record_bsk_transaction',
        {
          p_user_id: user.id,
          p_idempotency_key: creditHoldingKey,
          p_tx_type: 'credit',
          p_tx_subtype: 'one_time_purchase_bonus',
          p_amount: holdingBonus,
          p_balance_type: 'locked',
          p_description: `${offer.holding_bonus_percent}% holding bonus: ${offer.campaign_name}`,
          p_metadata: { offer_id, order_id, type: 'holding_bonus', bonus_percent: offer.holding_bonus_percent }
        }
      )

      if (creditHoldingError) {
        console.error('[purchase-one-time-offer] Holding bonus failed:', creditHoldingError)
      } else {
        console.log('[purchase-one-time-offer] Holding bonus credited:', creditHolding)
      }
    }

    // Record claim
    const { error: claimError } = await supabaseClient
      .from('user_purchase_bonus_claims')
      .insert({
        user_id: user.id,
        bonus_id: offer_id,
        claimed_at: new Date().toISOString(),
        purchase_amount_bsk: purchaseAmount,
        withdrawable_bonus_bsk: withdrawableBonus,
        holding_bonus_bsk: holdingBonus,
        order_id
      })

    if (claimError) {
      console.error('[purchase-one-time-offer] Failed to record claim:', claimError)
      throw new Error('Failed to record purchase claim')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchase: {
          offer_id,
          campaign: offer.campaign_name,
          amount_paid: purchaseAmount,
          amount_refunded: purchaseAmount,
          withdrawable_bonus: withdrawableBonus,
          holding_bonus: holdingBonus,
          total_received: purchaseAmount + withdrawableBonus + holdingBonus,
          net_cost: 0,
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
