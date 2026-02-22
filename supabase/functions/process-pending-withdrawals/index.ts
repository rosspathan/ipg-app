import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ERC20 transfer ABI
const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

// Gas monitoring thresholds (in BNB)
const LOW_GAS_WARN_THRESHOLD = 0.05;  // Log warning
const LOW_GAS_ABORT_THRESHOLD = 0.005; // Abort processing entirely

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
      console.error(`[process-pending-withdrawals] CRITICAL: BNB balance ${bnbBalanceEth} below abort threshold ${LOW_GAS_ABORT_THRESHOLD}. Halting.`);
      // Log critical alert to security_audit_log
      await supabase.from('security_audit_log').insert({
        event_type: 'LOW_GAS_CRITICAL',
        severity: 'critical',
        source: 'process-pending-withdrawals',
        details: { bnb_balance: bnbBalanceEth, threshold: LOW_GAS_ABORT_THRESHOLD, pending_count: pendingWithdrawals.length },
      });
      // Also create an admin notification
      await supabase.from('admin_notifications').insert({
        type: 'hot_wallet_gas',
        priority: 'critical',
        title: 'Hot Wallet Gas CRITICAL — Withdrawals Halted',
        message: `BNB balance is ${bnbBalanceEth.toFixed(6)} BNB (below ${LOW_GAS_ABORT_THRESHOLD}). All withdrawal processing has been halted. Refuel the hot wallet immediately.`,
      });
      return new Response(
        JSON.stringify({ error: 'Insufficient gas — withdrawals halted', bnb_balance: bnbBalanceEth }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (bnbBalanceEth < LOW_GAS_WARN_THRESHOLD) {
      console.warn(`[process-pending-withdrawals] LOW_GAS_ALERT: BNB balance ${bnbBalanceEth} below warning threshold ${LOW_GAS_WARN_THRESHOLD}`);
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
        message: `BNB balance is ${bnbBalanceEth.toFixed(6)} BNB (below ${LOW_GAS_WARN_THRESHOLD}). Please refuel to avoid withdrawal disruptions.`,
      });
    }

    // ── Phase 2b: Manual Nonce Management ─────────────────────────────
    // Fetch the confirmed nonce once; increment manually per TX to prevent
    // nonce collisions when processing multiple withdrawals sequentially.
    let currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
    console.log(`[process-pending-withdrawals] Starting nonce: ${currentNonce}`);

    let processed = 0;
    const results: any[] = [];

    for (const withdrawal of pendingWithdrawals) {
      try {
        const asset = withdrawal.assets;
        if (!asset) {
          console.error(`[process-pending-withdrawals] No asset data for withdrawal ${withdrawal.id}`);
          results.push({ id: withdrawal.id, status: 'error', error: 'Asset not found' });
          continue;
        }

        const contractAddress = asset.contract_address;
        const decimals = asset.decimals || 18;
        const netAmount = withdrawal.net_amount;
        const toAddress = withdrawal.to_address;

        console.log(`[process-pending-withdrawals] Sending ${netAmount} ${asset.symbol} to ${toAddress} (nonce: ${currentNonce})`);

        let txHash: string;

        if (contractAddress) {
          // ERC20/BEP20 token transfer with explicit nonce
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
          // Native BNB transfer with explicit nonce
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

        // Increment nonce after successful broadcast
        currentNonce++;

        // Update withdrawal with real tx_hash and completed status
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
          console.log(`[process-pending-withdrawals] ✓ Completed ${asset.symbol} withdrawal ${withdrawal.id}: ${txHash}`);
          processed++;
          results.push({ id: withdrawal.id, status: 'completed', tx_hash: txHash, symbol: asset.symbol });
        }
      } catch (error: any) {
        console.error(`[process-pending-withdrawals] Error processing withdrawal ${withdrawal.id}:`, error);

        // Atomically refund the balance and mark as failed via RPC
        const reason = error.message || 'On-chain transfer failed';
        const { data: refundResult, error: refundError } = await supabase.rpc(
          'refund_failed_withdrawal',
          { p_withdrawal_id: withdrawal.id, p_reason: reason }
        );

        if (refundError) {
          console.error(`[process-pending-withdrawals] CRITICAL: Atomic refund failed for ${withdrawal.id}:`, refundError);
        } else {
          console.log(`[process-pending-withdrawals] Refund result for ${withdrawal.id}:`, refundResult);
        }

        results.push({ id: withdrawal.id, status: 'error', error: error.message, refunded: !refundError });

        // Do NOT increment nonce on failure — the TX was never broadcast
        // If it was a nonce-related error, re-fetch to recover
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
