/**
 * Admin Cleanup Trading Ledger Edge Function
 * 
 * Cleans up polluted wallet_balances that were incorrectly credited
 * from the old sync-onchain-to-trading model.
 * 
 * In the new custodial model:
 * - wallet_balances should ONLY contain funds deposited to the hot wallet
 * - This function wipes balances for users without legitimate custodial deposits
 * 
 * ADMIN ONLY - requires admin role check
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  dry_run?: boolean;  // If true, only report what would be deleted
  preserve_user_ids?: string[];  // User IDs to preserve (e.g., market maker)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-cleanup-trading-ledger] Admin ${user.id} initiated cleanup`);

    const body: CleanupRequest = await req.json().catch(() => ({}));
    const dryRun = body.dry_run ?? true; // Default to dry run for safety
    const preserveUserIds = body.preserve_user_ids || [];

    // Get market maker user ID from settings
    const { data: engineSettings } = await adminClient
      .from('trading_engine_settings')
      .select('market_maker_user_id')
      .limit(1)
      .single();

    const marketMakerId = engineSettings?.market_maker_user_id;
    if (marketMakerId) {
      preserveUserIds.push(marketMakerId);
    }

    console.log(`[admin-cleanup-trading-ledger] Preserving user IDs: ${preserveUserIds.join(', ')}`);
    console.log(`[admin-cleanup-trading-ledger] Dry run: ${dryRun}`);

    // Get users with custodial deposits (legitimate balances)
    const { data: depositedUsers } = await adminClient
      .from('custodial_deposits')
      .select('user_id')
      .eq('status', 'credited');

    const usersWithDeposits = new Set(
      (depositedUsers || []).map((d: any) => d.user_id)
    );

    console.log(`[admin-cleanup-trading-ledger] Users with legitimate deposits: ${usersWithDeposits.size}`);

    // Get all wallet_balances that should be cleaned
    const { data: allBalances, error: balanceError } = await adminClient
      .from('wallet_balances')
      .select('id, user_id, asset_id, available, locked, total')
      .gt('total', 0);

    if (balanceError) {
      throw new Error(`Failed to fetch balances: ${balanceError.message}`);
    }

    // Identify balances to clean (not in preserve list and not in deposited users)
    const toClean = (allBalances || []).filter((b: any) => {
      if (preserveUserIds.includes(b.user_id)) return false;
      if (usersWithDeposits.has(b.user_id)) return false;
      return true;
    });

    console.log(`[admin-cleanup-trading-ledger] Balances to clean: ${toClean.length}`);

    // Get unique users to clean
    const usersToClean = [...new Set(toClean.map((b: any) => b.user_id))];
    console.log(`[admin-cleanup-trading-ledger] Users to clean: ${usersToClean.length}`);

    // Get open orders for users to clean
    const { data: openOrders } = await adminClient
      .from('orders')
      .select('id, user_id, symbol')
      .in('user_id', usersToClean)
      .in('status', ['pending', 'partially_filled']);

    console.log(`[admin-cleanup-trading-ledger] Open orders to cancel: ${openOrders?.length || 0}`);

    if (dryRun) {
      // Report what would happen
      const summary = {
        balances_to_delete: toClean.length,
        users_affected: usersToClean.length,
        orders_to_cancel: openOrders?.length || 0,
        total_available_to_wipe: toClean.reduce((sum: number, b: any) => sum + (b.available || 0), 0),
        total_locked_to_wipe: toClean.reduce((sum: number, b: any) => sum + (b.locked || 0), 0),
        preserved_user_ids: preserveUserIds,
        users_with_deposits: usersWithDeposits.size,
        sample_balances: toClean.slice(0, 10).map((b: any) => ({
          user_id: b.user_id,
          available: b.available,
          locked: b.locked
        }))
      };

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: 'Dry run completed. No changes made.',
          summary
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actually perform cleanup
    let cancelledOrders = 0;
    let deletedBalances = 0;

    // 1. Cancel open orders for affected users
    for (const order of (openOrders || [])) {
      const { error: cancelError } = await adminClient
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Trading ledger cleanup - balance reset'
        })
        .eq('id', order.id);

      if (!cancelError) {
        cancelledOrders++;
      }
    }

    console.log(`[admin-cleanup-trading-ledger] Cancelled ${cancelledOrders} orders`);

    // 2. Delete wallet_balances for affected users
    for (const balance of toClean) {
      const { error: deleteError } = await adminClient
        .from('wallet_balances')
        .delete()
        .eq('id', balance.id);

      if (!deleteError) {
        deletedBalances++;
      }
    }

    console.log(`[admin-cleanup-trading-ledger] Deleted ${deletedBalances} balance records`);

    // 3. Log the cleanup action
    await adminClient
      .from('admin_actions_log')
      .insert({
        admin_user_id: user.id,
        action_type: 'trading_ledger_cleanup',
        details: {
          balances_deleted: deletedBalances,
          orders_cancelled: cancelledOrders,
          users_affected: usersToClean.length,
          preserved_user_ids: preserveUserIds
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: false,
        message: 'Trading ledger cleanup completed',
        results: {
          balances_deleted: deletedBalances,
          orders_cancelled: cancelledOrders,
          users_affected: usersToClean.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[admin-cleanup-trading-ledger] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
