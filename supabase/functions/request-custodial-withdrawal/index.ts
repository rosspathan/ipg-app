/**
 * Request Custodial Withdrawal Edge Function
 * 
 * Called by users to request a withdrawal from their trading balance.
 * Uses atomic RPC with FOR UPDATE row locking to prevent race conditions.
 * The actual on-chain transfer is handled by process-custodial-withdrawal.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  asset_symbol: string;
  amount: number;
  to_address?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get destination address
    let destinationAddress = to_address;

    if (!destinationAddress) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();

      destinationAddress = profile?.bsc_wallet_address || profile?.wallet_address;

      if (!destinationAddress) {
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

    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid withdrawal address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[request-custodial-withdrawal] Destination: ${destinationAddress}`);

    // #8: Withdrawal Address Whitelist — check if address is allowlisted and activated
    const { data: allowlistEntries, error: allowlistError } = await adminClient
      .from('allowlist_addresses')
      .select('id, address, enabled, activated_at, activation_delay_hours, created_at')
      .eq('user_id', user.id)
      .eq('chain', 'BSC')
      .eq('enabled', true);

    if (allowlistError) {
      console.error('[request-custodial-withdrawal] Allowlist check error:', allowlistError);
    }

    // If user has ANY allowlisted addresses, the withdrawal MUST go to one of them
    if (allowlistEntries && allowlistEntries.length > 0) {
      const matchedEntry = allowlistEntries.find(
        (e) => e.address.toLowerCase() === destinationAddress!.toLowerCase()
      );

      if (!matchedEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'Withdrawal address is not in your allowlist. Add it first and wait for activation.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 24-hour activation delay
      const activatedAt = matchedEntry.activated_at ? new Date(matchedEntry.activated_at) : null;
      const delayHours = matchedEntry.activation_delay_hours ?? 24;

      if (!activatedAt) {
        // Address was added but not yet activated — set activated_at now and enforce delay
        await adminClient
          .from('allowlist_addresses')
          .update({ activated_at: new Date().toISOString() })
          .eq('id', matchedEntry.id);

        return new Response(
          JSON.stringify({ success: false, error: `New address requires a ${delayHours}-hour cooling-off period before withdrawals. Please try again later.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const activationThreshold = new Date(activatedAt.getTime() + delayHours * 60 * 60 * 1000);
      if (new Date() < activationThreshold) {
        const remainingMs = activationThreshold.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return new Response(
          JSON.stringify({ success: false, error: `Address is still in cooling-off period. ${remainingHours}h remaining before withdrawals are allowed.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[request-custodial-withdrawal] ✓ Address passed allowlist + activation check`);
    }

    const fee = asset.withdraw_fee || 0;

    // Execute atomic withdrawal with FOR UPDATE row locking
    const { data: result, error: rpcError } = await adminClient.rpc(
      'execute_withdrawal_request',
      {
        p_user_id: user.id,
        p_asset_id: asset.id,
        p_amount: amount,
        p_fee: fee,
        p_to_address: destinationAddress,
      }
    );

    if (rpcError) {
      console.error('[request-custodial-withdrawal] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message || 'Withdrawal failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!result?.success) {
      console.error('[request-custodial-withdrawal] Rejected:', result?.error);
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Withdrawal failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[request-custodial-withdrawal] ✓ Created withdrawal ${result.withdrawal_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: result.withdrawal_id,
        amount: result.amount,
        fee: result.fee,
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
