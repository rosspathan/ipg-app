/**
 * Request Custodial Withdrawal Edge Function
 * 
 * Called by users to request a withdrawal from their trading balance.
 * This function:
 * 1. Validates the user has sufficient trading balance
 * 2. Deducts from trading_balances
 * 3. Creates a custodial_withdrawals record (pending)
 * 4. The actual on-chain transfer is handled by process-custodial-withdrawal
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  asset_symbol: string;
  amount: number;
  to_address?: string;  // Optional - defaults to user's registered wallet
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: WithdrawalRequest = await req.json();
    const { asset_symbol, amount, to_address } = body;

    console.log(`[request-custodial-withdrawal] User ${user.id} requesting ${amount} ${asset_symbol}`);

    // Validate inputs
    if (!asset_symbol || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset
    const { data: asset, error: assetError } = await adminClient
      .from('assets')
      .select('id, symbol, withdraw_enabled, min_withdraw_amount, max_withdraw_amount, withdraw_fee')
      .eq('symbol', asset_symbol)
      .eq('is_active', true)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ success: false, error: `Asset ${asset_symbol} not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!asset.withdraw_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: `Withdrawals are disabled for ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check min/max
    if (asset.min_withdraw_amount && amount < asset.min_withdraw_amount) {
      return new Response(
        JSON.stringify({ success: false, error: `Minimum withdrawal is ${asset.min_withdraw_amount} ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (asset.max_withdraw_amount && amount > asset.max_withdraw_amount) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximum withdrawal is ${asset.max_withdraw_amount} ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's trading balance
    const { data: balance, error: balanceError } = await adminClient
      .from('trading_balances')
      .select('available, locked')
      .eq('user_id', user.id)
      .eq('asset_id', asset.id)
      .single();

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ success: false, error: `No ${asset_symbol} trading balance found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const available = balance.available || 0;
    const fee = asset.withdraw_fee || 0;
    const totalRequired = amount + fee;

    if (available < totalRequired) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient balance. Available: ${available}, Required: ${totalRequired} (includes ${fee} fee)` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get destination address
    let destinationAddress = to_address;

    if (!destinationAddress) {
      // Get from user's profile
      const { data: profile } = await adminClient
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();

      destinationAddress = profile?.bsc_wallet_address || profile?.wallet_address;

      if (!destinationAddress) {
        // Try wallets_user table
        const { data: userWallet } = await adminClient
          .from('wallets_user')
          .select('address')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .single();

        destinationAddress = userWallet?.address;
      }
    }

    if (!destinationAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'No withdrawal address found. Please set up your wallet.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate address format
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid withdrawal address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[request-custodial-withdrawal] Destination: ${destinationAddress}`);

    // Deduct from trading balance
    const { error: deductError } = await adminClient
      .from('trading_balances')
      .update({
        available: available - totalRequired,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('asset_id', asset.id);

    if (deductError) {
      console.error('[request-custodial-withdrawal] Deduct error:', deductError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to deduct balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create withdrawal record
    const { data: withdrawal, error: withdrawalError } = await adminClient
      .from('custodial_withdrawals')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount,
        to_address: destinationAddress,
        fee_amount: fee,
        status: 'pending'
      })
      .select('id')
      .single();

    if (withdrawalError) {
      console.error('[request-custodial-withdrawal] Create error:', withdrawalError);
      
      // Refund
      await adminClient
        .from('trading_balances')
        .update({
          available: available,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[request-custodial-withdrawal] ✓ Created withdrawal ${withdrawal.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawal.id,
        amount,
        fee,
        to_address: destinationAddress,
        status: 'pending',
        message: 'Withdrawal request submitted. It will be processed shortly.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[request-custodial-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
