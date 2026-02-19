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

    console.log('[Admin BSK Report] Fetching all user data...');

    // Fetch all profiles
    const allProfiles: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, email, full_name, wallet_address, bsc_wallet_address, created_at')
        .range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allProfiles.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    // Fetch all BSK balances
    const allBalances: any[] = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('user_id, withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding')
        .range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allBalances.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    // Create balance lookup
    const balanceMap = new Map<string, any>();
    for (const b of allBalances) {
      balanceMap.set(b.user_id, b);
    }

    // Merge data
    const reportData = allProfiles.map(p => {
      const bal = balanceMap.get(p.user_id);
      const walletAddr = p.bsc_wallet_address || p.wallet_address || null;
      return {
        username: p.username || p.full_name || 'N/A',
        email: p.email || 'N/A',
        withdrawable_balance: Number(bal?.withdrawable_balance || 0),
        holding_balance: Number(bal?.holding_balance || 0),
        total_balance: Number(bal?.withdrawable_balance || 0) + Number(bal?.holding_balance || 0),
        wallet_status: walletAddr ? 'Created' : 'Not Created',
        wallet_address: walletAddr || 'N/A',
        created_at: p.created_at,
      };
    });

    console.log(`[Admin BSK Report] Generated report for ${reportData.length} users`);

    return new Response(JSON.stringify({
      success: true,
      total_users: reportData.length,
      generated_at: new Date().toISOString(),
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
