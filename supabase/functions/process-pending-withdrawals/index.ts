import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ERC20 transfer ABI
const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

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

        console.log(`[process-pending-withdrawals] Sending ${netAmount} ${asset.symbol} to ${toAddress}`);

        let txHash: string;

        if (contractAddress) {
          // ERC20/BEP20 token transfer
          const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
          const amountInUnits = ethers.parseUnits(netAmount.toString(), decimals);
          const tx = await contract.transfer(toAddress, amountInUnits);
          console.log(`[process-pending-withdrawals] TX sent: ${tx.hash}`);
          const receipt = await tx.wait();
          
          if (receipt?.status !== 1) {
            throw new Error('Transaction failed on-chain');
          }
          txHash = tx.hash;
        } else {
          // Native BNB transfer
          const tx = await wallet.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(netAmount.toString()),
          });
          console.log(`[process-pending-withdrawals] BNB TX sent: ${tx.hash}`);
          const receipt = await tx.wait();
          
          if (receipt?.status !== 1) {
            throw new Error('BNB transaction failed on-chain');
          }
          txHash = tx.hash;
        }

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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: pendingWithdrawals.length,
        results
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
