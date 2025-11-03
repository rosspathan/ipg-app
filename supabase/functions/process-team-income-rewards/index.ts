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

interface TeamIncomeRequest {
  payer_id: string;
  event_type: string;
  event_id: string;
  badge_name: string;
  payment_amount: number;
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

    const { payer_id, event_type, event_id, badge_name, payment_amount }: TeamIncomeRequest = await req.json();
    
    console.log('🌳 Processing 50-level team income rewards:', { payer_id, event_type, badge_name });

    // 1. Get full upline path (up to 50 levels)
    const { data: uplineData, error: uplineError } = await supabaseClient
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', payer_id)
      .lte('level', 50)
      .order('level', { ascending: true });

    if (uplineError) {
      console.error('Error fetching upline:', uplineError);
      throw uplineError;
    }

    if (!uplineData || uplineData.length === 0) {
      console.log('⚠️ No upline found for user, skipping team income distribution');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No upline found',
          total_distributed: 0,
          levels_paid: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get team income configuration for all 50 levels
    const { data: teamIncomeConfig, error: configError } = await supabaseClient
      .from('team_income_levels')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (configError || !teamIncomeConfig) {
      console.error('Error fetching team income config:', configError);
      throw new Error('Failed to fetch team income configuration');
    }

    // Create config map for quick lookup
    const configMap = new Map(teamIncomeConfig.map(c => [c.level, c]));

    // 3. Get all sponsor IDs to batch fetch their badges
    const sponsorIds = uplineData.map(u => u.ancestor_id);
    const { data: badgeData, error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id, current_badge')
      .in('user_id', sponsorIds);

    if (badgeError) {
      console.error('Error fetching badges:', badgeError);
      throw badgeError;
    }

    // Create badge lookup map
    const badgeMap = new Map(badgeData?.map(b => [b.user_id, b.current_badge]) || []);

    // 4. Get badge unlock levels from badge_thresholds
    const { data: badgeThresholds, error: thresholdError } = await supabaseClient
      .from('badge_thresholds')
      .select('badge_name, unlock_levels')
      .eq('is_active', true);

    if (thresholdError) {
      console.error('Error fetching badge thresholds:', thresholdError);
      throw thresholdError;
    }

    // Create unlock levels map
    const unlockLevelsMap = new Map(
      badgeThresholds?.map(t => [t.badge_name, t.unlock_levels]) || []
    );

    // 5. Process each level and prepare commission records
    const commissionsToInsert = [];
    const balanceUpdates = new Map<string, { withdrawable: number; holding: number }>();
    const ledgerEntries = [];
    let totalDistributed = 0;
    let levelsPaid = 0;

    for (const upline of uplineData) {
      const level = upline.level;
      const sponsorId = upline.ancestor_id;
      const config = configMap.get(level);

      if (!config) {
        console.log(`⚠️ No config found for level ${level}, skipping`);
        continue;
      }

      // CRITICAL: Check if sponsor has unlocked this level
      // Fetch sponsor's KYC approval status
      const { data: sponsorProfile } = await supabaseClient
        .from('profiles')
        .select('is_kyc_approved')
        .eq('user_id', sponsorId)
        .single();

      const isKYCApproved = sponsorProfile?.is_kyc_approved || false;
      const sponsorBadge = badgeMap.get(sponsorId);
      const badgeUnlockLevels = sponsorBadge ? (unlockLevelsMap.get(sponsorBadge) || 0) : 0;

      // Determine effective unlock levels
      let effectiveUnlockLevels = badgeUnlockLevels;

      // L1 is unlocked ONLY if KYC approved (even without badge purchase)
      if (level === 1 && isKYCApproved) {
        effectiveUnlockLevels = Math.max(effectiveUnlockLevels, 1);
      }

      // Check if this level is unlocked
      if (level > effectiveUnlockLevels) {
        console.log(`🔒 Level ${level} locked for sponsor ${sponsorId} (KYC: ${isKYCApproved}, Badge: ${sponsorBadge}, Effective Unlocks: ${effectiveUnlockLevels})`);
        continue; // Skip this level - sponsor hasn't unlocked it
      }

      console.log(`✅ Level ${level} unlocked for sponsor ${sponsorId} (KYC: ${isKYCApproved}, Badge: ${sponsorBadge || 'None'}, Effective Unlocks: ${effectiveUnlockLevels})`);

      const rewardAmountBN = new BigNumber(config.bsk_reward);
      const destination = config.balance_type || 'withdrawable';

      if (rewardAmountBN.lte(0)) {
        continue;
      }

      const rewardAmount = rewardAmountBN.toNumber();
      console.log(`✅ Level ${level}: Paying ${rewardAmount} BSK to ${sponsorId} (${destination})`);

      // Generate idempotency key to prevent duplicates
      const idempotencyKey = `team_income_${event_id}_${sponsorId}_L${level}`;

      // Prepare commission record with idempotency
      commissionsToInsert.push({
        earner_id: sponsorId,
        payer_id: payer_id,
        level: level,
        event_type: event_type,
        event_id: event_id,
        commission_type: 'team_income',
        bsk_amount: rewardAmount,
        destination: destination,
        status: 'settled',
        earner_badge_at_event: sponsorBadge || null,
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString()
      });

      // Prepare balance update with BigNumber precision
      if (!balanceUpdates.has(sponsorId)) {
        balanceUpdates.set(sponsorId, { withdrawable: new BigNumber(0), holding: new BigNumber(0) });
      }
      const balanceUpdate = balanceUpdates.get(sponsorId)!;
      if (destination === 'withdrawable') {
        balanceUpdate.withdrawable = balanceUpdate.withdrawable.plus(rewardAmount);
      } else {
        balanceUpdate.holding = balanceUpdate.holding.plus(rewardAmount);
      }

      // Prepare ledger entry
      ledgerEntries.push({
        user_id: sponsorId,
        type: 'team_income',
        amount_bsk: rewardAmount,
        asset: 'BSK',
        meta_json: {
          level: level,
          payer_id: payer_id,
          payer_badge: badge_name,
          event_type: event_type,
          destination: destination,
          timestamp: new Date().toISOString()
        },
        usd_value: 0
      });

      totalDistributed += rewardAmount;
      levelsPaid++;
    }

    // 6. Batch insert commission records
    if (commissionsToInsert.length > 0) {
      const { error: commissionInsertError } = await supabaseClient
        .from('referral_commissions')
        .insert(commissionsToInsert);

      if (commissionInsertError) {
        console.error('Error inserting commissions:', commissionInsertError);
        throw commissionInsertError;
      }
      console.log(`✅ Inserted ${commissionsToInsert.length} commission records`);
    }

    // 7. Batch update balances with BigNumber precision
    for (const [userId, updates] of balanceUpdates.entries()) {
      // Get current balance
      const { data: currentBalance } = await supabaseClient
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding')
        .eq('user_id', userId)
        .maybeSingle();

      // Calculate new balances with BigNumber
      const newWithdrawable = new BigNumber(currentBalance?.withdrawable_balance || 0).plus(updates.withdrawable);
      const newHolding = new BigNumber(currentBalance?.holding_balance || 0).plus(updates.holding);
      const newTotalWithdrawable = new BigNumber(currentBalance?.total_earned_withdrawable || 0).plus(updates.withdrawable);
      const newTotalHolding = new BigNumber(currentBalance?.total_earned_holding || 0).plus(updates.holding);

      // Update balance
      const { error: balanceUpdateError } = await supabaseClient
        .from('user_bsk_balances')
        .upsert({
          user_id: userId,
          withdrawable_balance: newWithdrawable.toNumber(),
          holding_balance: newHolding.toNumber(),
          total_earned_withdrawable: newTotalWithdrawable.toNumber(),
          total_earned_holding: newTotalHolding.toNumber(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (balanceUpdateError) {
        console.error(`Error updating balance for ${userId}:`, balanceUpdateError);
      }
    }
    console.log(`✅ Updated balances for ${balanceUpdates.size} users`);

    // 8. Batch insert ledger entries
    if (ledgerEntries.length > 0) {
      const { error: ledgerInsertError } = await supabaseClient
        .from('bonus_ledger')
        .insert(ledgerEntries);

      if (ledgerInsertError) {
        console.error('Error inserting ledger entries:', ledgerInsertError);
      }
      console.log(`✅ Inserted ${ledgerEntries.length} ledger entries`);
    }

    console.log(`🎉 Team income distribution complete: ${totalDistributed} BSK across ${levelsPaid} levels`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total_distributed: totalDistributed,
        levels_paid: levelsPaid,
        sponsors_credited: balanceUpdates.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Team income processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
