import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0"
import { createWalletClient, createPublicClient, http, parseEther, formatUnits, parseUnits } from 'https://esm.sh/viem@2.34.0'
import { privateKeyToAccount } from 'https://esm.sh/viem@2.34.0/accounts'
import { bsc } from 'https://esm.sh/viem@2.34.0/chains'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  }
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check profile security flags
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_status, withdrawal_locked, kyc_status')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) throw new Error('Profile not found');
    if (profile.account_status !== 'active') throw new Error('Account is not active. Please contact support.');
    if (profile.withdrawal_locked) throw new Error('Withdrawals are locked for your account. Please contact support.');

    const { asset_symbol, network, to_address, amount } = await req.json();

    // Validate inputs
    if (!asset_symbol || !network || !to_address || !amount) {
      throw new Error('Missing required fields');
    }

    // P0 FIX: Circuit breaker - validate withdrawal request
    const { data: circuitCheck, error: circuitError } = await supabase.rpc(
      'validate_withdrawal_request',
      { p_user_id: user.id, p_amount_usd: parseFloat(amount), p_withdrawal_type: 'crypto' }
    );
    if (circuitError) {
      console.error('[process-withdrawal] Circuit breaker error:', circuitError);
      throw new Error('Withdrawal validation failed');
    }
    if (circuitCheck && !circuitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: circuitCheck.reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    // Require KYC for large withdrawals (>$1000 equivalent)
    if (amountNum > 1000 && profile.kyc_status !== 'approved') {
      throw new Error('KYC verification required for withdrawals over $1,000. Please complete verification in your profile settings.');
    }

    // Validate address format
    const trimmedAddress = to_address.trim();
    
    // Support BEP20 and native BNB
    if (network !== 'BEP20' && network !== 'BNB') {
      throw new Error('Only BEP20 and native BNB withdrawals are supported currently');
    }
    
    if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
      throw new Error('Invalid BSC address format');
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      throw new Error('Invalid BSC address characters');
    }

    // Check daily withdrawal limit (5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayWithdrawals, error: countError } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (countError) {
      console.error('[process-withdrawal] Error checking withdrawal limit:', countError);
    }

    if (todayWithdrawals && todayWithdrawals >= 5) {
      throw new Error('Daily withdrawal limit reached (5 withdrawals per day)');
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', asset_symbol)
      .single();

    if (assetError || !asset) throw new Error('Asset not found');
    if (!asset.withdraw_enabled) throw new Error('Withdrawals are disabled for this asset');

    // Validate amount limits
    if (amountNum < parseFloat(asset.min_withdraw_amount)) {
      throw new Error(`Minimum withdrawal is ${asset.min_withdraw_amount} ${asset_symbol}`);
    }
    if (amountNum > parseFloat(asset.max_withdraw_amount)) {
      throw new Error(`Maximum withdrawal is ${asset.max_withdraw_amount} ${asset_symbol}`);
    }

    // Get admin wallet private key
    const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    
    if (!privateKey) {
      throw new Error('Admin wallet not configured');
    }

    // Calculate fees
    const withdrawFee = parseFloat(asset.withdraw_fee) || 0;

    // CRITICAL FIX: Atomically validate ledger + deduct balance + record in ledger
    const { data: ledgerCheck, error: ledgerError } = await supabase.rpc('validate_and_record_withdrawal', {
      p_user_id: user.id,
      p_asset_symbol: asset_symbol,
      p_asset_id: asset.id,
      p_amount: amountNum,
      p_fee: withdrawFee,
      p_reference_type: 'trading_withdrawal',
      p_notes: `Withdrawal to ${trimmedAddress}`
    });

    if (ledgerError) {
      console.error('[process-withdrawal] Ledger validation error:', ledgerError);
      throw new Error('Balance verification failed');
    }
    if (!ledgerCheck?.allowed) {
      throw new Error(ledgerCheck?.reason || 'Withdrawal not allowed');
    }

    console.log(`[process-withdrawal] Ledger validated: debited=${ledgerCheck.debited}, new_available=${ledgerCheck.new_available}`);

    console.log(`[process-withdrawal] Processing ${network} withdrawal: ${amountNum} ${asset_symbol} to ${trimmedAddress}`);

    // Initialize viem clients
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl)
    });

    const walletClient = createWalletClient({
      account,
      chain: bsc,
      transport: http(rpcUrl)
    });

    let tx_hash: string;
    let gasUsed = 0;

    try {
      // Check if it's native BNB or ERC20 token
      if ((asset_symbol === 'BNB' && network === 'BNB') || !asset.contract_address) {
        // Native BNB transfer
        const value = parseEther(amountNum.toString());
        
        // Estimate gas
        const gasEstimate = await publicClient.estimateGas({
          account: account.address,
          to: trimmedAddress as `0x${string}`,
          value
        });

        console.log(`[process-withdrawal] Gas estimate for BNB: ${gasEstimate}`);

        // Send transaction
        const hash = await walletClient.sendTransaction({
          to: trimmedAddress as `0x${string}`,
          value,
          gas: gasEstimate
        });

        tx_hash = hash;
        console.log(`[process-withdrawal] BNB transaction sent: ${tx_hash}`);

      } else {
        // ERC20 token transfer
        const tokenAddress = asset.contract_address as `0x${string}`;
        const decimals = asset.decimals || 18;
        const value = parseUnits(amountNum.toString(), decimals);

        // Check admin wallet token balance
        const adminBalance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        }) as bigint;

        const adminBalanceFormatted = formatUnits(adminBalance, decimals);
        console.log(`[process-withdrawal] Admin wallet balance: ${adminBalanceFormatted} ${asset_symbol}`);

        if (adminBalance < value) {
          throw new Error(`Insufficient hot wallet balance. Available: ${adminBalanceFormatted} ${asset_symbol}`);
        }

        // Estimate gas for token transfer
        const gasEstimate = await publicClient.estimateContractGas({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [trimmedAddress as `0x${string}`, value],
          account: account.address
        });

        console.log(`[process-withdrawal] Gas estimate for ${asset_symbol}: ${gasEstimate}`);

        // Execute token transfer
        const hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [trimmedAddress as `0x${string}`, value],
          gas: gasEstimate
        });

        tx_hash = hash;
        console.log(`[process-withdrawal] ${asset_symbol} transaction sent: ${tx_hash}`);
      }

      // Fee already accounted for in ledger debit
      const netAmount = amountNum - withdrawFee;

      if (netAmount <= 0) throw new Error('Amount too small to cover fees');

      // Create withdrawal record with real tx_hash
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          asset_id: asset.id,
          amount: amountNum,
          fee: withdrawFee,
          net_amount: netAmount,
          to_address: trimmedAddress,
          network,
          status: 'processing',
          tx_hash: tx_hash
        })
        .select()
        .single();

      if (withdrawalError) {
        console.error('[process-withdrawal] Failed to create withdrawal record:', withdrawalError);
        // Rollback: refund via ledger
        await supabase.rpc('refund_failed_withdrawal', {
          p_user_id: user.id,
          p_asset_symbol: asset_symbol,
          p_asset_id: asset.id,
          p_amount: amountNum,
          p_fee: withdrawFee,
          p_reference_type: 'withdrawal_record_failed',
          p_notes: 'Failed to create withdrawal record'
        });
        throw withdrawalError;
      }

      console.log(`[process-withdrawal] Created withdrawal ${withdrawal.id} with real tx_hash: ${tx_hash}`);

      // Trigger monitoring function to track confirmations
      await supabase.functions.invoke('monitor-withdrawal', {
        body: { withdrawal_id: withdrawal.id }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          withdrawal_id: withdrawal.id,
          status: 'processing',
          amount: amountNum,
          fee: withdrawFee,
          net_amount: netAmount,
          tx_hash: tx_hash,
          message: 'Withdrawal submitted to blockchain. Awaiting confirmations...',
          explorer_url: `https://bscscan.com/tx/${tx_hash}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (blockchainError: any) {
      console.error('[process-withdrawal] Blockchain error:', blockchainError);
      
      // Rollback: refund via ledger
      await supabase.rpc('refund_failed_withdrawal', {
        p_user_id: user.id,
        p_asset_symbol: asset_symbol,
        p_asset_id: asset.id,
        p_amount: amountNum,
        p_fee: withdrawFee,
        p_reference_type: 'blockchain_failure',
        p_notes: `Blockchain tx failed: ${blockchainError.message}`
      });

      throw new Error(`Blockchain transaction failed: ${blockchainError.message}`);
    }

  } catch (error: any) {
    console.error('[process-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
