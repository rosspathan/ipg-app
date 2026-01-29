import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IPG_CONTRACT = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// ERC20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-staking-withdrawal] User:', user.id, 'Amount:', amount);

    // Get staking config
    const { data: config } = await supabase
      .from('crypto_staking_config')
      .select('*')
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Staking not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unstakingFee = config.unstaking_fee_percent || 0.5;
    const feeAmount = amount * (unstakingFee / 100);
    const netAmount = amount - feeAmount;

    // Get user's staking account
    const { data: account, error: accountError } = await supabase
      .from('user_staking_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Staking account not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (account.available_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet address from profiles
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', user.id)
      .single();

    const userWalletAddress = userProfile?.bsc_wallet_address || userProfile?.wallet_address;
    
    if (!userWalletAddress) {
      return new Response(
        JSON.stringify({ error: 'No wallet address found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get private key from secrets
    const privateKey = Deno.env.get('STAKING_WALLET_PRIVATE_KEY');
    if (!privateKey) {
      console.error('[process-staking-withdrawal] STAKING_WALLET_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Withdrawal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate balances
    const balanceBefore = account.available_balance;
    const balanceAfter = balanceBefore - amount;

    // Update user's staking account balance first
    const { error: updateError } = await supabase
      .from('user_staking_accounts')
      .update({ 
        available_balance: balanceAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[process-staking-withdrawal] Error updating balance:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record withdrawal in ledger (pending)
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('crypto_staking_ledger')
      .insert({
        user_id: user.id,
        staking_account_id: account.id,
        tx_type: 'withdrawal',
        amount: netAmount,
        fee_amount: feeAmount,
        currency: 'IPG',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        notes: `Withdrawal to ${userWalletAddress} (pending)`
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('[process-staking-withdrawal] Error recording ledger:', ledgerError);
      // Rollback balance update
      await supabase
        .from('user_staking_accounts')
        .update({ available_balance: balanceBefore })
        .eq('id', account.id);
        
      return new Response(
        JSON.stringify({ error: 'Failed to record transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process on-chain transfer
    try {
      const provider = new ethers.JsonRpcProvider(BSC_RPC);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(IPG_CONTRACT, ERC20_ABI, wallet);
      
      // Get token decimals
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(netAmount.toString(), decimals);

      console.log('[process-staking-withdrawal] Sending', netAmount, 'IPG to', userWalletAddress);

      // Send transaction
      const tx = await contract.transfer(userWalletAddress, amountWei);
      console.log('[process-staking-withdrawal] TX hash:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[process-staking-withdrawal] Confirmed in block:', receipt.blockNumber);

      // Update ledger with tx hash
      await supabase
        .from('crypto_staking_ledger')
        .update({ 
          tx_hash: tx.hash,
          notes: `Withdrawal to ${userWalletAddress} (confirmed)`
        })
        .eq('id', ledgerEntry.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          tx_hash: tx.hash,
          amount: netAmount,
          fee: feeAmount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (txError: any) {
      console.error('[process-staking-withdrawal] Transaction error:', txError);
      
      // Rollback balance and ledger entry
      await supabase
        .from('user_staking_accounts')
        .update({ available_balance: balanceBefore })
        .eq('id', account.id);
        
      await supabase
        .from('crypto_staking_ledger')
        .delete()
        .eq('id', ledgerEntry.id);

      return new Response(
        JSON.stringify({ error: 'Transaction failed: ' + txError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[process-staking-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
