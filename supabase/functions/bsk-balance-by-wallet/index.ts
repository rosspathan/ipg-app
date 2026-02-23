import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH: Require authentication ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: authUser.id, _role: 'admin' });

    const { wallet } = await req.json();

    if (!wallet || typeof wallet !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedWallet = wallet.trim().toLowerCase();
    
    if (!/^0x[a-f0-9]{40}$/i.test(normalizedWallet)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId: string | null = null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (profile) {
      userId = profile.user_id;
    } else {
      const { data: userWallet } = await supabase
        .from('user_wallets')
        .select('user_id')
        .eq('wallet_address', normalizedWallet)
        .maybeSingle();
      if (userWallet) userId = userWallet.user_id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ linked: false, withdrawable_balance: 0, holding_balance: 0, lifetime_withdrawable_earned: 0, lifetime_holding_earned: 0, today_earned: 0, week_earned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Non-admin users can only query their own balance
    if (!isAdmin && userId !== authUser.id) {
      return new Response(
        JSON.stringify({ error: 'You can only query your own balance' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: balances } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: todayLedger } = await supabase
      .from('insurance_bsk_ledger')
      .select('bsk_amount')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());

    const { data: weekLedger } = await supabase
      .from('insurance_bsk_ledger')
      .select('bsk_amount')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    const todayEarned = todayLedger?.reduce((sum, e) => sum + Number(e.bsk_amount || 0), 0) || 0;
    const weekEarned = weekLedger?.reduce((sum, e) => sum + Number(e.bsk_amount || 0), 0) || 0;

    return new Response(
      JSON.stringify({
        linked: true,
        user_id: userId,
        withdrawable_balance: Number(balances?.withdrawable_balance || 0),
        holding_balance: Number(balances?.holding_balance || 0),
        lifetime_withdrawable_earned: Number(balances?.total_earned_withdrawable || 0),
        lifetime_holding_earned: Number(balances?.total_earned_holding || 0),
        today_earned: todayEarned,
        week_earned: weekEarned,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching BSK balance by wallet:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
