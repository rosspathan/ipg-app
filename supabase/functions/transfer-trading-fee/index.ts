/**
 * Transfer Trading Fee Edge Function
 * Transfers collected trading fees on-chain to the admin fee wallet
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'https://esm.sh/viem@2.34.0';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.34.0/accounts';
import { bsc } from 'https://esm.sh/viem@2.34.0/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fee recipient wallet
const FEE_RECIPIENT = '0x68e5bbd91c9b3bc74cbe47f649c6c58bd6aaae33';

// Token contract addresses on BSC
const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
};

// ERC20 ABI for transfer
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, asset, trade_id, fee_record_ids } = await req.json();

    console.log(`[transfer-trading-fee] Processing fee transfer: ${amount} ${asset} for trade ${trade_id}`);

    // Validate inputs
    if (!amount || !asset) {
      throw new Error('Missing required fields: amount, asset');
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    // Get token contract address
    const tokenAddress = TOKEN_CONTRACTS[asset];
    if (!tokenAddress) {
      throw new Error(`Unsupported asset: ${asset}. Only USDT and BSK are supported.`);
    }

    // Get admin wallet private key
    const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    
    if (!privateKey) {
      throw new Error('Admin wallet not configured');
    }

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

    console.log(`[transfer-trading-fee] Admin wallet: ${account.address}`);
    console.log(`[transfer-trading-fee] Fee recipient: ${FEE_RECIPIENT}`);

    // Check admin wallet balance
    const adminBalance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    }) as bigint;

    const decimals = 18; // Both USDT and BSK use 18 decimals on BSC
    const adminBalanceFormatted = formatUnits(adminBalance, decimals);
    console.log(`[transfer-trading-fee] Admin wallet ${asset} balance: ${adminBalanceFormatted}`);

    const transferAmount = parseUnits(amountNum.toFixed(8), decimals);

    if (adminBalance < transferAmount) {
      console.error(`[transfer-trading-fee] Insufficient balance. Need: ${amountNum}, Have: ${adminBalanceFormatted}`);
      throw new Error(`Insufficient admin wallet balance for fee transfer`);
    }

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [FEE_RECIPIENT as `0x${string}`, transferAmount],
      account: account.address
    });

    console.log(`[transfer-trading-fee] Gas estimate: ${gasEstimate}`);

    // Execute transfer
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [FEE_RECIPIENT as `0x${string}`, transferAmount],
      gas: gasEstimate
    });

    console.log(`[transfer-trading-fee] ✓ Fee transferred: ${amountNum} ${asset} -> tx: ${hash}`);

    // Update fee records with tx_hash if provided
    if (fee_record_ids && fee_record_ids.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase
        .from('trading_fees_collected')
        .update({ 
          tx_hash: hash,
          transferred_at: new Date().toISOString(),
          status: 'transferred'
        })
        .in('id', fee_record_ids);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tx_hash: hash,
        amount: amountNum,
        asset,
        recipient: FEE_RECIPIENT,
        explorer_url: `https://bscscan.com/tx/${hash}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[transfer-trading-fee] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
