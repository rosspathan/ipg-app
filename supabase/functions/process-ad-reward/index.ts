import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
/**
 * @deprecated This function is deprecated. Use process-ad-click instead.
 * Kept for backward compatibility only. Do not use in new code.
 * 
 * Migration Guide:
 * - Use supabase.functions.invoke('process-ad-click', { body: { ad_id, view_time_seconds } })
 * - The process-ad-click function has better video support, validation, and logging
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Ignore any client-supplied subscription_tier — it must be verified server-side.
    const { ad_id, view_time_seconds } = await req.json();

    console.log('Processing ad reward:', { user_id: user.id, ad_id, view_time_seconds });

    // Get ad details
    const { data: ad, error: adError } = await supabaseClient
      .from('ads')
      .select('*')
      .eq('id', ad_id)
      .single();

    if (adError || !ad) {
      throw new Error('Ad not found');
    }

    // Verify view time meets requirement
    if (view_time_seconds < ad.required_view_time_seconds) {
      throw new Error('Insufficient view time');
    }

    // Check daily impression limit per user
    const { count } = await supabaseClient
      .from('ad_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('ad_id', ad_id)
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count && count >= (ad.max_impressions_per_user_per_day || 5)) {
      throw new Error('Daily view limit reached for this ad');
    }

    // Calculate reward based on subscription tier
    let reward_bsk = ad.reward_bsk || 0;
    
    // Get subscription multiplier
    const { data: subTier } = await supabaseClient
      .from('ad_subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_bsk', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Determine destination (withdrawable vs holding) from a SERVER-SIDE
    // subscription lookup — never trust a client-supplied tier value.
    const { data: activeSubscription } = await supabaseClient
      .from('ad_user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().slice(0, 10))
      .limit(1)
      .maybeSingle();

    const subscription_tier = activeSubscription ? 'subscribed' : 'free';
    const destination = activeSubscription ? 'withdrawable' : 'holding';

    // Create ad click record
    const { data: clickRecord, error: clickError } = await supabaseClient
      .from('ad_clicks')
      .insert({
        user_id: user.id,
        ad_id: ad_id,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        rewarded: true,
        reward_bsk: reward_bsk,
        subscription_tier: subscription_tier
      })
      .select()
      .single();

    if (clickError) {
      throw clickError;
    }

    // Credit BSK balance using atomic transaction
    const { error: balanceError } = await supabaseClient.rpc('record_bsk_transaction', {
      p_user_id: user.id,
      p_idempotency_key: `ad_reward_${clickRecord.id}`,
      p_tx_type: 'credit',
      p_tx_subtype: 'ad_mining',
      p_balance_type: destination,
      p_amount_bsk: reward_bsk,
      p_meta_json: {
        ad_id: ad_id,
        click_id: clickRecord.id,
        subscription_tier: subscription_tier,
        destination: destination
      }
    });

    if (balanceError) {
      console.error('Failed to credit ad reward:', balanceError);
      throw balanceError;
    }

    console.log('✅ Ad reward processed:', { reward_bsk, destination });

    return new Response(
      JSON.stringify({ 
        success: true, 
        reward_bsk,
        destination,
        click_id: clickRecord.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error processing ad reward:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
