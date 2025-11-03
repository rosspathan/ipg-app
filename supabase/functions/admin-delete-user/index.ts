import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  user_id?: string;
  email?: string;
  confirm?: string;
  confirmForce?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) {
      throw new Error('Not authenticated');
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      throw new Error('Only admins can delete users');
    }

    const { user_id, email, confirm, confirmForce = false }: DeleteUserRequest = await req.json();

    // Safety check - require confirmation
    if (confirm !== 'DELETE') {
      throw new Error('Invalid confirmation. Type DELETE to confirm.');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🗑️ Starting user deletion...');
    let targetUserId = user_id;

    // Resolve user ID from email if needed
    if (!targetUserId && email) {
      console.log(`🔍 Looking up user by email: ${email}`);
      const list = await supabaseAdmin.auth.admin.listUsers();
      const users = (list as any).users || [];
      const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) {
        targetUserId = found.id;
        console.log(`✅ Found user: ${targetUserId}`);
      } else {
        throw new Error(`User not found with email: ${email}`);
      }
    }

    if (!targetUserId) {
      throw new Error('user_id or email is required');
    }

    // Get all admin user_ids to protect them
    const { data: adminUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = [...new Set([...(adminUsers?.map(a => a.user_id) || []), callingUser.id])];

    // Check if target is admin
    if (adminIds.includes(targetUserId) && !confirmForce) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This user has admin role. To delete an admin user, set confirmForce to true.',
          isAdmin: true,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const results = {
      success: true,
      deletedAuthUser: false,
      deletedProfile: false,
      tablesCleared: [] as string[],
      errors: [] as string[],
    };

    console.log(`🗑️ Deleting all data for user: ${targetUserId}`);

    // Delete all user-linked data (COMPREHENSIVE LIST)
    const tablesToClean = [
      // Core user data
      { name: 'referral_tree', column: 'user_id' },
      { name: 'referral_tree', column: 'referred_by' },
      { name: 'user_roles', column: 'user_id' },
      { name: 'referral_links_new', column: 'user_id' },
      { name: 'kyc_profiles_new', column: 'user_id' },
      { name: 'kyc_submissions_simple', column: 'user_id' },
      
      // Badge system
      { name: 'badge_purchases', column: 'user_id' },
      { name: 'badge_purchase_events', column: 'user_id' },
      { name: 'badge_qualification_events', column: 'user_id' },
      { name: 'user_badge_holdings', column: 'user_id' },
      { name: 'user_badge_status', column: 'user_id' },
      { name: 'user_bsk_holdings', column: 'user_id' },
      { name: 'badge_holdings', column: 'user_id' },
      
      // Commissions & earnings
      { name: 'commission_payouts', column: 'user_id' },
      { name: 'commission_audit_log', column: 'user_id' },
      { name: 'referral_commissions', column: 'user_id' },
      { name: 'team_income_ledger', column: 'user_id' },
      { name: 'direct_referrer_rewards', column: 'user_id' },
      { name: 'referral_balance_slabs', column: 'user_id' },
      
      // BSK ledgers & balances
      { name: 'user_bsk_balances', column: 'user_id' },
      { name: 'bsk_withdrawable_ledger', column: 'user_id' },
      { name: 'bsk_holding_ledger', column: 'user_id' },
      { name: 'bsk_bonus_ledger', column: 'user_id' },
      { name: 'bsk_loan_ledger', column: 'user_id' },
      { name: 'admin_fees_ledger', column: 'user_id' },
      { name: 'inr_balance_ledger', column: 'user_id' },
      { name: 'insurance_bsk_ledger', column: 'user_id' },
      { name: 'insurance_bsk_policies', column: 'user_id' },
      
      // BSK transfers
      { name: 'bsk_transfers', column: 'sender_id' },
      { name: 'bsk_transfers', column: 'receiver_id' },
      { name: 'unified_bsk_transactions', column: 'user_id' },
      
      // Legacy ledgers
      { name: 'referral_ledger', column: 'user_id' },
      { name: 'bonus_ledger', column: 'user_id' },
      
      // VIP & milestones
      { name: 'user_vip_milestone_claims', column: 'user_id' },
      { name: 'vip_activity_log', column: 'user_id' },
      
      // Wallet & trading
      { name: 'wallet_balances', column: 'user_id' },
      { name: 'orders', column: 'user_id' },
      { name: 'trades', column: 'buyer_id' },
      { name: 'trades', column: 'seller_id' },
      
      // Withdrawals & deposits
      { name: 'withdrawals', column: 'user_id' },
      { name: 'deposits', column: 'user_id' },
      { name: 'fiat_deposits', column: 'user_id' },
      
      // Programs & activities
      { name: 'ad_clicks', column: 'user_id' },
      { name: 'referral_events', column: 'user_id' },
      { name: 'spin_results', column: 'user_id' },
      { name: 'lucky_draw_tickets', column: 'user_id' },
      { name: 'user_program_participations', column: 'user_id' },
      { name: 'bsk_vesting_releases', column: 'user_id' },
    ];

    // Delete from all tables
    const deletePromises = tablesToClean.map(({ name, column }) =>
      supabaseAdmin.from(name).delete().eq(column, targetUserId)
        .then(() => {
          results.tablesCleared.push(`${name}(${column})`);
          console.log(`✅ Deleted from ${name} where ${column}=${targetUserId}`);
        })
        .catch(err => {
          const msg = err.message || String(err);
          if (!msg.includes('not found')) {
            results.errors.push(`${name}: ${msg}`);
            console.warn(`⚠️ Error deleting from ${name}:`, msg);
          }
        })
    );

    await Promise.all(deletePromises);

    // Delete profile
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', targetUserId);

      if (profileError) {
        if (!profileError.message.includes('not found')) {
          results.errors.push(`Profile deletion: ${profileError.message}`);
        }
      } else {
        results.deletedProfile = true;
        console.log('✅ Profile deleted');
      }
    } catch (err: any) {
      results.errors.push(`Profile deletion: ${err.message}`);
    }

    // Delete auth user
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authError) {
        if (authError.message?.includes('not found') || (authError as any).status === 404) {
          console.log('ℹ️ Auth user not found (already deleted)');
        } else {
          results.errors.push(`Auth deletion: ${authError.message}`);
          console.error('❌ Auth user deletion failed:', authError);
        }
      } else {
        results.deletedAuthUser = true;
        console.log('✅ Auth user deleted');
      }
    } catch (err: any) {
      results.errors.push(`Auth deletion: ${err.message}`);
    }

    // Create audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: callingUser.id,
      action: 'force_delete_user',
      resource_type: 'user',
      resource_id: targetUserId,
      new_values: {
        deletedAuthUser: results.deletedAuthUser,
        deletedProfile: results.deletedProfile,
        tablesCleared: results.tablesCleared.length,
        timestamp: new Date().toISOString(),
      }
    });

    console.log('✅ User deletion completed');
    console.log(`📊 Summary: Auth=${results.deletedAuthUser}, Profile=${results.deletedProfile}, Tables=${results.tablesCleared.length}`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('❌ User deletion failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete user',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
