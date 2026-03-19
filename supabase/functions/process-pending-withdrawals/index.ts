import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ERC20 transfer ABI
const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

// Gas monitoring thresholds (in BNB)
const LOW_GAS_WARN_THRESHOLD = 0.05;
const LOW_GAS_ABORT_THRESHOLD = 0.005;

// ── Phase 3: Per-run outflow cap (USDT-equivalent) ────────────────────
// If cumulative outflow in a single invocation exceeds this, halt further processing.
const PER_RUN_OUTFLOW_CAP_USDT = 10_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const hotWalletKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
    if (!hotWalletKey) {
      console.error('[process-pending-withdrawals] ADMIN_WALLET_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Hot wallet not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find all crypto withdrawals in processing state
    const { data: pendingWithdrawals, error: queryError } = await supabase
      .from('withdrawals')
      .select('*, assets(symbol, network, contract_address, decimals)')
      .eq('status', 'processing')
      .is('tx_hash', null)
      .limit(10);

    if (queryError) throw queryError;

    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, total: 0, message: 'No pending withdrawals' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-pending-withdrawals] Processing ${pendingWithdrawals.length} withdrawals`);

    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
    const wallet = new ethers.Wallet(hotWalletKey, provider);

    console.log(`[process-pending-withdrawals] Hot wallet address: ${wallet.address}`);

    // ── Phase 2a: Gas Monitoring ──────────────────────────────────────
    const bnbBalance = await provider.getBalance(wallet.address);
    const bnbBalanceEth = parseFloat(ethers.formatEther(bnbBalance));
    console.log(`[process-pending-withdrawals] BNB gas balance: ${bnbBalanceEth}`);

    if (bnbBalanceEth < LOW_GAS_ABORT_THRESHOLD) {
      console.error(`[process-pending-withdrawals] CRITICAL: BNB balance ${bnbBalanceEth} below abort threshold. Halting.`);
      await supabase.from('security_audit_log').insert({
        event_type: 'LOW_GAS_CRITICAL',
        severity: 'critical',
        source: 'process-pending-withdrawals',
        details: { bnb_balance: bnbBalanceEth, threshold: LOW_GAS_ABORT_THRESHOLD, pending_count: pendingWithdrawals.length },
      });
      await supabase.from('admin_notifications').insert({
        type: 'hot_wallet_gas',
        priority: 'critical',
        title: 'Hot Wallet Gas CRITICAL — Withdrawals Halted',
        message: `BNB balance is ${bnbBalanceEth.toFixed(6)} BNB (below ${LOW_GAS_ABORT_THRESHOLD}). All withdrawal processing has been halted. Refuel immediately.`,
      });
      return new Response(
        JSON.stringify({ error: 'Insufficient gas — withdrawals halted', bnb_balance: bnbBalanceEth }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (bnbBalanceEth < LOW_GAS_WARN_THRESHOLD) {
      console.warn(`[process-pending-withdrawals] LOW_GAS_ALERT: BNB balance ${bnbBalanceEth}`);
      await supabase.from('security_audit_log').insert({
        event_type: 'LOW_GAS_WARNING',
        severity: 'high',
        source: 'process-pending-withdrawals',
        details: { bnb_balance: bnbBalanceEth, threshold: LOW_GAS_WARN_THRESHOLD },
      });
      await supabase.from('admin_notifications').insert({
        type: 'hot_wallet_gas',
        priority: 'high',
        title: 'Hot Wallet Gas Low — Refuel Soon',
        message: `BNB balance is ${bnbBalanceEth.toFixed(6)} BNB. Please refuel to avoid disruptions.`,
      });
    }

    // ── Phase 2b: Manual Nonce Management ─────────────────────────────
    let currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
    console.log(`[process-pending-withdrawals] Starting nonce: ${currentNonce}`);

    // ── Phase 3: Outflow tracking ─────────────────────────────────────
    // Estimate USDT value: stablecoins = 1:1, others use net_amount as conservative proxy.
    // For a production price oracle, replace this with a real feed.
    const STABLECOIN_SYMBOLS = ['USDT', 'USDI', 'BUSD', 'USDC', 'DAI'];
    let cumulativeOutflowUsdt = 0;
    let outflowCapReached = false;

    let processed = 0;
    const results: any[] = [];

    for (const withdrawal of pendingWithdrawals) {
      // ── Phase 3: Check outflow cap before each withdrawal ───────────
      if (outflowCapReached) {
        console.warn(`[process-pending-withdrawals] Outflow cap reached ($${cumulativeOutflowUsdt.toFixed(2)}). Skipping remaining withdrawals.`);
        results.push({ id: withdrawal.id, status: 'skipped', reason: 'per_run_outflow_cap_reached' });
        continue;
      }

      try {
        const asset = withdrawal.assets;
        if (!asset) {
          console.error(`[process-pending-withdrawals] No asset data for withdrawal ${withdrawal.id}`);
          results.push({ id: withdrawal.id, status: 'error', error: 'Asset not found' });
          continue;
        }

        // ── PHASE 4: SOLVENCY CHECK before any withdrawal ──
        const assetSymbol = asset.symbol?.toUpperCase();
        const { data: solvencyResult, error: solvencyError } = await supabase.rpc(
          'check_solvency_before_withdrawal',
          { p_asset_symbol: assetSymbol }
        );
        
        if (solvencyError) {
          console.warn(`[process-pending-withdrawals] Solvency check failed for ${withdrawal.id}: ${solvencyError.message}. Blocking withdrawal.`);
          results.push({ id: withdrawal.id, status: 'blocked', reason: 'Solvency check unavailable' });
          continue;
        }
        
        if (solvencyResult && !solvencyResult.solvent) {
          console.error(`[process-pending-withdrawals] SOLVENCY DRIFT detected for ${assetSymbol}. Drift: ${solvencyResult.drift}. Withdrawals frozen.`);
          results.push({ id: withdrawal.id, status: 'blocked', reason: `Solvency drift: ${solvencyResult.drift_percent}%` });
          continue;
        }

        // ── HARDENED: Full re-validation for EVERY withdrawal (no stale bypass) ──
        // Every withdrawal must pass full validation regardless of age.
        const { data: validation, error: valError } = await supabase.rpc(
          'validate_withdrawal_full',
          {
            p_user_id: withdrawal.user_id,
            p_withdrawal_id: withdrawal.id,
            p_amount: withdrawal.amount,
            p_asset_symbol: asset.symbol,
          }
        );

        if (valError) {
          console.warn(`[process-pending-withdrawals] Validation RPC failed for ${withdrawal.id}: ${valError.message}. Blocking withdrawal.`);
          results.push({ id: withdrawal.id, status: 'blocked', reason: 'Validation RPC unavailable' });
          continue;
        }
        
        if (validation && !validation.valid) {
          console.warn(`[process-pending-withdrawals] BLOCKED withdrawal ${withdrawal.id}: ${validation.reason}`);
          const { error: refundError } = await supabase.rpc(
            'refund_failed_withdrawal',
            { p_withdrawal_id: withdrawal.id, p_reason: `Validation: ${validation.reason}` }
          );
          if (refundError) {
            console.error(`[process-pending-withdrawals] CRITICAL: Refund failed for ${withdrawal.id}:`, refundError);
          }
          await supabase.from('security_audit_log').insert({
            event_type: 'WITHDRAWAL_VALIDATION_BLOCKED',
            severity: 'high',
            source: 'process-pending-withdrawals',
            details: { withdrawal_id: withdrawal.id, user_id: withdrawal.user_id, reason: validation.reason, amount: withdrawal.amount },
          });
          results.push({ id: withdrawal.id, status: 'blocked', reason: validation.reason, refunded: !refundError });
          continue;
        }

        // ── Phase 3b: Estimate outflow & check cap ────────────────────
        const netAmount = withdrawal.net_amount;
        const estimatedUsdt = STABLECOIN_SYMBOLS.includes(asset.symbol?.toUpperCase())
          ? netAmount  // 1:1 for stablecoins
          : netAmount; // Conservative: treat token amount as USDT-equivalent (safe upper-bound for low-value tokens)

        if (cumulativeOutflowUsdt + estimatedUsdt > PER_RUN_OUTFLOW_CAP_USDT) {
          console.warn(`[process-pending-withdrawals] Outflow cap would be exceeded: current=$${cumulativeOutflowUsdt.toFixed(2)}, this=$${estimatedUsdt.toFixed(2)}, cap=$${PER_RUN_OUTFLOW_CAP_USDT}`);
          await supabase.from('security_audit_log').insert({
            event_type: 'OUTFLOW_CAP_REACHED',
            severity: 'high',
            source: 'process-pending-withdrawals',
            details: { cumulative_usdt: cumulativeOutflowUsdt, this_amount: estimatedUsdt, cap: PER_RUN_OUTFLOW_CAP_USDT, remaining_count: pendingWithdrawals.length - results.length },
          });
          await supabase.from('admin_notifications').insert({
            type: 'outflow_cap',
            priority: 'high',
            title: 'Per-Run Outflow Cap Reached',
            message: `Cumulative outflow hit $${cumulativeOutflowUsdt.toFixed(2)} (cap: $${PER_RUN_OUTFLOW_CAP_USDT}). Remaining withdrawals deferred to next run.`,
          });
          outflowCapReached = true;
          results.push({ id: withdrawal.id, status: 'skipped', reason: 'per_run_outflow_cap_reached' });
          continue;
        }

        const contractAddress = asset.contract_address;
        const decimals = asset.decimals || 18;
        const toAddress = withdrawal.to_address;

        console.log(`[process-pending-withdrawals] Sending ${netAmount} ${asset.symbol} to ${toAddress} (nonce: ${currentNonce})`);

        let txHash: string;

        if (contractAddress) {
          const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
          const amountInUnits = ethers.parseUnits(netAmount.toString(), decimals);
          const tx = await contract.transfer(toAddress, amountInUnits, { nonce: currentNonce });
          console.log(`[process-pending-withdrawals] TX sent: ${tx.hash}`);
          const receipt = await tx.wait();

          if (receipt?.status !== 1) {
            throw new Error('Transaction failed on-chain');
          }
          txHash = tx.hash;
        } else {
          const tx = await wallet.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(netAmount.toString()),
            nonce: currentNonce,
          });
          console.log(`[process-pending-withdrawals] BNB TX sent: ${tx.hash}`);
          const receipt = await tx.wait();

          if (receipt?.status !== 1) {
            throw new Error('BNB transaction failed on-chain');
          }
          txHash = tx.hash;
        }

        // Successful broadcast — increment nonce & outflow tracker
        currentNonce++;
        cumulativeOutflowUsdt += estimatedUsdt;

        const { error: updateError } = await supabase
          .from('withdrawals')
          .update({
            status: 'completed',
            tx_hash: txHash,
            approved_at: new Date().toISOString()
          })
          .eq('id', withdrawal.id);

        if (updateError) {
          console.error(`[process-pending-withdrawals] Failed to update withdrawal ${withdrawal.id}:`, updateError);
          results.push({ id: withdrawal.id, status: 'failed', error: updateError.message });
        } else {
          // Idempotency guard: only write ledger if no entry exists for this withdrawal
          // (validate_and_record_withdrawal may have already written one with reference_type='withdrawal')
          const { data: existingLedger } = await supabase
            .from('trading_balance_ledger')
            .select('id')
            .eq('user_id', withdrawal.user_id)
            .eq('reference_id', withdrawal.id)
            .in('reference_type', ['withdrawal', 'withdrawal_completed', 'internal_transfer_to_wallet'])
            .eq('entry_type', 'WITHDRAWAL')
            .maybeSingle();

          if (!existingLedger) {
            const { data: walletBal } = await supabase
              .from('wallet_balances')
              .select('available, locked')
              .eq('user_id', withdrawal.user_id)
              .eq('asset_id', withdrawal.asset_id)
              .maybeSingle();

            await supabase
              .from('trading_balance_ledger')
              .insert({
                user_id: withdrawal.user_id,
                asset_symbol: asset.symbol,
                delta_available: -Number(withdrawal.net_amount),
                delta_locked: 0,
                balance_available_after: Number(walletBal?.available ?? 0),
                balance_locked_after: Number(walletBal?.locked ?? 0),
                entry_type: 'WITHDRAWAL',
                reference_type: 'withdrawal_completed',
                reference_id: withdrawal.id,
                notes: `Withdrawal completed: ${withdrawal.net_amount} ${asset.symbol} to ${withdrawal.to_address} | TX: ${txHash}`
              });
            console.log(`[process-pending-withdrawals] Ledger entry recorded for ${withdrawal.id}`);
          } else {
            console.log(`[process-pending-withdrawals] Ledger entry already exists for ${withdrawal.id}, skipping duplicate`);
          }

          console.log(`[process-pending-withdrawals] ✓ Completed ${asset.symbol} withdrawal ${withdrawal.id}: ${txHash} (ledger recorded)`);
          processed++;
          results.push({ id: withdrawal.id, status: 'completed', tx_hash: txHash, symbol: asset.symbol });
        }
      } catch (error: any) {
        console.error(`[process-pending-withdrawals] Error processing withdrawal ${withdrawal.id}:`, error);

        const reason = error.message || 'On-chain transfer failed';
        
        // ── DEAD-LETTER RETRY QUEUE ──
        // Insert or update retry queue with exponential backoff
        const { data: existingRetry } = await supabase
          .from('withdrawal_retry_queue')
          .select('retry_count, max_retries')
          .eq('withdrawal_id', withdrawal.id)
          .maybeSingle();

        const currentRetry = existingRetry?.retry_count ?? 0;
        const maxRetries = existingRetry?.max_retries ?? 5;

        if (currentRetry >= maxRetries) {
          // Permanent failure — refund and alert admin
          console.error(`[process-pending-withdrawals] PERMANENT FAILURE for ${withdrawal.id} after ${currentRetry} retries`);
          
          const { error: refundError } = await supabase.rpc(
            'refund_failed_withdrawal',
            { p_withdrawal_id: withdrawal.id, p_reason: `Permanent failure after ${currentRetry} retries: ${reason}` }
          );
          
          await supabase.from('withdrawal_retry_queue').upsert({
            withdrawal_id: withdrawal.id,
            retry_count: currentRetry,
            last_error: reason,
            status: 'failed_permanent',
            next_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'withdrawal_id' });

          await supabase.from('admin_notifications').insert({
            type: 'withdrawal_permanent_failure',
            priority: 'critical',
            title: `Withdrawal Permanently Failed: ${withdrawal.id}`,
            message: `Withdrawal of ${withdrawal.amount} ${withdrawal.assets?.symbol} to ${withdrawal.to_address} failed after ${currentRetry} retries. Last error: ${reason}. ${refundError ? 'REFUND ALSO FAILED — MANUAL INTERVENTION REQUIRED' : 'Funds refunded.'}`,
            related_user_id: withdrawal.user_id,
            related_resource_id: withdrawal.id,
          });

          results.push({ id: withdrawal.id, status: 'failed_permanent', error: reason, refunded: !refundError });
        } else {
          // Schedule retry with exponential backoff: 2^retry * 5 minutes
          const backoffMinutes = Math.pow(2, currentRetry) * 5;
          const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
          
          await supabase.from('withdrawal_retry_queue').upsert({
            withdrawal_id: withdrawal.id,
            retry_count: currentRetry + 1,
            last_error: reason,
            status: 'pending',
            next_retry_at: nextRetryAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'withdrawal_id' });

          console.log(`[process-pending-withdrawals] Retry ${currentRetry + 1}/${maxRetries} scheduled for ${withdrawal.id} at ${nextRetryAt} (backoff: ${backoffMinutes}m)`);
          results.push({ id: withdrawal.id, status: 'retry_scheduled', retry: currentRetry + 1, next_retry: nextRetryAt, error: reason });
        }

        if (error.message?.includes('nonce') || error.message?.includes('replacement')) {
          console.warn(`[process-pending-withdrawals] Nonce conflict detected, re-fetching...`);
          currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
          console.log(`[process-pending-withdrawals] Recovered nonce: ${currentNonce}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: pendingWithdrawals.length,
        results,
        gas_balance_bnb: bnbBalanceEth,
        cumulative_outflow_usdt: cumulativeOutflowUsdt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-pending-withdrawals] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
