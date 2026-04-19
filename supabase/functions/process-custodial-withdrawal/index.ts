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
  withdrawal_id?: string;
  process_pending?: boolean;
  scheduled_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body: WithdrawalRequest = await req.json().catch(() => ({}));
    const { withdrawal_id, process_pending = false, scheduled_run = false } = body;

    // ═══════════════════════════════════════════════════
    // AUTH: Support both admin JWT and cron scheduled runs
    // ═══════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');

    if (scheduled_run) {
      // Cron invocations send the anon key — verify it matches our project's anon key
      const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const providedToken = authHeader?.replace('Bearer ', '') ?? '';
      
      if (!providedToken || providedToken !== expectedAnonKey) {
        console.error('[process-custodial-withdrawal] Scheduled run: invalid anon key');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid scheduled run credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[process-custodial-withdrawal] Authorized via scheduled_run (cron)');
    } else {
      // Manual invocations require admin JWT
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !adminUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { 
        _user_id: adminUser.id, 
        _role: 'admin' 
      });
      if (!isAdmin) {
        console.error(`[process-custodial-withdrawal] Non-admin user ${adminUser.email} attempted to process withdrawals`);
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`[process-custodial-withdrawal] Admin ${adminUser.email} initiating withdrawal processing`);
    }

    console.log('[process-custodial-withdrawal] Starting withdrawal processing...');

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
    let query = supabaseAdmin
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
        await supabaseAdmin
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
          // ✅ Ledger-first settle: writes WITHDRAWAL audit row + sets tx_hash atomically
          const { data: settleResult, error: settleErr } = await supabaseAdmin.rpc(
            'settle_custodial_withdrawal',
            { p_withdrawal_id: withdrawal.id, p_tx_hash: hash }
          );

          if (settleErr || !(settleResult as any)?.success) {
            console.error(`[process-custodial-withdrawal] settle RPC failed for ${withdrawal.id}:`, settleErr || settleResult);
            // Tx was broadcast — DO NOT refund. Surface the error for manual reconciliation.
            results.push({
              withdrawal_id: withdrawal.id,
              status: 'completed_settle_failed',
              tx_hash: hash,
              error: settleErr?.message || (settleResult as any)?.error || 'settle_rpc_failed',
            });
          } else {
            console.log(`[process-custodial-withdrawal] ✓ Withdrawal settled: ${withdrawal.id} tx=${hash}`);
            results.push({
              withdrawal_id: withdrawal.id,
              status: 'completed',
              tx_hash: hash,
              amount: withdrawal.amount,
              symbol: asset.symbol,
            });
          }
        } else {
          throw new Error('Transaction failed on-chain');
        }

      } catch (withdrawalError) {
        const errMsg = (withdrawalError as Error)?.message || String(withdrawalError);
        console.error(`[process-custodial-withdrawal] Error processing ${withdrawal.id}:`, errMsg);

        // ✅ Ledger-first refund: marks failed, credits balance, writes REFUND ledger row atomically
        const { data: refundResult, error: refundErr } = await supabaseAdmin.rpc(
          'refund_custodial_withdrawal',
          { p_withdrawal_id: withdrawal.id, p_reason: errMsg }
        );

        if (refundErr || !(refundResult as any)?.success) {
          console.error(`[process-custodial-withdrawal] CRITICAL: refund RPC failed for ${withdrawal.id}:`, refundErr || refundResult);
          results.push({
            withdrawal_id: withdrawal.id,
            status: 'failed_refund_failed',
            error: errMsg,
            refund_error: refundErr?.message || (refundResult as any)?.error || 'refund_rpc_failed',
          });
        } else {
          const status = (refundResult as any)?.status === 'already_refunded' ? 'already_refunded' : 'failed';
          console.log(`[process-custodial-withdrawal] ↩ Refunded ${withdrawal.id} via ledger-first RPC (${status})`);
          results.push({
            withdrawal_id: withdrawal.id,
            status: 'failed',
            error: errMsg,
            refunded: true,
          });
        }
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

  } catch (error) {
    console.error('[process-custodial-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error)?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
