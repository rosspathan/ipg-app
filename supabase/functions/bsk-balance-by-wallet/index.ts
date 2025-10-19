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
    const { wallet } = await req.json();

    // Validate wallet address
    if (!wallet || typeof wallet !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedWallet = wallet.trim().toLowerCase();
    
    // Validate Ethereum address format (0x followed by 40 hex chars)
    if (!/^0x[a-f0-9]{40}$/i.test(normalizedWallet)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Find user_id by wallet address
    let userId: string | null = null;

    // Try profiles.wallet_address first
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (profile) {
      userId = profile.user_id;
    } else {
      // Try user_wallets table
      const { data: userWallet } = await supabase
        .from('user_wallets')
        .select('user_id')
        .eq('wallet_address', normalizedWallet)
        .maybeSingle();

      if (userWallet) {
        userId = userWallet.user_id;
      }
    }

    // If no user found, return unlinked state
    if (!userId) {
      return new Response(
        JSON.stringify({
          linked: false,
          withdrawable_balance: 0,
          holding_balance: 0,
          lifetime_withdrawable_earned: 0,
          lifetime_holding_earned: 0,
          today_earned: 0,
          week_earned: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch BSK balances
    const { data: balances } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Step 3: Calculate today and week earned
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

    const todayEarned = todayLedger?.reduce((sum, entry) => sum + Number(entry.bsk_amount || 0), 0) || 0;
    const weekEarned = weekLedger?.reduce((sum, entry) => sum + Number(entry.bsk_amount || 0), 0) || 0;

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
