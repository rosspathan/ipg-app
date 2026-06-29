import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const minBalance = Number(url.searchParams.get('min_withdrawable') || '0');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[Admin BSK Report] Fetching complete per-user BSK breakdown...');

    // Pull the full per-user BSK breakdown from the secure aggregation function.
    const { data: rows, error: rpcError } = await supabase.rpc('admin_bsk_user_report');
    if (rpcError) throw rpcError;

    let reportData = (rows || []).map((r: any) => {
      const withdrawable = Number(r.withdrawable_balance || 0);
      const holding = Number(r.holding_balance || 0);
      const walletAddr = r.wallet_address || null;
      return {
        username: r.username || 'N/A',
        email: r.email || 'N/A',
        wallet_status: walletAddr ? 'Created' : 'Not Created',
        wallet_address: walletAddr || 'N/A',
        withdrawable_balance: withdrawable,
        holding_balance: holding,
        // total_balance kept for backwards compatibility with the legacy PDF
        total_balance: withdrawable + holding,
        total_held: Number(r.total_held || 0),
        total_earned: Number(r.total_earned || 0),
        total_deducted: Number(r.total_deducted || 0),
        fees_paid: Number(r.fees_paid || 0),
        pending_withdrawals_count: Number(r.pending_withdrawals_count || 0),
        pending_withdrawals_amount: Number(r.pending_withdrawals_amount || 0),
        completed_withdrawals_count: Number(r.completed_withdrawals_count || 0),
        completed_withdrawals_amount: Number(r.completed_withdrawals_amount || 0),
        created_at: r.created_at,
      };
    });

    // Apply minimum withdrawable balance filter
    if (minBalance > 0) {
      reportData = reportData.filter((u: any) => u.withdrawable_balance >= minBalance);
    }

    // Sort by total held (descending) so the biggest holders appear first
    reportData.sort((a: any, b: any) => b.total_held - a.total_held);

    // Aggregate totals for verification
    const totals = reportData.reduce((acc: any, u: any) => {
      acc.withdrawable_balance += u.withdrawable_balance;
      acc.holding_balance += u.holding_balance;
      acc.total_held += u.total_held;
      acc.total_earned += u.total_earned;
      acc.total_deducted += u.total_deducted;
      acc.fees_paid += u.fees_paid;
      acc.pending_withdrawals_amount += u.pending_withdrawals_amount;
      acc.completed_withdrawals_amount += u.completed_withdrawals_amount;
      return acc;
    }, {
      withdrawable_balance: 0, holding_balance: 0, total_held: 0, total_earned: 0,
      total_deducted: 0, fees_paid: 0, pending_withdrawals_amount: 0, completed_withdrawals_amount: 0,
    });

    console.log(`[Admin BSK Report] Generated report for ${reportData.length} users`);

    return new Response(JSON.stringify({
      success: true,
      total_users: reportData.length,
      generated_at: new Date().toISOString(),
      totals,
      data: reportData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Admin BSK Report] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
