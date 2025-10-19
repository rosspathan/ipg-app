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
    const { email, username, wallet } = await req.json();
    
    console.log('[BSK Balance By Identifier] Request received:', { 
      hasEmail: !!email, 
      hasUsername: !!username, 
      hasWallet: !!wallet 
    });

    if (!email && !username && !wallet) {
      return new Response(
        JSON.stringify({ 
          linked: false, 
          error: 'At least one identifier (email, username, or wallet) required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    let source: string = '';

    // Priority 1: Email
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[BSK Balance By Identifier] Searching by email:', normalizedEmail);
      
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (emailError) {
        console.error('[BSK Balance By Identifier] Email lookup error:', emailError);
      } else if (profileByEmail) {
        userId = profileByEmail.user_id;
        source = 'email';
        console.log('[BSK Balance By Identifier] Found user by email:', userId);
      }
    }

    // Priority 2: Username
    if (!userId && username) {
      const normalizedUsername = username.toLowerCase().trim();
      console.log('[BSK Balance By Identifier] Searching by username:', normalizedUsername);
      
      const { data: profileByUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (usernameError) {
        console.error('[BSK Balance By Identifier] Username lookup error:', usernameError);
      } else if (profileByUsername) {
        userId = profileByUsername.user_id;
        source = 'username';
        console.log('[BSK Balance By Identifier] Found user by username:', userId);
      }
    }

    // Priority 3: Wallet
    if (!userId && wallet) {
      const normalizedWallet = wallet.toLowerCase().trim();
      console.log('[BSK Balance By Identifier] Searching by wallet:', normalizedWallet);
      
      const { data: profileByWallet, error: walletError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('wallet_address', normalizedWallet)
        .maybeSingle();

      if (walletError) {
        console.error('[BSK Balance By Identifier] Wallet lookup error:', walletError);
      } else if (profileByWallet) {
        userId = profileByWallet.user_id;
        source = 'wallet';
        console.log('[BSK Balance By Identifier] Found user by wallet:', userId);
      }
    }

    // If no user found, return unlinked
    if (!userId) {
      console.log('[BSK Balance By Identifier] No user found for provided identifiers');
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

    // Fetch BSK balances for the user
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error('[BSK Balance By Identifier] Balance fetch error:', balanceError);
      throw balanceError;
    }

    // Calculate today's and week's earnings
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

    const todayEarned = todayLedger?.reduce((sum, entry) => sum + Number(entry.bsk_amount || 0), 0) || 0;
    const weekEarned = weekLedger?.reduce((sum, entry) => sum + Number(entry.bsk_amount || 0), 0) || 0;

    console.log('[BSK Balance By Identifier] Balance found via', source, ':', {
      userId,
      withdrawable: balanceData?.withdrawable_balance || 0,
      holding: balanceData?.holding_balance || 0,
    });

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
    console.error('[BSK Balance By Identifier] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        linked: false, 
        error: error.message,
        withdrawable_balance: 0,
        holding_balance: 0,
        lifetime_withdrawable_earned: 0,
        lifetime_holding_earned: 0,
        today_earned: 0,
        week_earned: 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
