import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCommissionRequest {
  user_id: string;
  badge_name: string;
  bsk_amount: number;
  previous_badge?: string | null;
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

    const { user_id, badge_name, bsk_amount, previous_badge }: BadgeCommissionRequest = await req.json();
    
    console.log('💎 Processing badge subscription commission:', { user_id, badge_name, bsk_amount, previous_badge });

    // Get team referral settings for commission rate
    const { data: settings } = await supabaseClient
      .from('team_referral_settings')
      .select('direct_commission_percent, is_active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings?.is_active) {
      console.log('⚠️ Team referral system is not active');
      return new Response(
        JSON.stringify({ success: false, message: 'Referral system inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const commissionRate = Number(settings.direct_commission_percent) / 100;
    const commissionAmount = bsk_amount * commissionRate;

    console.log(`📊 Commission rate: ${settings.direct_commission_percent}%, Amount: ${commissionAmount} BSK`);

    // Get direct referrer (Level 1 sponsor)
    const { data: referralTree } = await supabaseClient
      .from('referral_tree')
      .select('ancestor_id')
      .eq('user_id', user_id)
      .eq('level', 1)
      .maybeSingle();

    if (!referralTree?.ancestor_id) {
      console.log('⚠️ No direct referrer found for user:', user_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No direct referrer',
          commission_paid: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sponsorId = referralTree.ancestor_id;
    console.log(`💰 Paying ${commissionAmount} BSK to sponsor:`, sponsorId);

    // Get sponsor's current balance
    const { data: currentBalance } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance, total_earned_withdrawable')
      .eq('user_id', sponsorId)
      .maybeSingle();

    // Update sponsor's withdrawable balance
    const { error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .upsert({
        user_id: sponsorId,
        withdrawable_balance: Number(currentBalance?.withdrawable_balance || 0) + commissionAmount,
        total_earned_withdrawable: Number(currentBalance?.total_earned_withdrawable || 0) + commissionAmount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      throw balanceError;
    }

    // Get sponsor's current badge for record
    const { data: sponsorBadge } = await supabaseClient
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsorId)
      .maybeSingle();

    // Insert commission record
    const { error: commissionError } = await supabaseClient
      .from('referral_commissions')
      .insert({
        earner_id: sponsorId,
        payer_id: user_id,
        level: 1,
        event_type: previous_badge ? 'badge_upgrade' : 'badge_purchase',
        commission_type: 'badge_subscription',
        bsk_amount: commissionAmount,
        destination: 'withdrawable',
        status: 'settled',
        my_badge_at_event: sponsorBadge?.current_badge,
        metadata: {
          badge_purchased: badge_name,
          previous_badge: previous_badge,
          purchase_amount: bsk_amount,
          commission_rate: settings.direct_commission_percent
        },
        created_at: new Date().toISOString()
      });

    if (commissionError) {
      console.error('Error inserting commission:', commissionError);
      throw commissionError;
    }

    // Insert bonus ledger entry
    await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id: sponsorId,
        type: previous_badge ? 'badge_upgrade_commission' : 'badge_purchase_commission',
        amount_bsk: commissionAmount,
        asset: 'BSK',
        meta_json: {
          referral_user_id: user_id,
          badge_name: badge_name,
          previous_badge: previous_badge,
          purchase_amount: bsk_amount,
          timestamp: new Date().toISOString()
        },
        usd_value: 0
      });

    console.log(`✅ Successfully paid ${commissionAmount} BSK commission to sponsor ${sponsorId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sponsor_id: sponsorId,
        commission_paid: commissionAmount,
        commission_rate: settings.direct_commission_percent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Badge commission processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
