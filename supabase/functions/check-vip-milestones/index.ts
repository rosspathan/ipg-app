import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIPMilestoneRequest {
  sponsor_id: string;
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

    const { sponsor_id }: VIPMilestoneRequest = await req.json();
    
    console.log('🎯 Checking VIP milestones for sponsor:', sponsor_id);

    // 1. Count VIP direct referrals (locked + have VIP badge)
    const { data: directReferrals, error: referralsError } = await supabase
      .from('referral_links_new')
      .select('user_id')
      .eq('sponsor_id', sponsor_id)
      .not('locked_at', 'is', null);

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
      throw referralsError;
    }

    if (!directReferrals || directReferrals.length === 0) {
      console.log('📭 No locked referrals found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No locked referrals',
          vip_count: 0,
          milestones_claimed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check how many of these referrals have VIP badge
    const referredUserIds = directReferrals.map(r => r.user_id);
    const { data: vipBadges, error: badgesError } = await supabase
      .from('user_badge_holdings')
      .select('user_id')
      .in('user_id', referredUserIds)
      .eq('current_badge', 'VIP');

    if (badgesError) {
      console.error('Error checking VIP badges:', badgesError);
      throw badgesError;
    }

    const vipCount = vipBadges?.length || 0;
    console.log(`📊 Sponsor has ${vipCount} VIP referrals out of ${directReferrals.length} locked referrals`);

    // Check if sponsor has VIP badge
    const { data: sponsorBadge, error: badgeError } = await supabase
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsor_id)
      .maybeSingle();

    if (badgeError || sponsorBadge?.current_badge !== 'VIP') {
      console.log('⚠️ Sponsor does not have VIP badge, skipping milestone check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sponsor must be VIP to receive milestone rewards',
          milestones_claimed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get all VIP milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('vip_milestones')
      .select('*')
      .lte('vip_count_threshold', vipCount || 0)
      .order('vip_count_threshold', { ascending: true });

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      throw milestonesError;
    }

    if (!milestones || milestones.length === 0) {
      console.log('📭 No milestones reached yet');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No milestones reached',
          vip_count: vipCount,
          milestones_claimed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check which milestones have already been claimed
    const { data: existingClaims, error: claimsError } = await supabase
      .from('user_vip_milestone_claims')
      .select('milestone_id')
      .eq('user_id', sponsor_id);

    if (claimsError) {
      console.error('Error fetching existing claims:', claimsError);
      throw claimsError;
    }

    const claimedMilestoneIds = new Set((existingClaims || []).map(c => c.milestone_id));

    // 4. Process unclaimed milestones
    const unclaimedMilestones = milestones.filter(m => !claimedMilestoneIds.has(m.id));

    console.log(`🎁 Found ${unclaimedMilestones.length} unclaimed milestones`);

    if (unclaimedMilestones.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'All milestones already claimed',
          vip_count: vipCount,
          milestones_claimed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalRewarded = 0;

    for (const milestone of unclaimedMilestones) {
      const rewardBSK = Number(milestone.reward_inr_value); // reward_inr_value stores BSK amount

      console.log(`💰 Claiming milestone: ${milestone.vip_count_threshold} VIPs → ${rewardBSK} BSK`);

      // 5. Insert claim record
      const { error: claimInsertError } = await supabase
        .from('user_vip_milestone_claims')
        .insert({
          user_id: sponsor_id,
          milestone_id: milestone.id,
          vip_count_at_claim: vipCount,
          bsk_rewarded: rewardBSK,
          claimed_at: new Date().toISOString()
        });

      if (claimInsertError) {
        console.error('Error inserting claim:', claimInsertError);
        continue; // Skip this milestone but try others
      }

      // 6. Update user BSK balance (withdrawable)
      const { data: currentBalance } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, total_earned_withdrawable')
        .eq('user_id', sponsor_id)
        .maybeSingle();

      const { error: balanceUpdateError } = await supabase
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

      // 7. Log in bonus_ledger
      await supabase
        .from('bonus_ledger')
        .insert({
          user_id: sponsor_id,
          type: 'vip_milestone',
          amount_bsk: rewardBSK,
          asset: 'BSK',
          meta_json: {
            milestone_id: milestone.id,
            vip_count_threshold: milestone.vip_count_threshold,
            vip_count_at_claim: vipCount,
            reward_type: milestone.reward_type,
            timestamp: new Date().toISOString()
          },
          usd_value: 0
        });

      totalRewarded += rewardBSK;
    }

    console.log(`✅ VIP milestone processing complete: ${totalRewarded} BSK rewarded for ${unclaimedMilestones.length} milestones`);

    return new Response(
      JSON.stringify({
        success: true,
        sponsor_id,
        vip_count: vipCount,
        milestones_claimed: unclaimedMilestones.length,
        total_rewarded_bsk: totalRewarded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('VIP milestone processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});