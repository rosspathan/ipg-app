/**
 * Process Custodial Withdrawal Edge Function
 * 
 * Processes pending withdrawal requests by:
 * 1. Sending tokens from the hot wallet to user's wallet
 * 2. Updating custodial_withdrawals with tx hash
 * 
 * Note: Balance has already been deducted from wallet_balances when the
 * withdrawal request was created (by request-custodial-withdrawal).
 * If the withdrawal fails, we refund to wallet_balances.
 * 
 * Uses ADMIN_WALLET_PRIVATE_KEY to sign transactions from the hot wallet.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'https://esm.sh/viem@2.38.4';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.38.4/accounts';
import { bsc } from 'https://esm.sh/viem@2.38.4/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token contract addresses on BSC
const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
  'IPG': '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
  'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface WithdrawalRequest {
  withdrawal_id?: string;  // Process specific withdrawal
  process_pending?: boolean;  // Process all pending withdrawals
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body: WithdrawalRequest = await req.json().catch(() => ({}));
    const { withdrawal_id, process_pending = false } = body;

    console.log('[process-custodial-withdrawal] Starting withdrawal processing...');

    // Get admin wallet private key
    const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('ADMIN_WALLET_PRIVATE_KEY not configured');
    }

    // Get RPC URL
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org/';

    // Set up viem clients
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

    console.log(`[process-custodial-withdrawal] Hot wallet: ${account.address}`);

    // Fetch pending withdrawals
    let query = supabase
      .from('custodial_withdrawals')
      .select(`
        *,
        assets (
          id,
          symbol,
          contract_address,
          decimals
        )
      `)
      .eq('status', 'pending');

    if (withdrawal_id) {
      query = query.eq('id', withdrawal_id);
    }

    const { data: withdrawals, error: fetchError } = await query.limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch withdrawals: ${fetchError.message}`);
    }

    if (!withdrawals || withdrawals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending withdrawals', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-custodial-withdrawal] Processing ${withdrawals.length} withdrawal(s)...`);

    const results: any[] = [];

    for (const withdrawal of withdrawals) {
      try {
        const asset = withdrawal.assets;
        if (!asset) {
          console.error(`[process-custodial-withdrawal] Asset not found for withdrawal ${withdrawal.id}`);
          continue;
        }

        console.log(`[process-custodial-withdrawal] Processing: ${withdrawal.amount} ${asset.symbol} to ${withdrawal.to_address}`);

        // Mark as processing
        await supabase
          .from('custodial_withdrawals')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', withdrawal.id);

        // Get contract address
        const contractAddress = asset.contract_address || TOKEN_CONTRACTS[asset.symbol];
        if (!contractAddress) {
          throw new Error(`No contract address for ${asset.symbol}`);
        }

        // Check hot wallet balance
        const balance = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        });

        const balanceNum = Number(formatUnits(balance, asset.decimals || 18));
        console.log(`[process-custodial-withdrawal] Hot wallet ${asset.symbol} balance: ${balanceNum}`);

        if (balanceNum < withdrawal.amount) {
          throw new Error(`Insufficient hot wallet balance. Available: ${balanceNum}, Required: ${withdrawal.amount}`);
        }

        // Parse amount to correct units
        const amountInUnits = parseUnits(withdrawal.amount.toString(), asset.decimals || 18);

        // Execute transfer
        const hash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [withdrawal.to_address as `0x${string}`, amountInUnits]
        });

        console.log(`[process-custodial-withdrawal] Tx sent: ${hash}`);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          // Update withdrawal as completed
          await supabase
            .from('custodial_withdrawals')
            .update({
              status: 'completed',
              tx_hash: hash,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawal.id);

          console.log(`[process-custodial-withdrawal] ✓ Withdrawal completed: ${withdrawal.id}`);
          results.push({
            withdrawal_id: withdrawal.id,
            status: 'completed',
            tx_hash: hash,
            amount: withdrawal.amount,
            symbol: asset.symbol
          });
        } else {
          throw new Error('Transaction failed on-chain');
        }

      } catch (withdrawalError: any) {
        console.error(`[process-custodial-withdrawal] Error processing ${withdrawal.id}:`, withdrawalError);

        // Mark as failed
        await supabase
          .from('custodial_withdrawals')
          .update({
            status: 'failed',
            error_message: withdrawalError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawal.id);

        // Refund to wallet_balances (the correct trading balance table)
        const { data: balance } = await supabase
          .from('wallet_balances')
          .select('available, locked, total')
          .eq('user_id', withdrawal.user_id)
          .eq('asset_id', withdrawal.asset_id)
          .single();

        const refundAmount = withdrawal.amount + (withdrawal.fee_amount || 0);

        if (balance) {
          // Update existing balance
          await supabase
            .from('wallet_balances')
            .update({
              available: (balance.available || 0) + refundAmount,
              total: (balance.total || 0) + refundAmount,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', withdrawal.user_id)
            .eq('asset_id', withdrawal.asset_id);

          console.log(`[process-custodial-withdrawal] Refunded ${refundAmount} to wallet_balances`);
        } else {
          // Insert new balance row if none exists
          await supabase
            .from('wallet_balances')
            .insert({
              user_id: withdrawal.user_id,
              asset_id: withdrawal.asset_id,
              available: refundAmount,
              locked: 0,
              total: refundAmount
            });

          console.log(`[process-custodial-withdrawal] Created new wallet_balance with refund ${refundAmount}`);
        }

        results.push({
          withdrawal_id: withdrawal.id,
          status: 'failed',
          error: withdrawalError.message,
          refunded: true
        });
      }
    }

    const successCount = results.filter(r => r.status === 'completed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        completed: successCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-custodial-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
