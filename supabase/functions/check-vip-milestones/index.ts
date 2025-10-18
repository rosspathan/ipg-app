import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIPMilestoneRequest {
  referrer_id: string; // User who has VIP badge
  new_vip_referee_id?: string; // Optional: the new VIP user they just referred
}

const MILESTONES = [
  { count: 10, reward: 10000 },
  { count: 50, reward: 50000 },
  { count: 100, reward: 100000 },
  { count: 250, reward: 200000 },
  { count: 500, reward: 500000 }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { referrer_id, new_vip_referee_id } = await req.json() as VIPMilestoneRequest;

    console.log(`Checking VIP milestones for referrer: ${referrer_id}`);

    // CRITICAL CHECK: Does referrer have VIP badge?
    const { data: referrerBadge, error: badgeError } = await supabase
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', referrer_id)
      .maybeSingle();

    if (badgeError) {
      throw new Error(`Failed to fetch referrer badge: ${badgeError.message}`);
    }

    if (!referrerBadge || referrerBadge.current_badge !== 'VIP') {
      console.log('Referrer does not have VIP badge - no milestone bonus');
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'vip_badge_required',
          message: 'Only VIP badge holders can earn milestone bonuses'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get/create referrer's vip_milestone_tracker record
    let { data: tracker, error: trackerError } = await supabase
      .from('vip_milestone_tracker')
      .select('*')
      .eq('user_id', referrer_id)
      .maybeSingle();

    if (trackerError && trackerError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch milestone tracker: ${trackerError.message}`);
    }

    // If no tracker exists, this is the first time user has VIP badge
    // Tracker should have been created when they got VIP badge, but create if missing
    if (!tracker) {
      console.log('Creating new milestone tracker for user');
      const { data: newTracker, error: createError } = await supabase
        .from('vip_milestone_tracker')
        .insert({
          user_id: referrer_id,
          vip_badge_acquired_at: new Date().toISOString(),
          direct_vip_count_after_vip: 0
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create milestone tracker: ${createError.message}`);
      }

      tracker = newTracker;
    }

    const vipBadgeAcquiredAt = new Date(tracker.vip_badge_acquired_at);

    // Count direct VIP referrals WHERE:
    // - Referred user has VIP badge
    // - Referred user's VIP purchase date > referrer's vip_badge_acquired_at
    const { data: directReferrals, error: referralsError } = await supabase
      .from('referral_tree')
      .select('user_id')
      .eq('ancestor_id', referrer_id)
      .eq('level', 1);

    if (referralsError) {
      throw new Error(`Failed to fetch direct referrals: ${referralsError.message}`);
    }

    if (!directReferrals || directReferrals.length === 0) {
      console.log('No direct referrals found');
      return new Response(
        JSON.stringify({
          success: true,
          vip_count: 0,
          milestones_awarded: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referralUserIds = directReferrals.map(r => r.user_id);

    // Get VIP badge purchases for these referrals that happened AFTER referrer got VIP
    const { data: vipPurchases, error: purchasesError } = await supabase
      .from('badge_purchases')
      .select('user_id, created_at')
      .eq('badge_name', 'VIP')
      .in('user_id', referralUserIds)
      .gt('created_at', vipBadgeAcquiredAt.toISOString());

    if (purchasesError) {
      throw new Error(`Failed to fetch VIP purchases: ${purchasesError.message}`);
    }

    const vipCount = vipPurchases?.length || 0;

    console.log(`Found ${vipCount} VIP referrals after user acquired VIP badge`);

    // Update tracker with new count
    await supabase
      .from('vip_milestone_tracker')
      .update({
        direct_vip_count_after_vip: vipCount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', referrer_id);

    // Check for unclaimed milestones
    const milestonesAwarded: any[] = [];

    for (const milestone of MILESTONES) {
      const { count, reward } = milestone;
      const claimedField = `milestone_${count}_claimed` as keyof typeof tracker;
      const claimedAtField = `milestone_${count}_claimed_at` as keyof typeof tracker;

      if (vipCount >= count && !tracker[claimedField]) {
        console.log(`Awarding ${count} VIP milestone: ${reward} BSK`);

        // Credit withdrawable balance
        const { data: existingBalance } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance, total_earned_withdrawable')
          .eq('user_id', referrer_id)
          .maybeSingle();

        if (existingBalance) {
          await supabase
            .from('user_bsk_balances')
            .update({
              withdrawable_balance: Number(existingBalance.withdrawable_balance) + reward,
              total_earned_withdrawable: Number(existingBalance.total_earned_withdrawable) + reward
            })
            .eq('user_id', referrer_id);
        } else {
          await supabase
            .from('user_bsk_balances')
            .insert({
              user_id: referrer_id,
              withdrawable_balance: reward,
              total_earned_withdrawable: reward
            });
        }

        // Mark milestone as claimed
        const updateData: any = {
          [claimedField]: true,
          [claimedAtField]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await supabase
          .from('vip_milestone_tracker')
          .update(updateData)
          .eq('user_id', referrer_id);

        // Insert into bonus_ledger
        await supabase.from('bonus_ledger').insert({
          user_id: referrer_id,
          type: 'vip_milestone',
          amount_bsk: reward,
          meta_json: {
            milestone_count: count,
            vip_referrals: vipCount
          }
        });

        milestonesAwarded.push({
          milestone: count,
          reward,
          claimed_at: new Date().toISOString()
        });
      }
    }

    console.log(`Awarded ${milestonesAwarded.length} milestone(s) to ${referrer_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        referrer_id,
        vip_count: vipCount,
        milestones_awarded: milestonesAwarded,
        next_milestone: MILESTONES.find(m => vipCount < m.count)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error checking VIP milestones:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
