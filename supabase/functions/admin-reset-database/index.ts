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
    const startTime = Date.now();

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

    // 3. Delete users and all related data (excluding admin) - Batched bulk + orphan cleanup
    if (resetUsers) {
      console.log('Deleting non-admin users and related data (batched bulk + orphan cleanup)...');
      try {
        // Get all admin user_ids to protect them
        const { data: adminUsers } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const adminIds = [...new Set([...(adminUsers?.map(a => a.user_id) || []), user.id])];
        console.log(`🛡️ Protected admin IDs: ${adminIds.length}`);

        let totalCandidateUserIds = 0;
        let deletedAuthUsersFromProfiles = 0;
        let deletedAuthUsersOrphans = 0;
        let deletedProfiles = 0;
        let orphanProfilesDeleted = 0;

        // Helper utils
        const chunk = <T,>(arr: T[], size: number) => {
          const res: T[][] = [];
          for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
          return res;
        };
        const elapsed = () => Date.now() - startTime;

        // Collect all candidate user_ids from profiles NOT IN adminIds
        const candidateIds: string[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          const { data: profilesPage, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .filter('user_id', 'not.in', `(${adminIds.join(',')})`)
            .not('user_id', 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (fetchError) {
            throw new Error(`Failed to fetch profiles page ${page}: ${fetchError.message}`);
          }

          const ids = (profilesPage || []).map(p => p.user_id).filter(Boolean);
          candidateIds.push(...ids);
          console.log(`🔍 Fetched ${ids.length} profile user_ids in page ${page}`);

          if (!profilesPage || profilesPage.length === 0) break;
          page++;

          if (elapsed() > 50_000) {
            console.warn('⏳ Time budget reached while collecting candidate IDs, proceeding with partial set');
            break;
          }
        }
        totalCandidateUserIds = candidateIds.length;
        console.log(`📊 Collected ${totalCandidateUserIds} candidate user_ids`);

        // Batched bulk deletes across tables
        const userIdTables = [
          'user_roles',
          'referral_links_new',
          'kyc_profiles_new',
          'kyc_submissions_simple',
          'user_bsk_holdings',
          'badge_holdings',
          'referral_ledger',
          'bonus_ledger',
          'user_bsk_balances',
          'wallet_balances',
        ];

        for (const idsChunk of chunk(candidateIds, 200)) {
          // Bulk delete related rows in parallel
          const deletePromises: Promise<any>[] = [
            // referral_tree has two foreign keys
            supabaseAdmin.from('referral_tree').delete().in('user_id', idsChunk),
            supabaseAdmin.from('referral_tree').delete().in('referred_by', idsChunk),
            ...userIdTables.map(tbl => supabaseAdmin.from(tbl).delete().in('user_id', idsChunk)),
            // delete profiles last in chunk
            supabaseAdmin.from('profiles').delete().in('user_id', idsChunk),
          ];

          const settled = await Promise.allSettled(deletePromises);
          const hadErrors = settled.filter(s => s.status === 'rejected') as PromiseRejectedResult[];
          if (hadErrors.length > 0) {
            hadErrors.forEach(err => {
              const message = (err.reason?.message || String(err.reason || 'unknown')).toLowerCase();
              const isCritical = message.includes('permission') || message.includes('network') || message.includes('timeout');
              const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
              results.errors.push(`${prefix} Bulk delete chunk failed: ${err.reason?.message || err.reason}`);
            });
          }
          deletedProfiles += idsChunk.length;

          // Delete auth users for this chunk with safe concurrency
          for (const sub of chunk(idsChunk, 10)) {
            const authRes = await Promise.allSettled(sub.map(id => supabaseAdmin.auth.admin.deleteUser(id)));
            authRes.forEach(r => {
              if (r.status === 'fulfilled') {
                deletedAuthUsersFromProfiles++;
              } else {
                const msg = r.reason?.message || String(r.reason || 'unknown');
                if (msg.includes('not found') || r.reason?.status === 404) {
                  // ignore
                } else {
                  const lower = msg.toLowerCase();
                  const isCritical = lower.includes('permission') || lower.includes('network') || lower.includes('timeout');
                  const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
                  results.errors.push(`${prefix} deleteUser failed: ${msg}`);
                }
              }
            });
          }

          if (elapsed() > 55_000) {
            console.warn('⏳ Approaching timeout during bulk deletes, returning partial results');
            results.operations.push('⏳ Partial: bulk deletes phase paused due to time budget');
            break;
          }
        }

        // Delete orphan profiles (user_id is null)
        {
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
        }

        // Cleanup any remaining profiles not in adminIds
        {
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
        }

        // Orphan auth users cleanup: delete auth users not admins and not in profiles
        if (elapsed() <= 55_000) {
          // Build remaining profile user_id set
          const remainingProfileIds = new Set<string>();
          let rpPage = 0;
          while (true) {
            const { data: rp, error: rpErr } = await supabaseAdmin
              .from('profiles')
              .select('user_id')
              .not('user_id', 'is', null)
              .range(rpPage * 1000, (rpPage + 1) * 1000 - 1);
            if (rpErr) {
              console.warn('⚠️ Failed to fetch remaining profiles for orphan auth cleanup:', rpErr.message);
              break;
            }
            if (!rp || rp.length === 0) break;
            rp.forEach(r => r.user_id && remainingProfileIds.add(r.user_id));
            rpPage++;
            if (elapsed() > 55_000) break;
          }

          // Paginate through auth users and delete orphans
          let authPage = 1;
          const perPage = 200;
          while (true) {
            const list = await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage });
            const users = (list as any).users || [];
            if (!users || users.length === 0) break;

            const toDelete = users
              .filter((u: any) => !adminIds.includes(u.id) && !remainingProfileIds.has(u.id))
              .map((u: any) => u.id);

            for (const dChunk of chunk(toDelete, 10)) {
              const delRes = await Promise.allSettled(dChunk.map(id => supabaseAdmin.auth.admin.deleteUser(id)));
              delRes.forEach(r => {
                if (r.status === 'fulfilled') {
                  deletedAuthUsersOrphans++;
                } else {
                  const msg = r.reason?.message || String(r.reason || 'unknown');
                  const lower = msg.toLowerCase();
                  if (lower.includes('not found') || (r.reason?.status === 404)) {
                    // ignore
                  } else {
                    const isCritical = lower.includes('permission') || lower.includes('network') || lower.includes('timeout');
                    const prefix = isCritical ? '❌ CRITICAL:' : '⚠️ Warning:';
                    results.errors.push(`${prefix} orphan deleteUser failed: ${msg}`);
                  }
                }
              });
            }

            authPage++;
            if (elapsed() > 58_000) {
              console.warn('⏳ Stopping orphan auth cleanup due to time budget');
              results.operations.push('⏳ Partial: orphan auth cleanup paused due to time budget');
              break;
            }
          }
        }

        // Final counts
        let remainingProfiles = 0;
        try {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('user_id', { count: 'exact', head: true });
          remainingProfiles = count || 0;
        } catch (_e) {
          // ignore
        }

        results.operations.push(`✅ Deleted auth users: ${deletedAuthUsersFromProfiles} from profiles, ${deletedAuthUsersOrphans} orphans`);
        results.operations.push(`✅ Deleted ${deletedProfiles} profiles (${orphanProfilesDeleted} orphan profiles)`);
        results.summary = {
          processedCandidateUserIds: totalCandidateUserIds,
          deletedProfiles,
          orphanProfilesDeleted,
          deletedAuthUsersFromProfiles,
          deletedAuthUsersOrphans,
          remainingProfiles,
          tookMs: elapsed(),
        };
        console.log('✅ User deletion summary:', results.summary);
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
