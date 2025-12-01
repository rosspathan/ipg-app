import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetResults {
  daily_counters_reset: number;
  old_records_deleted: number;
  subscriptions_expired: number;
  users_affected: string[];
  total_missed_earnings_bsk: number;
  completion_bonuses_paid_bsk: number;
  errors: string[];
}

/**
 * Reset daily ad view counters
 * Strategy: Delete old records (older than 7 days) for cleanup
 */
async function resetDailyCounters(supabase: any): Promise<{ count: number; deleted: number }> {
  console.log('🔄 Resetting daily ad view counters...');
  
  // Delete old records (older than 7 days for history retention)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateKey = sevenDaysAgo.toISOString().split('T')[0];
  
  const { data: deletedData, error: deleteError } = await supabase
    .from('user_daily_ad_views')
    .delete()
    .lt('date_key', dateKey)
    .select('user_id');
  
  if (deleteError) {
    console.error('❌ Error deleting old records:', deleteError);
    throw new Error(`Failed to delete old records: ${deleteError.message}`);
  }
  
  const deletedCount = deletedData?.length || 0;
  console.log(`✅ Deleted ${deletedCount} old daily view records`);
  
  // Count today's records for reporting
  const today = new Date().toISOString().split('T')[0];
  const { count, error: countError } = await supabase
    .from('user_daily_ad_views')
    .select('*', { count: 'exact', head: true })
    .eq('date_key', today);
  
  if (countError) {
    console.warn('⚠️  Error counting today records:', countError);
  }
  
  return { count: count || 0, deleted: deletedCount };
}

/**
 * Find and expire subscriptions where active_until < NOW()
 * Also process completion bonuses for users who finished all 100 days
 */
async function expireSubscriptions(supabase: any): Promise<{ count: number; userIds: string[]; missedEarnings: number; bonusesPaid: number }> {
  console.log('🔍 Finding expired subscriptions...');
  
  // Find active subscriptions that have expired
  const { data: expiredSubs, error: findError } = await supabase
    .from('ad_user_subscriptions')
    .select('id, user_id, tier_id, tier_bsk, purchased_bsk, end_date, start_date, active_until, total_earned_bsk, total_missed_days, daily_bsk, days_total')
    .eq('status', 'active')
    .lt('active_until', new Date().toISOString());
  
  if (findError) {
    console.error('❌ Error finding expired subscriptions:', findError);
    throw new Error(`Failed to find expired subscriptions: ${findError.message}`);
  }
  
  if (!expiredSubs || expiredSubs.length === 0) {
    console.log('✅ No subscriptions to expire');
    return { count: 0, userIds: [], missedEarnings: 0, bonusesPaid: 0 };
  }
  
  console.log(`📋 Found ${expiredSubs.length} expired subscriptions`);
  
  // Fetch completion bonus config
  const { data: configData } = await supabase
    .from('program_configs')
    .select('config_json')
    .eq('module_id', (await supabase.from('program_modules').select('id').eq('key', 'ad_mining').maybeSingle())?.data?.id)
    .eq('is_current', true)
    .maybeSingle();
  
  const config = configData?.config_json || {};
  const completionBonusEnabled = config.completionBonusEnabled ?? true;
  const completionBonusPercent = config.completionBonusPercent || 10;
  const completionBonusDestination = config.completionBonusDestination || 'withdrawable';
  
  console.log(`🎁 Completion bonus config: ${completionBonusEnabled ? 'enabled' : 'disabled'}, ${completionBonusPercent}%, destination: ${completionBonusDestination}`);
  
  // Calculate missed earnings and process completion bonuses
  let totalMissedEarnings = 0;
  let totalBonusesPaid = 0;
  const subscriptionIds = expiredSubs.map(sub => sub.id);
  
  for (const sub of expiredSubs) {
    const activeUntil = new Date(sub.active_until);
    const endDate = new Date(sub.end_date);
    const missedDays = Math.max(0, Math.floor((endDate.getTime() - activeUntil.getTime()) / (1000 * 60 * 60 * 24)));
    const missedEarnings = missedDays * (parseFloat(sub.daily_bsk) || 0);
    totalMissedEarnings += missedEarnings;
    
    console.log(`  - User ${sub.user_id}: ${missedDays} missed days, ${missedEarnings} BSK missed`);
    
    // Check if user completed full subscription (no missed days)
    const totalMissedDays = sub.total_missed_days || 0;
    const hasCompletedFull = totalMissedDays === 0 && missedDays === 0;
    
    if (completionBonusEnabled && hasCompletedFull) {
      const tierBsk = parseFloat(sub.purchased_bsk || sub.tier_bsk || 0);
      const bonusAmount = Math.round(tierBsk * completionBonusPercent / 100);
      
      if (bonusAmount > 0) {
        console.log(`  🎉 User ${sub.user_id} completed full ${sub.days_total} days! Bonus: ${bonusAmount} BSK`);
        
        try {
          // Credit bonus using RPC
          const { error: creditError } = await supabase.rpc('record_bsk_transaction', {
            p_user_id: sub.user_id,
            p_amount_bsk: bonusAmount,
            p_amount_inr: 0,
            p_rate_snapshot: 1,
            p_tx_type: completionBonusDestination === 'holding' ? 'holding_credit' : 'credit',
            p_tx_subtype: 'subscription_completion_bonus',
            p_reference_id: sub.id,
            p_notes: `Completion bonus for ${sub.days_total}-day subscription (${completionBonusPercent}% of ${tierBsk} BSK)`,
            p_metadata: { subscription_id: sub.id, tier_bsk: tierBsk, bonus_percent: completionBonusPercent }
          });
          
          if (creditError) {
            console.error(`❌ Failed to credit completion bonus for user ${sub.user_id}:`, creditError);
          } else {
            // Update subscription with bonus info
            await supabase
              .from('ad_user_subscriptions')
              .update({
                completion_bonus_bsk: bonusAmount,
                completion_bonus_credited_at: new Date().toISOString()
              })
              .eq('id', sub.id);
            
            // Log to bonus_ledger for audit
            await supabase
              .from('bonus_ledger')
              .insert({
                user_id: sub.user_id,
                amount_bsk: bonusAmount,
                type: 'subscription_completion_bonus',
                asset: 'BSK',
                meta_json: {
                  subscription_id: sub.id,
                  tier_bsk: tierBsk,
                  bonus_percent: completionBonusPercent,
                  days_completed: sub.days_total
                }
              });
            
            totalBonusesPaid += bonusAmount;
            console.log(`  ✅ Completion bonus credited successfully`);
          }
        } catch (error) {
          console.error(`❌ Error processing completion bonus:`, error);
        }
      }
    }
  }
  
  // Update subscriptions to expired status
  const { error: updateError } = await supabase
    .from('ad_user_subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })
    .in('id', subscriptionIds);
  
  if (updateError) {
    console.error('❌ Error updating subscriptions:', updateError);
    throw new Error(`Failed to update subscriptions: ${updateError.message}`);
  }
  
  const userIds = [...new Set(expiredSubs.map(sub => sub.user_id))];
  console.log(`✅ Expired ${expiredSubs.length} subscriptions for ${userIds.length} users`);
  console.log(`🎁 Paid ${totalBonusesPaid} BSK in completion bonuses`);
  
  return {
    count: expiredSubs.length,
    userIds,
    missedEarnings: totalMissedEarnings,
    bonusesPaid: totalBonusesPaid
  };
}

/**
 * Log the daily reset action to admin_actions_log
 */
async function logAdminAction(supabase: any, results: ResetResults): Promise<void> {
  console.log('📝 Logging admin action...');
  
  const { error } = await supabase
    .from('admin_actions_log')
    .insert({
      admin_user_id: null, // System-triggered
      action_type: 'daily_reset',
      target_table: 'ad_mining_subscriptions',
      target_id: null,
      details: {
        reset_type: 'daily_ad_mining_reset',
        date: new Date().toISOString().split('T')[0],
        subscriptions_expired: results.subscriptions_expired,
        users_affected: results.users_affected,
        daily_counters_reset: results.daily_counters_reset,
        old_records_deleted: results.old_records_deleted,
        total_missed_earnings_bsk: results.total_missed_earnings_bsk,
        errors: results.errors
      }
    });
  
  if (error) {
    console.error('❌ Error logging admin action:', error);
    // Don't throw - logging failure shouldn't break the reset
  } else {
    console.log('✅ Admin action logged successfully');
  }
}

/**
 * Main handler for daily reset
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log('🚀 Starting Ad Mining Daily Reset...');
  const startTime = Date.now();
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const results: ResetResults = {
    daily_counters_reset: 0,
    old_records_deleted: 0,
    subscriptions_expired: 0,
    users_affected: [],
    total_missed_earnings_bsk: 0,
    completion_bonuses_paid_bsk: 0,
    errors: []
  };
  
  try {
    // Step 1: Reset daily counters and cleanup old records
    try {
      const resetResult = await resetDailyCounters(supabase);
      results.daily_counters_reset = resetResult.count;
      results.old_records_deleted = resetResult.deleted;
    } catch (error) {
      const errorMsg = `Counter reset failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    }
    
    // Step 2: Expire subscriptions and process completion bonuses
    try {
      const expireResult = await expireSubscriptions(supabase);
      results.subscriptions_expired = expireResult.count;
      results.users_affected = expireResult.userIds;
      results.total_missed_earnings_bsk = expireResult.missedEarnings;
      results.completion_bonuses_paid_bsk = expireResult.bonusesPaid;
    } catch (error) {
      const errorMsg = `Subscription expiration failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    }
    
    // Step 3: Log admin action
    try {
      await logAdminAction(supabase, results);
    } catch (error) {
      console.error('⚠️  Failed to log admin action:', error.message);
      // Don't add to errors - this is non-critical
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Daily reset completed in ${executionTime}ms`);
    
    // Return summary
    const response = {
      success: results.errors.length === 0,
      reset_date: new Date().toISOString().split('T')[0],
      statistics: {
        daily_counters_reset: results.daily_counters_reset,
        old_records_deleted: results.old_records_deleted,
        subscriptions_expired: results.subscriptions_expired,
        users_affected_count: results.users_affected.length,
        total_missed_earnings_bsk: results.total_missed_earnings_bsk,
        completion_bonuses_paid_bsk: results.completion_bonuses_paid_bsk,
        errors: results.errors
      },
      execution_time_ms: executionTime
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: results.errors.length === 0 ? 200 : 207 // 207 = Multi-Status (partial success)
      }
    );
    
  } catch (error) {
    console.error('💥 Fatal error during daily reset:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        partial_results: results,
        execution_time_ms: Date.now() - startTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
