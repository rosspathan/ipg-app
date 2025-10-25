import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCommissionRequest {
  payer_id: string;
  badge_name: string;
  delta_amount: number;
  is_upgrade: boolean;
  previous_badge?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payer_id, badge_name, delta_amount, is_upgrade, previous_badge } = await req.json() as BadgeCommissionRequest;

    console.log(`Processing multi-level badge sale commission for user ${payer_id}: ${badge_name} (delta: ${delta_amount} BSK)`);

    // Get team referral settings for multi-level commission rates
    const { data: settings } = await supabase
      .from('team_referral_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.is_active) {
      console.log('Referral system not active, skipping commissions');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Referral system not active',
          commissions_paid: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get full referral tree for the buyer
    const { data: referralTreeRows, error: treeError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level, path')
      .eq('user_id', payer_id)
      .order('level', { ascending: true });

    if (treeError) {
      throw new Error(`Failed to fetch referral tree: ${treeError.message}`);
    }

    if (!referralTreeRows || referralTreeRows.length === 0) {
      console.log('No sponsors found for user - no commission to pay');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No sponsors found',
          commissions_paid: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record badge purchase first
    const { data: purchase, error: purchaseError } = await supabase
      .from('badge_purchases')
      .insert({
        user_id: payer_id,
        badge_name,
        bsk_amount: delta_amount,
        inr_amount: 0,
        bsk_rate_at_purchase: 1,
        previous_badge,
        is_upgrade
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error recording badge purchase:', purchaseError);
    }

    const eventId = purchase?.id || crypto.randomUUID();

    // Calculate and distribute multi-level commissions
    const maxLevels = Math.min(referralTreeRows.length, settings.max_levels || 50);
    const commissions = [];
    let totalDistributed = 0;

    for (let i = 0; i < maxLevels; i++) {
      const treeRow = referralTreeRows[i];
      const sponsorId = treeRow.ancestor_id;
      const levelNumber = treeRow.level;

      // Get commission rate for this level
      const commissionRate = settings.level_percentages?.[levelNumber] || 0;

      if (commissionRate <= 0) {
        console.log(`No commission rate for level ${levelNumber}, skipping`);
        continue;
      }

      const commissionAmount = (delta_amount * commissionRate) / 100;

      if (commissionAmount <= 0) {
        continue;
      }

      // Get sponsor's current badge
      const { data: sponsorBadge } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', sponsorId)
        .maybeSingle();

      const currentBadge = sponsorBadge?.current_badge || 'NONE';

      // Determine destination based on settings (withdrawable for badge commissions)
      const destination = 'withdrawable';

      // Credit sponsor's balance
      const { data: existingBalance } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, total_earned_withdrawable')
        .eq('user_id', sponsorId)
        .maybeSingle();

      if (existingBalance) {
        await supabase
          .from('user_bsk_balances')
          .update({
            withdrawable_balance: Number(existingBalance.withdrawable_balance) + commissionAmount,
            total_earned_withdrawable: Number(existingBalance.total_earned_withdrawable) + commissionAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', sponsorId);
      } else {
        await supabase
          .from('user_bsk_balances')
          .insert({
            user_id: sponsorId,
            withdrawable_balance: commissionAmount,
            total_earned_withdrawable: commissionAmount,
            holding_balance: 0,
            total_earned_holding: 0
          });
      }

      // Insert into referral_commissions table
      await supabase
        .from('referral_commissions')
        .insert({
          earner_id: sponsorId,
          payer_id,
          level: levelNumber,
          event_type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
          event_id: eventId,
          bsk_amount: commissionAmount,
          destination: destination,
          status: 'settled',
          earner_badge_at_event: currentBadge,
          commission_percent: commissionRate
        });

      // Insert into bonus_ledger
      await supabase.from('bonus_ledger').insert({
        user_id: sponsorId,
        type: is_upgrade ? 'referral_badge_upgrade' : 'referral_badge_purchase',
        amount_bsk: commissionAmount,
        meta_json: {
          payer_id,
          badge_name,
          delta_amount,
          level: levelNumber,
          commission_percent: commissionRate,
          is_upgrade
        }
      });

      commissions.push({
        sponsor_id: sponsorId,
        level: levelNumber,
        commission_bsk: commissionAmount,
        rate: commissionRate
      });

      totalDistributed += commissionAmount;

      console.log(`Level ${levelNumber} commission: ${commissionAmount} BSK to sponsor ${sponsorId}`);
    }

    console.log(`Successfully distributed ${totalDistributed} BSK across ${commissions.length} levels`);

    return new Response(
      JSON.stringify({
        success: true,
        total_commission_paid: totalDistributed,
        levels_paid: commissions.length,
        commissions: commissions,
        badge_name,
        is_upgrade,
        event_id: eventId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error processing badge sale commission:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
