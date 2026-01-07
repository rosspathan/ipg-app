/**
 * Escrow Withdraw Edge Function
 * Allows users to withdraw their available (unlocked) escrow balance
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSC_RPC = 'https://bsc-dataseed.binance.org';

// Simplified ABI for withdraw function
const ESCROW_ABI = [
  'function withdraw(address token, uint256 amount) external'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader! } },
        auth: { persistSession: false }
      }
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { asset_symbol, amount, to_address } = await req.json();

    if (!asset_symbol || !amount || amount <= 0) {
      throw new Error('Invalid withdrawal parameters');
    }

    console.log('[escrow-withdraw] Request:', { user_id: user.id, asset_symbol, amount, to_address });

    // Get escrow balance
    const { data: escrowBalance, error: balanceError } = await adminClient
      .from('escrow_balances')
      .select('*')
      .eq('user_id', user.id)
      .eq('asset_symbol', asset_symbol)
      .single();

    if (balanceError || !escrowBalance) {
      throw new Error('No escrow balance found for this asset');
    }

    // Check available balance
    const available = escrowBalance.deposited - escrowBalance.locked;
    if (available < amount) {
      throw new Error(`Insufficient available balance. Available: ${available}, Requested: ${amount}`);
    }

    // Get user's wallet address
    const { data: profile } = await adminClient
      .from('profiles')
      .select('bsc_wallet_address')
      .eq('user_id', user.id)
      .single();

    const withdrawAddress = to_address || profile?.bsc_wallet_address;
    if (!withdrawAddress) {
      throw new Error('No withdrawal address specified');
    }

    // Get escrow contract config
    const { data: config } = await adminClient
      .from('escrow_contract_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      throw new Error('No active escrow contract configured');
    }

    // Get asset details
    const { data: asset } = await adminClient
      .from('assets')
      .select('contract_address, decimals')
      .eq('symbol', asset_symbol)
      .single();

    if (!asset?.contract_address) {
      throw new Error('Asset not found or missing contract address');
    }

    // Create withdrawal record (pending)
    const { data: withdrawal, error: createError } = await adminClient
      .from('escrow_withdrawals')
      .insert({
        user_id: user.id,
        asset_symbol,
        amount,
        to_address: withdrawAddress,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('[escrow-withdraw] Create error:', createError);
      throw new Error('Failed to create withdrawal request');
    }

    console.log('[escrow-withdraw] Withdrawal created:', withdrawal.id);

    // For now, we mark as "pending_user_action" since the user needs to call 
    // the withdraw function on the escrow contract themselves
    // OR we can process it via relayer if we have the admin wallet key

    const adminWalletKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    
    if (adminWalletKey) {
      // Process withdrawal via relayer (admin pays gas)
      try {
        const provider = new ethers.JsonRpcProvider(BSC_RPC);
        const wallet = new ethers.Wallet(adminWalletKey, provider);
        
        // Note: The actual withdraw function is called by the USER on the contract
        // The relayer cannot withdraw on behalf of users for security
        // We just update the status to indicate the user should withdraw
        
        await adminClient
          .from('escrow_withdrawals')
          .update({ 
            status: 'pending_user_action',
            error_message: 'Please call withdraw() on the escrow contract'
          })
          .eq('id', withdrawal.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            withdrawal_id: withdrawal.id,
            status: 'pending_user_action',
            message: 'Withdrawal created. Please call withdraw() on the escrow contract from your wallet.',
            escrow_contract: config.contract_address,
            token_contract: asset.contract_address,
            amount: amount.toString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (txError) {
        console.error('[escrow-withdraw] Transaction error:', txError);
        
        await adminClient
          .from('escrow_withdrawals')
          .update({ 
            status: 'failed',
            error_message: txError.message
          })
          .eq('id', withdrawal.id);

        throw new Error('Withdrawal processing failed');
      }
    } else {
      // No admin key - user must withdraw themselves
      await adminClient
        .from('escrow_withdrawals')
        .update({ 
          status: 'pending_user_action',
          error_message: 'User must call withdraw() directly'
        })
        .eq('id', withdrawal.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          withdrawal_id: withdrawal.id,
          status: 'pending_user_action',
          message: 'Please call withdraw() on the escrow contract from your wallet',
          escrow_contract: config.contract_address,
          token_contract: asset.contract_address,
          amount: amount.toString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[escrow-withdraw] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
