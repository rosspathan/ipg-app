import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  confirmToken: string;
  resetUsers?: boolean;
  resetBalances?: boolean;
  resetTransactions?: boolean;
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
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      throw new Error('Only admins can perform database reset');
    }

    const { confirmToken, resetUsers = false, resetBalances = true, resetTransactions = true }: ResetRequest = await req.json();

    // Safety check - require explicit confirmation token
    if (confirmToken !== 'RESET_DATABASE_CONFIRM') {
      throw new Error('Invalid confirmation token');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🗑️ Starting database reset...');
    console.log('Options:', { resetUsers, resetBalances, resetTransactions });

    const results: any = {
      success: true,
      operations: [],
      errors: [],
    };

    // 1. Reset balances
    if (resetBalances) {
      console.log('Resetting balances...');
      try {
        // Reset BSK balances
        const { error: bskError } = await supabaseAdmin
          .from('user_bsk_balances')
          .update({
            withdrawable_balance: 0,
            holding_balance: 0,
            total_earned_withdrawable: 0,
            total_earned_holding: 0,
            updated_at: new Date().toISOString()
          })
          .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Safety check

        if (bskError) throw bskError;

        // Reset wallet balances
        const { error: walletError } = await supabaseAdmin
          .from('wallet_balances')
          .update({
            balance: 0,
            updated_at: new Date().toISOString()
          })
          .neq('user_id', '00000000-0000-0000-0000-000000000000');

        if (walletError) throw walletError;

        results.operations.push('✅ Balances reset successfully');
      } catch (error: any) {
        const isCritical = error.message.toLowerCase().includes('permission') || 
                          error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('timeout');
        const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
        results.errors.push(`${prefix} Balance reset error: ${error.message}`);
      }
    }

    // 2. Reset transactions and ledgers
    if (resetTransactions) {
      console.log('Resetting transaction history...');
      try {
        // Delete trades
        await supabaseAdmin.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete orders
        await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete ad clicks
        await supabaseAdmin.from('ad_clicks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete referral events
        await supabaseAdmin.from('referral_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete spin results
        await supabaseAdmin.from('spin_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete lucky draw tickets
        await supabaseAdmin.from('lucky_draw_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete user program participations
        await supabaseAdmin.from('user_program_participations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete BSK vesting releases
        await supabaseAdmin.from('bsk_vesting_releases').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete withdrawals
        await supabaseAdmin.from('withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete deposits
        await supabaseAdmin.from('deposits').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete fiat deposits
        await supabaseAdmin.from('fiat_deposits').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        results.operations.push('✅ Transaction history cleared (trades, orders, withdrawals, deposits, program data)');
      } catch (error: any) {
        const isCritical = error.message.toLowerCase().includes('permission') || 
                          error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('timeout');
        const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
        results.errors.push(`${prefix} Transaction reset error: ${error.message}`);
      }
    }

    // 3. Delete users and all related data (excluding admin) - Profile-driven approach
    if (resetUsers) {
      console.log('Deleting non-admin users and all related data (profile-driven)...');
      try {
        // Get all admin user_ids to protect them
        const { data: adminUsers } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const adminIds = [...new Set([...(adminUsers?.map(a => a.user_id) || []), user.id])];
        console.log(`🛡️ Protected admin IDs: ${adminIds.length}`);

        let totalCandidateUserIds = 0;
        let deletedAuthUsers = 0;
        let deletedProfiles = 0;
        let orphanProfilesDeleted = 0;
        let page = 0;
        const pageSize = 500;

        // Step 1: Delete profiles with user_id NOT IN adminIds (paginated)
        while (true) {
          const { data: profilesPage, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .filter('user_id', 'not.in', `(${adminIds.join(',')})`)
            .not('user_id', 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          console.log(`🔍 Fetched ${profilesPage?.length || 0} profiles in page ${page}`);

          if (fetchError) {
            throw new Error(`Failed to fetch profiles page ${page}: ${fetchError.message}`);
          }

          if (!profilesPage || profilesPage.length === 0) break;

          totalCandidateUserIds += profilesPage.length;
          console.log(`📄 Page ${page}: Processing ${profilesPage.length} profiles...`);

          for (const profile of profilesPage) {
            const userId = profile.user_id;
            try {
              // Delete from all user-related tables
              await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
              await supabaseAdmin.from('referral_links_new').delete().eq('user_id', userId);
              await supabaseAdmin.from('referral_tree').delete().eq('user_id', userId);
              await supabaseAdmin.from('referral_tree').delete().eq('referred_by', userId);
              await supabaseAdmin.from('kyc_profiles_new').delete().eq('user_id', userId);
              await supabaseAdmin.from('kyc_submissions_simple').delete().eq('user_id', userId);
              await supabaseAdmin.from('user_bsk_holdings').delete().eq('user_id', userId);
              await supabaseAdmin.from('badge_holdings').delete().eq('user_id', userId);
              await supabaseAdmin.from('referral_ledger').delete().eq('user_id', userId);
              await supabaseAdmin.from('bonus_ledger').delete().eq('user_id', userId);
              await supabaseAdmin.from('user_bsk_balances').delete().eq('user_id', userId);
              await supabaseAdmin.from('wallet_balances').delete().eq('user_id', userId);

              // Delete profile
              const { error: profileDelError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('user_id', userId);
              
              if (profileDelError) {
                console.warn(`⚠️ Profile deletion warning for ${userId}: ${profileDelError.message}`);
              } else {
                deletedProfiles++;
              }

              // Try to delete auth user (ignore 404/not found)
              try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                deletedAuthUsers++;
              } catch (authErr: any) {
                if (authErr.message?.includes('not found') || authErr.status === 404) {
                  console.log(`ℹ️ Auth user ${userId} not found (orphan profile)`);
                } else {
                  throw authErr; // Re-throw if it's a different error
                }
              }
            } catch (err: any) {
              const isCritical = err.message.toLowerCase().includes('permission') || 
                                err.message.toLowerCase().includes('network') ||
                                err.message.toLowerCase().includes('timeout');
              const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
              results.errors.push(`${prefix} Failed to delete user ${userId}: ${err.message}`);
              console.error(`${prefix} User deletion failed for ${userId}:`, err.message);
            }
          }

          page++;
        }

        console.log(`📊 Processed ${totalCandidateUserIds} candidate user_ids across ${page} pages`);

        // Step 2: Delete orphan profiles (user_id is null)
        const { error: orphanError, count: orphanCount } = await supabaseAdmin
          .from('profiles')
          .delete({ count: 'exact' })
          .is('user_id', null);

        if (orphanError) {
          console.warn(`⚠️ Orphan profile deletion warning: ${orphanError.message}`);
        } else {
          orphanProfilesDeleted = orphanCount || 0;
          console.log(`🧹 Deleted ${orphanProfilesDeleted} orphan profiles (user_id is null)`);
        }

        // Step 3: Cleanup - delete any remaining profiles NOT in adminIds (bulk operation)
        const { error: cleanupError, count: cleanupCount } = await supabaseAdmin
          .from('profiles')
          .delete({ count: 'exact' })
          .filter('user_id', 'not.in', `(${adminIds.join(',')})`);

        if (cleanupError) {
          console.warn(`⚠️ Cleanup deletion warning: ${cleanupError.message}`);
        } else {
          const extraCleaned = cleanupCount || 0;
          if (extraCleaned > 0) {
            console.log(`🧹 Cleanup removed ${extraCleaned} additional profiles`);
            deletedProfiles += extraCleaned;
          }
        }

        results.operations.push(`✅ Deleted ${deletedAuthUsers} auth users, ${deletedProfiles} profiles, ${orphanProfilesDeleted} orphan profiles`);
        console.log(`✅ Summary: ${deletedAuthUsers} auth users, ${deletedProfiles} profiles, ${orphanProfilesDeleted} orphans deleted`);
      } catch (error: any) {
        const isCritical = error.message.toLowerCase().includes('permission') || 
                          error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('timeout');
        const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
        results.errors.push(`${prefix} User deletion error: ${error.message}`);
        console.error(`${prefix} User deletion failed:`, error);
      }
    }

    // 4. Create audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'database_reset',
      resource_type: 'system',
      resource_id: 'database',
      new_values: {
        resetUsers,
        resetBalances,
        resetTransactions,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Database reset completed');
    
    // Check for critical errors only
    const hasCriticalErrors = results.errors.some((err: string) => 
      err.includes('❌ CRITICAL:')
    );
    results.success = !hasCriticalErrors;

    return new Response(JSON.stringify(results), {
      status: results.success ? 200 : 207,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('❌ Database reset failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to reset database',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
