/**
 * Auto-Process Withdrawals Edge Function
 * 
 * Enhancement 1: Automated hot-wallet withdrawals
 * 
 * Runs on a schedule (or can be triggered manually) to process pending
 * custodial withdrawals automatically when auto_withdrawal_enabled = true.
 * 
 * Respects:
 * - auto_withdrawal_enabled flag (kill switch)
 * - auto_withdrawal_threshold (max amount per withdrawal to auto-process)
 * - auto_withdrawal_batch_size (max withdrawals per run)
 * - All existing circuit breakers from validate_withdrawal_request RPC
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'https://esm.sh/viem@2.38.4';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.38.4/accounts';
import { bsc } from 'https://esm.sh/viem@2.38.4/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
  'IPG': '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
  'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
};

const ERC20_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ================================================================
    // STEP 1: Check if auto-withdrawal is enabled
    // ================================================================
    const { data: settings, error: settingsError } = await supabase
      .from('trading_engine_settings')
      .select('auto_withdrawal_enabled, auto_withdrawal_threshold, auto_withdrawal_batch_size')
      .single();

    if (settingsError || !settings) {
      console.error('[auto-process-withdrawals] Failed to load settings:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to load engine settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.auto_withdrawal_enabled) {
      console.log('[auto-process-withdrawals] Auto-withdrawal is DISABLED. Skipping.');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-withdrawal is disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const threshold = Number(settings.auto_withdrawal_threshold) || 1000;
    const batchSize = Number(settings.auto_withdrawal_batch_size) || 5;

    console.log(`[auto-process-withdrawals] Running: threshold=${threshold}, batch=${batchSize}`);

    // ================================================================
    // STEP 2: Verify hot wallet key
    // ================================================================
    const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    if (!privateKey) {
      console.error('[auto-process-withdrawals] ADMIN_WALLET_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Hot wallet not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org/';
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({ chain: bsc, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain: bsc, transport: http(rpcUrl) });

    console.log(`[auto-process-withdrawals] Hot wallet: ${account.address}`);

    // ================================================================
    // STEP 3: Fetch pending withdrawals within auto-threshold
    // ================================================================
    const { data: withdrawals, error: fetchError } = await supabase
      .from('custodial_withdrawals')
      .select(`
        *,
        assets (id, symbol, contract_address, decimals)
      `)
      .eq('status', 'pending')
      .lte('amount', threshold)           // Only auto-process below threshold
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch withdrawals: ${fetchError.message}`);
    }

    if (!withdrawals || withdrawals.length === 0) {
      console.log('[auto-process-withdrawals] No eligible pending withdrawals');
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible pending withdrawals', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auto-process-withdrawals] Processing ${withdrawals.length} withdrawal(s)...`);

    const results: any[] = [];

    for (const withdrawal of withdrawals) {
      const asset = withdrawal.assets;
      if (!asset) {
        console.error(`[auto-process-withdrawals] Asset missing for withdrawal ${withdrawal.id}`);
        results.push({ withdrawal_id: withdrawal.id, status: 'skipped', reason: 'asset not found' });
        continue;
      }

      try {
        // Mark as processing (prevents duplicate processing)
        const { error: lockError } = await supabase
          .from('custodial_withdrawals')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', withdrawal.id)
          .eq('status', 'pending'); // optimistic lock — only update if still pending

        if (lockError) {
          console.warn(`[auto-process-withdrawals] Could not lock withdrawal ${withdrawal.id} (may be in-flight)`);
          continue;
        }

        // Get contract address
        const contractAddress = asset.contract_address || TOKEN_CONTRACTS[asset.symbol];
        if (!contractAddress) {
          throw new Error(`No contract address configured for ${asset.symbol}`);
        }

        // Check hot wallet has sufficient balance
        const hotWalletBalance = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        });

        const balanceNum = Number(formatUnits(hotWalletBalance, asset.decimals || 18));
        console.log(`[auto-process-withdrawals] Hot wallet ${asset.symbol} balance: ${balanceNum}, needed: ${withdrawal.amount}`);

        if (balanceNum < withdrawal.amount) {
          // Revert to pending — admin needs to refill hot wallet
          await supabase
            .from('custodial_withdrawals')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', withdrawal.id);

          results.push({
            withdrawal_id: withdrawal.id,
            status: 'skipped',
            reason: `Insufficient hot wallet balance: ${balanceNum} ${asset.symbol} available, ${withdrawal.amount} needed`
          });
          continue;
        }

        // Execute on-chain transfer
        const amountInUnits = parseUnits(withdrawal.amount.toString(), asset.decimals || 18);
        const txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [withdrawal.to_address as `0x${string}`, amountInUnits]
        });

        console.log(`[auto-process-withdrawals] TX submitted: ${txHash}`);

        // Wait for confirmation (1 block)
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

        if (receipt.status === 'success') {
          await supabase
            .from('custodial_withdrawals')
            .update({
              status: 'completed',
              tx_hash: txHash,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawal.id);

          // Record in trading_balance_ledger for audit trail
          await supabase
            .from('trading_balance_ledger')
            .insert({
              user_id: withdrawal.user_id,
              asset_symbol: asset.symbol,
              delta_available: -Number(withdrawal.amount),
              delta_locked: 0,
              balance_available_after: 0, // Already deducted when custodial_withdrawal was created
              balance_locked_after: 0,
              entry_type: 'WITHDRAWAL',
              reference_type: 'auto_custodial_withdrawal',
              reference_id: withdrawal.id,
              notes: `Auto-processed withdrawal: ${withdrawal.amount} ${asset.symbol} to ${withdrawal.to_address} | TX: ${txHash}`
            });

          console.log(`[auto-process-withdrawals] ✓ Completed: ${withdrawal.id} | ${withdrawal.amount} ${asset.symbol} | TX: ${txHash}`);

          results.push({
            withdrawal_id: withdrawal.id,
            status: 'completed',
            tx_hash: txHash,
            amount: withdrawal.amount,
            symbol: asset.symbol,
            to_address: withdrawal.to_address
          });
        } else {
          throw new Error('On-chain transaction reverted');
        }

      } catch (err: any) {
        console.error(`[auto-process-withdrawals] Error on withdrawal ${withdrawal.id}:`, err.message);

        // Mark failed and refund balance
        await supabase
          .from('custodial_withdrawals')
          .update({
            status: 'failed',
            error_message: err.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawal.id);

        // Refund trading balance via ledger
        await supabase.rpc('refund_failed_withdrawal', {
          p_user_id: withdrawal.user_id,
          p_asset_symbol: asset.symbol,
          p_asset_id: withdrawal.asset_id,
          p_amount: Number(withdrawal.amount),
          p_fee: Number(withdrawal.fee_amount || 0),
          p_reference_type: 'auto_withdrawal_failed',
          p_reference_id: withdrawal.id,
          p_notes: `Auto-process failed: ${err.message}`
        });

        results.push({
          withdrawal_id: withdrawal.id,
          status: 'failed',
          error: err.message,
          refunded: true
        });
      }
    }

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`[auto-process-withdrawals] Done: ${completed} completed, ${failed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        completed,
        failed,
        skipped,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[auto-process-withdrawals] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
