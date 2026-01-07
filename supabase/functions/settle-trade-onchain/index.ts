/**
 * Settle Trade On-Chain Edge Function
 * Transfers tokens between buyer and seller on BSC after trade execution
 * 
 * This function:
 * 1. Retrieves wallet addresses for both parties
 * 2. Transfers base asset from admin wallet to buyer
 * 3. Transfers quote asset from admin wallet to seller
 * 4. Records settlement status in trade_settlements table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'https://esm.sh/viem@2.34.0';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.34.0/accounts';
import { bsc } from 'https://esm.sh/viem@2.34.0/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token contract addresses on BSC (BEP-20)
const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
  'IPG': '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
  'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  'BNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // Wrapped BNB
};

// Token decimals (most BEP-20 tokens use 18)
const TOKEN_DECIMALS: Record<string, number> = {
  'USDT': 18,
  'BSK': 18,
  'IPG': 18,
  'BTC': 18,
  'ETH': 18,
  'BNB': 18,
};

// ERC20 ABI for transfer and balance
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

interface SettlementRequest {
  trade_id: string;
  buyer_id: string;
  seller_id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  base_amount: string;
  quote_amount: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let settlementId: string | null = null;

  try {
    const body: SettlementRequest = await req.json();
    const { trade_id, buyer_id, seller_id, symbol, base_asset, quote_asset, base_amount, quote_amount } = body;

    console.log(`[settle-trade-onchain] Processing settlement for trade ${trade_id}`);
    console.log(`[settle-trade-onchain] ${base_amount} ${base_asset} → Buyer, ${quote_amount} ${quote_asset} → Seller`);

    // Validate required fields
    if (!trade_id || !buyer_id || !seller_id || !base_asset || !quote_asset || !base_amount || !quote_amount) {
      throw new Error('Missing required fields');
    }

    // Check if settlement already exists for this trade (idempotency)
    const { data: existingSettlement } = await supabase
      .from('trade_settlements')
      .select('id, status')
      .eq('trade_id', trade_id)
      .single();

    if (existingSettlement) {
      console.log(`[settle-trade-onchain] Settlement already exists: ${existingSettlement.id}, status: ${existingSettlement.status}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Settlement already processed',
          settlement_id: existingSettlement.id,
          status: existingSettlement.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get buyer wallet address from profiles (check bsc_wallet_address first, then wallet_address)
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', buyer_id)
      .single();

    let buyerWallet = buyerProfile?.bsc_wallet_address || buyerProfile?.wallet_address;

    // Fallback: check wallets_user table if no wallet in profile
    if (!buyerWallet) {
      const { data: buyerUserWallet } = await supabase
        .from('wallets_user')
        .select('address')
        .eq('user_id', buyer_id)
        .eq('chain', 'bsc')
        .eq('is_primary', true)
        .single();
      buyerWallet = buyerUserWallet?.address;
    }

    if (!buyerWallet) {
      throw new Error(`Buyer wallet not found for user ${buyer_id}. User needs to connect a BSC wallet.`);
    }

    // Get seller wallet address from profiles (check bsc_wallet_address first, then wallet_address)
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', seller_id)
      .single();

    let sellerWallet = sellerProfile?.bsc_wallet_address || sellerProfile?.wallet_address;

    // Fallback: check wallets_user table if no wallet in profile
    if (!sellerWallet) {
      const { data: sellerUserWallet } = await supabase
        .from('wallets_user')
        .select('address')
        .eq('user_id', seller_id)
        .eq('chain', 'bsc')
        .eq('is_primary', true)
        .single();
      sellerWallet = sellerUserWallet?.address;
    }

    if (!sellerWallet) {
      throw new Error(`Seller wallet not found for user ${seller_id}. User needs to connect a BSC wallet.`);
    }

    console.log(`[settle-trade-onchain] Buyer wallet: ${buyerWallet}`);
    console.log(`[settle-trade-onchain] Seller wallet: ${sellerWallet}`);

    // Validate token contracts exist
    const baseTokenAddress = TOKEN_CONTRACTS[base_asset];
    const quoteTokenAddress = TOKEN_CONTRACTS[quote_asset];

    if (!baseTokenAddress) {
      throw new Error(`Unsupported base asset: ${base_asset}`);
    }
    if (!quoteTokenAddress) {
      throw new Error(`Unsupported quote asset: ${quote_asset}`);
    }

    // Create settlement record
    const { data: settlement, error: insertError } = await supabase
      .from('trade_settlements')
      .insert({
        trade_id,
        buyer_id,
        seller_id,
        symbol,
        base_asset,
        quote_asset,
        base_amount: parseFloat(base_amount),
        quote_amount: parseFloat(quote_amount),
        buyer_wallet: buyerWallet,
        seller_wallet: sellerWallet,
        status: 'pending'
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create settlement record: ${insertError.message}`);
    }

    settlementId = settlement.id;
    console.log(`[settle-trade-onchain] Created settlement record: ${settlementId}`);

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

    console.log(`[settle-trade-onchain] Admin wallet: ${account.address}`);

    // Get token decimals
    const baseDecimals = TOKEN_DECIMALS[base_asset] || 18;
    const quoteDecimals = TOKEN_DECIMALS[quote_asset] || 18;

    // Parse amounts
    const baseAmountParsed = parseUnits(parseFloat(base_amount).toFixed(8), baseDecimals);
    const quoteAmountParsed = parseUnits(parseFloat(quote_amount).toFixed(8), quoteDecimals);

    // Check admin wallet has sufficient balance for both transfers
    const [adminBaseBalance, adminQuoteBalance] = await Promise.all([
      publicClient.readContract({
        address: baseTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      }) as Promise<bigint>,
      publicClient.readContract({
        address: quoteTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      }) as Promise<bigint>
    ]);

    console.log(`[settle-trade-onchain] Admin ${base_asset} balance: ${formatUnits(adminBaseBalance, baseDecimals)}`);
    console.log(`[settle-trade-onchain] Admin ${quote_asset} balance: ${formatUnits(adminQuoteBalance, quoteDecimals)}`);

    if (adminBaseBalance < baseAmountParsed) {
      throw new Error(`Insufficient admin wallet balance for ${base_asset}. Need: ${base_amount}, Have: ${formatUnits(adminBaseBalance, baseDecimals)}`);
    }

    if (adminQuoteBalance < quoteAmountParsed) {
      throw new Error(`Insufficient admin wallet balance for ${quote_asset}. Need: ${quote_amount}, Have: ${formatUnits(adminQuoteBalance, quoteDecimals)}`);
    }

    // Transfer base asset to buyer
    console.log(`[settle-trade-onchain] Transferring ${base_amount} ${base_asset} to buyer ${buyerWallet}`);
    
    const baseGasEstimate = await publicClient.estimateContractGas({
      address: baseTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [buyerWallet as `0x${string}`, baseAmountParsed],
      account: account.address
    });

    const baseTxHash = await walletClient.writeContract({
      address: baseTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [buyerWallet as `0x${string}`, baseAmountParsed],
      gas: baseGasEstimate
    });

    console.log(`[settle-trade-onchain] ✓ Base asset transferred: ${baseTxHash}`);

    // Update settlement with base tx hash
    await supabase
      .from('trade_settlements')
      .update({ 
        base_tx_hash: baseTxHash,
        status: 'base_settled',
        gas_used_base: baseGasEstimate.toString()
      })
      .eq('id', settlementId);

    // Transfer quote asset to seller
    console.log(`[settle-trade-onchain] Transferring ${quote_amount} ${quote_asset} to seller ${sellerWallet}`);

    const quoteGasEstimate = await publicClient.estimateContractGas({
      address: quoteTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [sellerWallet as `0x${string}`, quoteAmountParsed],
      account: account.address
    });

    const quoteTxHash = await walletClient.writeContract({
      address: quoteTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [sellerWallet as `0x${string}`, quoteAmountParsed],
      gas: quoteGasEstimate
    });

    console.log(`[settle-trade-onchain] ✓ Quote asset transferred: ${quoteTxHash}`);

    // Update settlement as completed
    await supabase
      .from('trade_settlements')
      .update({ 
        quote_tx_hash: quoteTxHash,
        status: 'completed',
        gas_used_quote: quoteGasEstimate.toString(),
        settled_at: new Date().toISOString()
      })
      .eq('id', settlementId);

    console.log(`[settle-trade-onchain] ✓ Settlement completed: ${settlementId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        settlement_id: settlementId,
        base_tx_hash: baseTxHash,
        quote_tx_hash: quoteTxHash,
        base_explorer_url: `https://bscscan.com/tx/${baseTxHash}`,
        quote_explorer_url: `https://bscscan.com/tx/${quoteTxHash}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[settle-trade-onchain] Error:', error);

    // Update settlement as failed if we have a settlement ID
    if (settlementId) {
      await supabase
        .from('trade_settlements')
        .update({ 
          status: 'failed',
          error_message: error.message,
          retry_count: 1
        })
        .eq('id', settlementId);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        settlement_id: settlementId
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
