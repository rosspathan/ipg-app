import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  EXPONENTIAL_AT: [-20, 20],
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIPMilestoneRequest {
  sponsor_id: string;
  new_vip_referral_id: string;
}

/**
 * Normalizes badge names to handle database variations
 * "i-Smart VIP", "I-SMART VIP", "VIP" -> "VIP"
 */
function normalizeBadgeName(badge: string | null | undefined): string {
  if (!badge) return '';
  const badgeUpper = badge.toUpperCase().trim();
  if (badgeUpper.includes('VIP') || badgeUpper.includes('SMART')) {
    return 'VIP';
  }
  return badge.trim();
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
    
    console.log('💎 [VIP Milestone] Processing for sponsor:', sponsor_id);

    // 1. Check if sponsor has VIP badge (required for milestone rewards)
    const { data: sponsorBadge, error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsor_id)
      .maybeSingle();

    if (badgeError) {
      console.error('[VIP Milestone] Error fetching sponsor badge:', badgeError);
      throw badgeError;
    }

    const normalizedBadge = normalizeBadgeName(sponsorBadge?.current_badge);

    if (normalizedBadge !== 'VIP') {
      console.log('[VIP Milestone] ⚠️ Sponsor not VIP (has:', sponsorBadge?.current_badge, ')');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sponsor not VIP - not eligible',
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Count sponsor's direct (L1) VIP referrals
    const { data: directReferrals, error: referralError } = await supabaseClient
      .from('referral_tree')
      .select('user_id')
      .eq('ancestor_id', sponsor_id)
      .eq('level', 1);

    if (referralError) {
      console.error('[VIP Milestone] Error fetching referrals:', referralError);
      throw referralError;
    }

    if (!directReferrals || directReferrals.length === 0) {
      console.log('[VIP Milestone] No direct referrals found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No direct referrals',
          current_vip_count: 0,
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referralIds = directReferrals.map(r => r.user_id);

    // Count VIPs among direct referrals
    const { data: vipReferrals, error: vipError } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id, current_badge')
      .in('user_id', referralIds);

    if (vipError) {
      console.error('[VIP Milestone] Error fetching VIP badges:', vipError);
      throw vipError;
    }

    const vipCount = vipReferrals?.filter(b => 
      normalizeBadgeName(b.current_badge) === 'VIP'
    ).length || 0;

    console.log(`[VIP Milestone] 📊 Sponsor has ${vipCount} direct VIP referrals`);

    // 3. Fetch active VIP milestones from database
    const { data: milestones, error: milestoneError } = await supabaseClient
      .from('vip_milestones')
      .select('*')
      .eq('is_active', true)
      .order('vip_count_threshold', { ascending: true });

    if (milestoneError) {
      console.error('[VIP Milestone] Error fetching milestones:', milestoneError);
      throw milestoneError;
    }

    if (!milestones || milestones.length === 0) {
      console.log('[VIP Milestone] ⚠️ No active milestones configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No milestones configured',
          current_vip_count: vipCount,
          milestones_achieved: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check for newly achieved milestones
    const milestonesAchieved = [];
    let totalBSKRewarded = 0;

    for (const milestone of milestones) {
      if (vipCount >= milestone.vip_count_threshold) {
        // Check if already claimed
        const { data: existingClaim, error: claimError } = await supabaseClient
          .from('user_vip_milestone_claims')
          .select('id')
          .eq('user_id', sponsor_id)
          .eq('milestone_id', milestone.id)
          .maybeSingle();

        if (claimError && claimError.code !== 'PGRST116') {
          console.error('[VIP Milestone] Error checking claim:', claimError);
          continue;
        }

        if (existingClaim) {
          console.log(`[VIP Milestone] ✓ ${milestone.vip_count_threshold} VIPs already claimed`);
          continue;
        }

        // NEW MILESTONE ACHIEVED! 🎉
        const rewardBSKBN = new BigNumber(milestone.reward_inr_value);
        const rewardBSK = rewardBSKBN.toNumber();
        console.log(`[VIP Milestone] 🎉 NEW! ${milestone.vip_count_threshold} VIPs → ${rewardBSK} BSK`);

        // Get current balance
        const { data: currentBalance } = await supabaseClient
          .from('user_bsk_balances')
          .select('withdrawable_balance, total_earned_withdrawable')
          .eq('user_id', sponsor_id)
          .maybeSingle();

        // Credit withdrawable balance with BigNumber precision
        const newWithdrawable = new BigNumber(currentBalance?.withdrawable_balance || 0).plus(rewardBSK);
        const newTotalEarned = new BigNumber(currentBalance?.total_earned_withdrawable || 0).plus(rewardBSK);

        const { error: balanceUpdateError } = await supabaseClient
          .from('user_bsk_balances')
          .upsert({
            user_id: sponsor_id,
            withdrawable_balance: newWithdrawable.toNumber(),
            total_earned_withdrawable: newTotalEarned.toNumber(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (balanceUpdateError) {
          console.error('[VIP Milestone] ❌ Balance update failed:', balanceUpdateError);
          continue;
        }

        // Insert commission record
        await supabaseClient
          .from('referral_commissions')
          .insert({
            earner_id: sponsor_id,
            payer_id: null,
            level: 0, // Special level for milestones
            event_type: `vip_milestone_${milestone.vip_count_threshold}`,
            commission_type: 'vip_milestone',
            bsk_amount: rewardBSK,
            destination: 'withdrawable',
            status: 'settled',
            my_badge_at_event: 'VIP',
            created_at: new Date().toISOString()
          });

        // Mark milestone as claimed
        await supabaseClient
          .from('user_vip_milestone_claims')
          .insert({
            user_id: sponsor_id,
            milestone_id: milestone.id,
            vip_count_at_claim: vipCount,
            bsk_rewarded: rewardBSK,
            claimed_at: new Date().toISOString()
          });

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
              required_count: milestone.vip_count_threshold,
              milestone_description: milestone.reward_description,
              timestamp: new Date().toISOString()
            },
            usd_value: 0
          });

        milestonesAchieved.push({
          vip_count_required: milestone.vip_count_threshold,
          bsk_rewarded: rewardBSK,
          description: milestone.reward_description
        });
        totalBSKRewarded += rewardBSK;
      }
    }

    if (milestonesAchieved.length > 0) {
      console.log(`[VIP Milestone] 🎉 ${milestonesAchieved.length} achieved! Total: ${totalBSKRewarded} BSK`);
    } else {
      console.log('[VIP Milestone] ✓ No new milestones');
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
    console.error('[VIP Milestone] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
