/**
 * Get Admin Wallet Info Edge Function
 * Returns admin wallet address and on-chain balances
 */

import { createPublicClient, http, formatUnits } from 'https://esm.sh/viem@2.34.0';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.34.0/accounts';
import { bsc } from 'https://esm.sh/viem@2.34.0/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token contract addresses on BSC
const TOKENS: Record<string, { address: string; decimals: number }> = {
  'BNB': { address: 'native', decimals: 18 },
  'USDT': { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
  'BSK': { address: '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78', decimals: 18 },
  'IPG': { address: '0x4fc553E49A0305e30A6a8fFC0aaD29B40A5Ce698', decimals: 18 },
};

const ERC20_ABI = [
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
    const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    
    if (!privateKey) {
      throw new Error('Admin wallet not configured');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletAddress = account.address;

    const publicClient = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl)
    });

    // Get balances for all tokens
    const balances: Record<string, string> = {};

    for (const [symbol, token] of Object.entries(TOKENS)) {
      try {
        if (token.address === 'native') {
          // Get native BNB balance
          const balance = await publicClient.getBalance({ address: walletAddress });
          balances[symbol] = formatUnits(balance, token.decimals);
        } else {
          // Get ERC20 token balance
          const balance = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress]
          }) as bigint;
          balances[symbol] = formatUnits(balance, token.decimals);
        }
      } catch (err) {
        console.error(`Error fetching ${symbol} balance:`, err);
        balances[symbol] = '0';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        wallet_address: walletAddress,
        balances,
        explorer_url: `https://bscscan.com/address/${walletAddress}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[get-admin-wallet-info] Error:', error);
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
