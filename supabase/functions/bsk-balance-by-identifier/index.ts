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
    // === AUTH: Require authentication ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ linked: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller's identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ linked: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: authUser.id, _role: 'admin' });

    const { email, username, wallet } = await req.json();
    
    console.log('[BSK Balance By Identifier] Request received:', { 
      hasEmail: !!email, 
      hasUsername: !!username, 
      hasWallet: !!wallet,
      callerId: authUser.id,
      isAdmin: !!isAdmin
    });

    if (!email && !username && !wallet) {
      return new Response(
        JSON.stringify({ linked: false, error: 'At least one identifier required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId: string | null = null;
    let source: string = '';

    // Priority 1: Email
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (profileByEmail) { userId = profileByEmail.user_id; source = 'email'; }
    }

    // Priority 2: Username
    if (!userId && username) {
      const normalizedUsername = username.toLowerCase().trim();
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', normalizedUsername)
        .maybeSingle();
      if (profileByUsername) { userId = profileByUsername.user_id; source = 'username'; }
    }

    // Priority 3: Wallet
    if (!userId && wallet) {
      const normalizedWallet = wallet.toLowerCase().trim();
      const { data: profileByWallet } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('wallet_address', normalizedWallet)
        .maybeSingle();
      if (profileByWallet) { userId = profileByWallet.user_id; source = 'wallet'; }
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
        JSON.stringify({ linked: false, error: 'You can only query your own balance' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch BSK balances
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) throw balanceError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: todayLedger } = await supabase
      .from('insurance_bsk_ledger')
      .select('bsk_amount')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    const { data: weekLedger } = await supabase
      .from('insurance_bsk_ledger')
      .select('bsk_amount')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    const todayEarned = todayLedger?.reduce((sum, e) => sum + Number(e.bsk_amount || 0), 0) || 0;
    const weekEarned = weekLedger?.reduce((sum, e) => sum + Number(e.bsk_amount || 0), 0) || 0;

    return new Response(
      JSON.stringify({
        linked: true,
        user_id: userId,
        source,
        withdrawable_balance: Number(balanceData?.withdrawable_balance || 0),
        holding_balance: Number(balanceData?.holding_balance || 0),
        lifetime_withdrawable_earned: Number(balanceData?.total_earned_withdrawable || 0),
        lifetime_holding_earned: Number(balanceData?.total_earned_holding || 0),
        today_earned: todayEarned,
        week_earned: weekEarned,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[BSK Balance By Identifier] Error:', error);
    return new Response(
      JSON.stringify({ linked: false, error: error.message, withdrawable_balance: 0, holding_balance: 0, lifetime_withdrawable_earned: 0, lifetime_holding_earned: 0, today_earned: 0, week_earned: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
