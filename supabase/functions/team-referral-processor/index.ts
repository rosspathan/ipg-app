import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BadgePurchaseEvent {
  userId: string;
  badgeName: string;
  previousBadge?: string;
  inrAmount: number;
  isUpgrade: boolean;
  paymentRef?: string;
}

interface ReferralRelationship {
  referrer_id: string;
  referee_id: string;
  level?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, data } = await req.json();
    console.log('🔄 Processing team referral event:', { eventType, userId: data?.userId });

    if (eventType === 'badge_purchase') {
      return await processBadgePurchase(data as BadgePurchaseEvent);
    }

    return new Response(
      JSON.stringify({ error: 'Unknown event type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Team referral processor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processBadgePurchase(event: BadgePurchaseEvent): Promise<Response> {
  const { userId, badgeName, previousBadge, inrAmount, isUpgrade, paymentRef } = event;
  
  console.log('💎 Processing badge purchase:', { userId, badgeName, inrAmount, isUpgrade });

  try {
    // Get team referral settings
    const { data: settings } = await supabase
      .from('team_referral_settings')
      .select('*')
      .single();

    if (!settings?.enabled) {
      console.log('⚠️ Team referral program is disabled');
      return new Response(
        JSON.stringify({ success: false, reason: 'Program disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get BSK rate
    const bskRate = settings.bsk_inr_rate;

    // Record badge purchase
    const { data: badgePurchase, error: purchaseError } = await supabase
      .from('badge_purchases')
      .insert({
        user_id: userId,
        badge_name: badgeName,
        previous_badge: previousBadge,
        inr_amount: inrAmount,
        bsk_amount: inrAmount / bskRate,
        bsk_rate_at_purchase: bskRate,
        is_upgrade: isUpgrade,
        payment_ref: paymentRef,
        status: 'completed'
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('❌ Failed to record badge purchase:', purchaseError);
      throw purchaseError;
    }

    // Update user badge status
    await supabase
      .from('user_badge_status')
      .upsert({
        user_id: userId,
        current_badge: badgeName,
        total_ipg_contributed: inrAmount,
        achieved_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    // Check if user became VIP - award self bonus
    if (badgeName === 'VIP i-SMART') {
      const { data: badgeThreshold } = await supabase
        .from('badge_thresholds')
        .select('vip_bonus_inr')
        .eq('badge_name', 'VIP i-SMART')
        .single();

      if (badgeThreshold?.vip_bonus_inr > 0) {
        await supabase
          .from('referral_ledger')
          .insert({
            user_id: userId,
            source_user_id: userId,
            ledger_type: 'vip_self_bonus',
            trigger_type: 'badge_purchase_or_upgrade',
            inr_amount_snapshot: badgeThreshold.vip_bonus_inr,
            bsk_rate_snapshot: bskRate,
            bsk_amount: badgeThreshold.vip_bonus_inr / bskRate,
            status: 'settled',
            settled_at: new Date().toISOString(),
            notes: 'VIP i-SMART self bonus'
          });
        
        console.log('🎉 VIP self bonus awarded:', badgeThreshold.vip_bonus_inr);
      }
    }

    // Process direct referrer 10% bonus
    const { data: referrerData } = await supabase
      .from('referral_relationships')
      .select('referrer_id')
      .eq('referee_id', userId)
      .single();

    if (referrerData?.referrer_id) {
      const directBonusAmount = inrAmount * (settings.direct_referral_percent / 100);
      
      await supabase
        .from('referral_ledger')
        .insert({
          user_id: referrerData.referrer_id,
          source_user_id: userId,
          referrer_id: referrerData.referrer_id,
          ledger_type: 'direct_badge_bonus',
          depth: 1,
          badge_at_event: badgeName,
          trigger_type: 'badge_purchase_or_upgrade',
          inr_amount_snapshot: directBonusAmount,
          bsk_rate_snapshot: bskRate,
          bsk_amount: directBonusAmount / bskRate,
          status: 'pending',
          notes: `10% direct bonus for ${badgeName} badge purchase`
        });

      console.log('💰 Direct referrer bonus recorded:', directBonusAmount);

      // Update VIP milestone progress if applicable
      if (badgeName === 'VIP i-SMART') {
        await updateVIPMilestoneProgress(referrerData.referrer_id);
      }
    }

    // Process team income rewards if trigger matches
    if (settings.trigger_event === 'badge_purchase_or_upgrade') {
      await processTeamIncomeRewards(userId, badgeName, bskRate);
    }

    return new Response(
      JSON.stringify({
        success: true,
        badgePurchaseId: badgePurchase.id,
        message: 'Badge purchase and referral rewards processed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Badge purchase processing failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processTeamIncomeRewards(userId: string, badgeName: string, bskRate: number) {
  console.log('👥 Processing team income rewards for:', userId);

  // Get all upline referrers with levels
  const uplineReferrers = await getUplineReferrers(userId, 50);
  
  // Get team income level rewards
  const { data: levelRewards } = await supabase
    .from('team_income_levels')
    .select('*')
    .eq('is_active', true)
    .order('level');

  if (!levelRewards) return;

  for (const upline of uplineReferrers) {
    const levelReward = levelRewards.find(r => r.level === upline.level);
    if (!levelReward || levelReward.bsk_reward <= 0) continue;

    // Get upline user's badge to check unlock levels
    const { data: uplineBadge } = await supabase
      .from('user_badge_status')
      .select('current_badge')
      .eq('user_id', upline.referrer_id)
      .single();

    // Get badge unlock levels
    const { data: badgeThreshold } = await supabase
      .from('badge_thresholds')
      .select('unlock_levels')
      .eq('badge_name', uplineBadge?.current_badge || 'None')
      .single();

    const unlockedLevels = badgeThreshold?.unlock_levels || 0;
    
    if (upline.level > unlockedLevels) {
      // Create locked entry
      await supabase
        .from('referral_ledger')
        .insert({
          user_id: upline.referrer_id,
          source_user_id: userId,
          ledger_type: 'team_income',
          depth: upline.level,
          badge_at_event: badgeName,
          trigger_type: 'badge_purchase_or_upgrade',
          inr_amount_snapshot: levelReward.bsk_reward * bskRate,
          bsk_rate_snapshot: bskRate,
          bsk_amount: levelReward.bsk_reward,
          status: 'void',
          notes: `Locked by badge level - user has ${uplineBadge?.current_badge || 'None'} (unlocks ${unlockedLevels} levels)`
        });
      continue;
    }

    // Award team income
    await supabase
      .from('referral_ledger')
      .insert({
        user_id: upline.referrer_id,
        source_user_id: userId,
        ledger_type: 'team_income',
        depth: upline.level,
        badge_at_event: badgeName,
        trigger_type: 'badge_purchase_or_upgrade',
        inr_amount_snapshot: levelReward.bsk_reward * bskRate,
        bsk_rate_snapshot: bskRate,
        bsk_amount: levelReward.bsk_reward,
        status: 'pending',
        notes: `L${upline.level} team income for ${badgeName} badge purchase`
      });

    console.log(`💸 L${upline.level} team income: ${levelReward.bsk_reward} BSK to ${upline.referrer_id}`);
  }
}

async function getUplineReferrers(userId: string, maxLevels: number): Promise<Array<{referrer_id: string, level: number}>> {
  const upline: Array<{referrer_id: string, level: number}> = [];
  let currentUserId = userId;
  let level = 1;

  while (level <= maxLevels) {
    const { data } = await supabase
      .from('referral_relationships')
      .select('referrer_id')
      .eq('referee_id', currentUserId)
      .limit(1)
      .single();

    if (!data?.referrer_id) break;

    upline.push({
      referrer_id: data.referrer_id,
      level: level
    });

    currentUserId = data.referrer_id;
    level++;
  }

  return upline;
}

async function updateVIPMilestoneProgress(referrerId: string) {
  console.log('🎯 Updating VIP milestone progress for:', referrerId);

  // Count direct VIP referrals
  const { data: vipCount } = await supabase
    .from('referral_relationships')
    .select('referee_id')
    .eq('referrer_id', referrerId);

  if (!vipCount) return;

  let directVipCount = 0;
  for (const ref of vipCount) {
    const { data: badgeStatus } = await supabase
      .from('user_badge_status')
      .select('current_badge')
      .eq('user_id', ref.referee_id)
      .single();
    
    if (badgeStatus?.current_badge === 'VIP i-SMART') {
      directVipCount++;
    }
  }

  // Update milestone progress
  await supabase
    .from('user_vip_milestones')
    .upsert({
      user_id: referrerId,
      direct_vip_count: directVipCount,
      last_vip_referral_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  console.log(`📊 VIP milestone updated: ${directVipCount} direct VIPs for ${referrerId}`);
}