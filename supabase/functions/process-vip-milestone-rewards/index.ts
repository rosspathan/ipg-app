import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIPMilestoneRequest {
  sponsor_id: string;
  new_vip_referral_id: string;
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

    const { sponsor_id, new_vip_referral_id }: VIPMilestoneRequest = await req.json();
    
    console.log('💎 Checking VIP milestone rewards for sponsor:', sponsor_id);

    // 1. Check if sponsor has i-Smart VIP badge (required to earn milestone rewards)
    const { data: sponsorBadge, error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsor_id)
      .maybeSingle();

    if (badgeError) {
      console.error('Error fetching sponsor badge:', badgeError);
      throw badgeError;
    }

    const badgeName = sponsorBadge?.current_badge?.toUpperCase() || '';
    const isVIP = badgeName.includes('VIP') || badgeName.includes('SMART');

    if (!isVIP) {
      console.log('⚠️ Sponsor does not have i-Smart VIP badge, not eligible for milestone rewards');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sponsor not VIP',
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Count sponsor's total direct VIP referrals
    // Get Level 1 referrals from referral_tree
    const { data: directReferrals, error: referralError } = await supabaseClient
      .from('referral_tree')
      .select('user_id')
      .eq('ancestor_id', sponsor_id)
      .eq('level', 1);

    if (referralError) {
      console.error('Error fetching direct referrals:', referralError);
      throw referralError;
    }

    if (!directReferrals || directReferrals.length === 0) {
      console.log('⚠️ No direct referrals found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No direct referrals',
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referralIds = directReferrals.map(r => r.user_id);

    // Count how many have i-Smart VIP badge
    const { data: vipReferrals, error: vipError } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id, current_badge')
      .in('user_id', referralIds);

    if (vipError) {
      console.error('Error fetching VIP referral badges:', vipError);
      throw vipError;
    }

    const vipCount = vipReferrals?.filter(b => {
      const badge = b.current_badge?.toUpperCase() || '';
      return badge.includes('VIP') || badge.includes('SMART');
    }).length || 0;

    console.log(`📊 Sponsor has ${vipCount} direct VIP referrals`);

    // 3. Fetch all active VIP milestones
    const { data: milestones, error: milestoneError } = await supabaseClient
      .from('vip_milestones')
      .select('*')
      .eq('is_active', true)
      .order('vip_count_required', { ascending: true });

    if (milestoneError) {
      console.error('Error fetching milestones:', milestoneError);
      throw milestoneError;
    }

    if (!milestones || milestones.length === 0) {
      console.log('⚠️ No active VIP milestones configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No milestones configured',
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check for newly achieved milestones
    const milestonesAchieved = [];
    let totalBSKRewarded = 0;

    for (const milestone of milestones) {
      if (vipCount >= milestone.vip_count_required) {
        // Check if already claimed
        const { data: existingClaim, error: claimError } = await supabaseClient
          .from('user_vip_milestone_claims')
          .select('id')
          .eq('user_id', sponsor_id)
          .eq('milestone_id', milestone.id)
          .maybeSingle();

        if (claimError && claimError.code !== 'PGRST116') {
          console.error('Error checking claim:', claimError);
          continue;
        }

        if (existingClaim) {
          console.log(`✓ Milestone ${milestone.vip_count_required} VIPs already claimed`);
          continue;
        }

        // NEW MILESTONE ACHIEVED! 🎉
        const rewardBSK = Number(milestone.reward_inr_value); // Using INR value as BSK amount
        console.log(`🎉 NEW MILESTONE! ${milestone.vip_count_required} VIPs → ${rewardBSK} BSK`);

        // Get current balance
        const { data: currentBalance } = await supabaseClient
          .from('user_bsk_balances')
          .select('withdrawable_balance, total_earned_withdrawable')
          .eq('user_id', sponsor_id)
          .maybeSingle();

        // Credit withdrawable balance
        const { error: balanceUpdateError } = await supabaseClient
          .from('user_bsk_balances')
          .upsert({
            user_id: sponsor_id,
            withdrawable_balance: Number(currentBalance?.withdrawable_balance || 0) + rewardBSK,
            total_earned_withdrawable: Number(currentBalance?.total_earned_withdrawable || 0) + rewardBSK,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (balanceUpdateError) {
          console.error('Error updating balance:', balanceUpdateError);
          continue;
        }

        // Insert commission record
        const { error: commissionError } = await supabaseClient
          .from('referral_commissions')
          .insert({
            earner_id: sponsor_id,
            payer_id: null, // No specific payer for milestone rewards
            level: 0, // Special level for milestones
            event_type: `vip_milestone_${milestone.vip_count_required}`,
            commission_type: 'vip_milestone',
            bsk_amount: rewardBSK,
            destination: 'withdrawable',
            status: 'settled',
            my_badge_at_event: sponsorBadge?.current_badge,
            created_at: new Date().toISOString()
          });

        if (commissionError) {
          console.error('Error inserting commission:', commissionError);
        }

        // Mark milestone as claimed
        const { error: claimInsertError } = await supabaseClient
          .from('user_vip_milestone_claims')
          .insert({
            user_id: sponsor_id,
            milestone_id: milestone.id,
            vip_count_at_claim: vipCount,
            bsk_rewarded: rewardBSK,
            claimed_at: new Date().toISOString()
          });

        if (claimInsertError) {
          console.error('Error marking claim:', claimInsertError);
        }

        // Insert ledger entry
        await supabaseClient
          .from('bonus_ledger')
          .insert({
            user_id: sponsor_id,
            type: 'vip_milestone',
            amount_bsk: rewardBSK,
            asset: 'BSK',
            meta_json: {
              milestone_id: milestone.id,
              vip_count: vipCount,
              required_count: milestone.vip_count_required,
              timestamp: new Date().toISOString()
            },
            usd_value: 0
          });

        milestonesAchieved.push({
          vip_count_required: milestone.vip_count_required,
          bsk_rewarded: rewardBSK
        });
        totalBSKRewarded += rewardBSK;
      }
    }

    if (milestonesAchieved.length > 0) {
      console.log(`🎉 ${milestonesAchieved.length} milestone(s) achieved! Total: ${totalBSKRewarded} BSK`);
    } else {
      console.log('✓ No new milestones achieved');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        current_vip_count: vipCount,
        milestones_achieved: milestonesAchieved,
        total_bsk_rewarded: totalBSKRewarded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('VIP milestone processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
