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
        results.errors.push(`❌ Balance reset error: ${error.message}`);
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
        results.errors.push(`❌ Transaction reset error: ${error.message}`);
      }
    }

    // 3. Delete users (excluding admin)
    if (resetUsers) {
      console.log('Deleting non-admin users...');
      try {
        // Get all users except admins
        const { data: adminUsers } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const adminIds = adminUsers?.map(a => a.user_id) || [];
        
        // Get all users from auth
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        
        let deletedCount = 0;
        for (const authUser of allUsers?.users || []) {
          // Skip admin users
          if (!adminIds.includes(authUser.id)) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            deletedCount++;
          }
        }

        results.operations.push(`✅ Deleted ${deletedCount} non-admin users`);
      } catch (error: any) {
        results.errors.push(`❌ User deletion error: ${error.message}`);
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
    results.success = results.errors.length === 0;

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
