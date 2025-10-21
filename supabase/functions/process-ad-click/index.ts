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

    const { adId, viewingTimeSeconds } = await req.json()

    console.log('Processing ad click:', { user: user.id, adId, viewingTimeSeconds })

    // 1. Validate ad exists and is active
    const { data: ad, error: adError } = await supabase
      .from('ads')
      .select('*')
      .eq('id', adId)
      .eq('is_active', true)
      .single()

    if (adError || !ad) {
      console.error('Ad validation error:', adError)
      return new Response(
        JSON.stringify({ error: 'Ad not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get user's active subscription tier
    const { data: subscription } = await supabase
      .from('ad_user_subscriptions')
      .select('*, ad_subscription_tiers(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isSubscriber = !!subscription
    const tierName = subscription?.ad_subscription_tiers?.name || 'Free'

    // 3. Get or create today's ad view record
    const today = new Date().toISOString().split('T')[0]
    let { data: dailyViews, error: viewsError } = await supabase
      .from('user_daily_ad_views')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (!dailyViews) {
      const { data: newViews, error: createError } = await supabase
        .from('user_daily_ad_views')
        .insert({
          user_id: user.id,
          date: today,
          views_count: 0,
          bsk_earned_today: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating daily views:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create daily views record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      dailyViews = newViews
    }

    // 4. Get ad mining settings for daily limits
    const { data: settings } = await supabase
      .from('ad_mining_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const dailyLimit = isSubscriber 
      ? (subscription.ad_subscription_tiers.daily_ad_limit || 50)
      : (settings?.free_tier_daily_limit || 10)

    // 5. Check if user has reached daily limit
    if (dailyViews.views_count >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily ad viewing limit reached',
          limit: dailyLimit,
          current: dailyViews.views_count
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Check for duplicate clicks (prevent fraud)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { data: recentClick } = await supabase
      .from('ad_clicks')
      .select('id')
      .eq('user_id', user.id)
      .eq('ad_id', adId)
      .gte('created_at', oneMinuteAgo)
      .maybeSingle()

    if (recentClick) {
      return new Response(
        JSON.stringify({ error: 'Duplicate click detected. Please wait before clicking again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Validate viewing time (minimum 5 seconds)
    if (viewingTimeSeconds < 5) {
      return new Response(
        JSON.stringify({ error: 'Insufficient viewing time. Please watch the ad for at least 5 seconds.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Calculate BSK reward
    const baseReward = ad.reward_bsk || settings?.free_tier_reward_bsk || 1
    const rewardMultiplier = isSubscriber ? (subscription.ad_subscription_tiers.reward_multiplier || 1) : 1
    const bskReward = baseReward * rewardMultiplier

    // 9. Determine destination balance (subscribers get withdrawable, free users get holding)
    const balanceType = isSubscriber ? 'withdrawable' : 'holding'

    // 10. Create ad click record
    const { error: clickError } = await supabase
      .from('ad_clicks')
      .insert({
        user_id: user.id,
        ad_id: adId,
        reward_bsk: bskReward,
        viewing_time_seconds: viewingTimeSeconds
      })

    if (clickError) {
      console.error('Error creating ad click:', clickError)
      return new Response(
        JSON.stringify({ error: 'Failed to record ad click' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 11. Credit BSK to user balance
    if (balanceType === 'withdrawable') {
      await supabase
        .from('user_bsk_balances')
        .upsert({
          user_id: user.id,
          withdrawable_balance: supabase.rpc('increment', { x: bskReward }),
          total_earned_withdrawable: supabase.rpc('increment', { x: bskReward })
        }, { onConflict: 'user_id' })
    } else {
      await supabase
        .from('user_bsk_balances')
        .upsert({
          user_id: user.id,
          holding_balance: supabase.rpc('increment', { x: bskReward }),
          total_earned_holding: supabase.rpc('increment', { x: bskReward })
        }, { onConflict: 'user_id' })
    }

    // 12. Update daily views
    await supabase
      .from('user_daily_ad_views')
      .update({
        views_count: dailyViews.views_count + 1,
        bsk_earned_today: dailyViews.bsk_earned_today + bskReward
      })
      .eq('id', dailyViews.id)

    // 13. Create bonus ledger entry
    await supabase
      .from('bonus_ledger')
      .insert({
        user_id: user.id,
        type: 'ad_mining',
        amount_bsk: bskReward,
        meta_json: {
          ad_id: adId,
          tier: tierName,
          balance_type: balanceType,
          viewing_time: viewingTimeSeconds
        }
      })

    console.log('Ad click processed successfully:', { user: user.id, reward: bskReward, type: balanceType })

    return new Response(
      JSON.stringify({
        success: true,
        reward_bsk: bskReward,
        balance_type: balanceType,
        views_remaining: dailyLimit - (dailyViews.views_count + 1),
        total_views_today: dailyViews.views_count + 1,
        total_earned_today: dailyViews.bsk_earned_today + bskReward
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing ad click:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
