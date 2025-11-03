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
 */
async function expireSubscriptions(supabase: any): Promise<{ count: number; userIds: string[]; missedEarnings: number }> {
  console.log('🔍 Finding expired subscriptions...');
  
  // Find active subscriptions that have expired
  const { data: expiredSubs, error: findError } = await supabase
    .from('ad_user_subscriptions')
    .select('id, user_id, tier_id, end_date, active_until, total_earned_bsk, daily_bsk')
    .eq('status', 'active')
    .lt('active_until', new Date().toISOString());
  
  if (findError) {
    console.error('❌ Error finding expired subscriptions:', findError);
    throw new Error(`Failed to find expired subscriptions: ${findError.message}`);
  }
  
  if (!expiredSubs || expiredSubs.length === 0) {
    console.log('✅ No subscriptions to expire');
    return { count: 0, userIds: [], missedEarnings: 0 };
  }
  
  console.log(`📋 Found ${expiredSubs.length} expired subscriptions`);
  
  // Calculate missed earnings for each subscription
  let totalMissedEarnings = 0;
  const subscriptionIds = expiredSubs.map(sub => {
    const activeUntil = new Date(sub.active_until);
    const endDate = new Date(sub.end_date);
    const missedDays = Math.max(0, Math.floor((endDate.getTime() - activeUntil.getTime()) / (1000 * 60 * 60 * 24)));
    const missedEarnings = missedDays * (parseFloat(sub.daily_bsk) || 0);
    totalMissedEarnings += missedEarnings;
    
    console.log(`  - User ${sub.user_id}: ${missedDays} missed days, ${missedEarnings} BSK missed`);
    return sub.id;
  });
  
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
  
  return {
    count: expiredSubs.length,
    userIds,
    missedEarnings: totalMissedEarnings
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
    
    // Step 2: Expire subscriptions
    try {
      const expireResult = await expireSubscriptions(supabase);
      results.subscriptions_expired = expireResult.count;
      results.users_affected = expireResult.userIds;
      results.total_missed_earnings_bsk = expireResult.missedEarnings;
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
