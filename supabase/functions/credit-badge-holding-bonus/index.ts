import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BonusRequest {
  user_id: string;
  badge_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, badge_name }: BonusRequest = await req.json();

    console.log('Credit badge holding bonus request:', { user_id, badge_name });

    // 1. Get badge threshold to check bonus_bsk_holding
    const { data: badgeThreshold, error: thresholdError } = await supabaseClient
      .from('badge_thresholds')
      .select('bonus_bsk_holding')
      .eq('badge_name', badge_name.toUpperCase())
      .single();

    if (thresholdError || !badgeThreshold) {
      console.error('Badge threshold not found:', thresholdError);
      return new Response(
        JSON.stringify({ error: 'Badge threshold not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bonusAmount = Number(badgeThreshold.bonus_bsk_holding || 0);

    if (bonusAmount <= 0) {
      console.log('No bonus BSK for this badge');
      return new Response(
        JSON.stringify({ success: true, bonus_credited: 0, message: 'No bonus for this badge' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Credit bonus to holding balance
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('holding_balance, total_earned_holding')
      .eq('user_id', user_id)
      .single();

    if (balanceError) {
      console.error('Balance fetch error:', balanceError);
      throw new Error('Failed to fetch user balance');
    }

    const { error: updateError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        holding_balance: Number(currentBalance.holding_balance || 0) + bonusAmount,
        total_earned_holding: Number(currentBalance.total_earned_holding || 0) + bonusAmount,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Balance update error:', updateError);
      throw new Error('Failed to credit bonus');
    }

    // 3. Create ledger entry
    await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id,
        type: 'badge_bonus',
        amount_bsk: bonusAmount,
        meta_json: {
          badge_name,
          bonus_type: 'holding_balance',
          source: 'badge_purchase'
        },
      });

    console.log(`Successfully credited ${bonusAmount} BSK to holding balance for ${badge_name} badge`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bonus_credited: bonusAmount,
        message: `${bonusAmount} BSK bonus credited to holding balance`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Credit bonus error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
