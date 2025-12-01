import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  tier_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tier_id } = await req.json() as PurchaseRequest;
    console.log(`[purchase-ad-subscription] User ${user.id} purchasing tier ${tier_id}`);

    // 1. Fetch tier details
    const { data: tier, error: tierError } = await supabase
      .from('ad_subscription_tiers')
      .select('*')
      .eq('id', tier_id)
      .eq('is_active', true)
      .single();

    if (tierError || !tier) {
      console.error('Tier fetch error:', tierError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive subscription tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[purchase-ad-subscription] Tier details:`, tier);

    // 2. Check user has sufficient withdrawable balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError) {
      console.error('Balance fetch error:', balanceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const withdrawableBalance = balance?.withdrawable_balance || 0;
    const requiredBsk = tier.tier_bsk;

    if (withdrawableBalance < requiredBsk) {
      console.log(`[purchase-ad-subscription] Insufficient balance: ${withdrawableBalance} < ${requiredBsk}`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient withdrawable balance',
          required: requiredBsk,
          available: withdrawableBalance
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get current BSK rate for logging
    const { data: fxRate } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('symbol', 'BSK')
      .eq('base', 'INR')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const bskRate = fxRate?.rate || 1;
    const tierInr = requiredBsk * bskRate;

    // 4. Calculate subscription dates
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + tier.duration_days * 24 * 60 * 60 * 1000).toISOString();

    // 5. Use record_bsk_transaction RPC for atomic debit
    const { data: txResult, error: txError } = await supabase.rpc('record_bsk_transaction', {
      p_user_id: user.id,
      p_amount_bsk: -requiredBsk,
      p_amount_inr: -tierInr,
      p_tx_type: 'purchase',
      p_tx_subtype: 'ad_subscription',
      p_destination: 'withdrawable',
      p_rate_snapshot: bskRate,
      p_notes: `Ad Mining Subscription Purchase - Tier ${tier_id}`,
      p_metadata: {
        tier_id: tier_id,
        duration_days: tier.duration_days,
        daily_bsk: tier.daily_bsk,
        start_date: startDate,
        end_date: endDate
      }
    });

    if (txError) {
      console.error('Transaction error:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment', details: txError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[purchase-ad-subscription] Payment successful:`, txResult);

    // 6. Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('ad_user_subscriptions')
      .insert({
        user_id: user.id,
        tier_id: tier_id,
        purchased_bsk: requiredBsk,
        tier_inr: tierInr,
        daily_bsk: tier.daily_bsk,
        days_total: tier.duration_days,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription creation error:', subError);
      // Note: Payment already processed, log this for manual resolution
      return new Response(
        JSON.stringify({ 
          error: 'Payment processed but subscription creation failed',
          details: subError.message,
          contact_support: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[purchase-ad-subscription] Subscription created:`, subscription);

    // 7. Log in bonus_ledger for audit trail
    await supabase.from('bonus_ledger').insert({
      user_id: user.id,
      asset: 'BSK',
      type: 'ad_subscription_purchase',
      amount_bsk: -requiredBsk,
      usd_value: tierInr / bskRate,
      meta_json: {
        tier_id: tier_id,
        subscription_id: subscription.id,
        duration_days: tier.duration_days,
        daily_bsk: tier.daily_bsk
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription: subscription,
        message: 'Subscription purchased successfully!',
        details: {
          tier_name: `${tier.duration_days} Days`,
          daily_reward: tier.daily_bsk,
          total_cost: requiredBsk,
          valid_until: endDate
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
