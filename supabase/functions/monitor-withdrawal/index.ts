import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REQUIRED_CONFIRMATIONS = 12;
const BSC_RPC_URL = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for background job
    );

    const { withdrawal_id } = await req.json();

    if (!withdrawal_id) {
      throw new Error('withdrawal_id is required');
    }

    console.log(`[monitor-withdrawal] Monitoring withdrawal: ${withdrawal_id}`);

    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Withdrawal already completed',
          status: 'completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!withdrawal.tx_hash) {
      throw new Error('No transaction hash found');
    }

    // Get current block number from BSC
    const blockResponse = await fetch(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);

    // Get transaction receipt
    const txResponse = await fetch(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [withdrawal.tx_hash],
        id: 1
      })
    });

    const txData = await txResponse.json();

    if (!txData.result) {
      console.log(`[monitor-withdrawal] Transaction not yet mined: ${withdrawal.tx_hash}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transaction pending in mempool',
          status: 'pending',
          confirmations: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const receipt = txData.result;
    const txBlock = parseInt(receipt.blockNumber, 16);
    const confirmations = currentBlock - txBlock + 1;

    console.log(`[monitor-withdrawal] Transaction ${withdrawal.tx_hash}: ${confirmations}/${REQUIRED_CONFIRMATIONS} confirmations`);

    // Check if transaction failed
    if (receipt.status === '0x0') {
      console.error(`[monitor-withdrawal] Transaction failed on blockchain: ${withdrawal.tx_hash}`);
      
      // Update withdrawal to failed
      await supabase
        .from('withdrawals')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal_id);

      // Unlock user's balance
      await supabase.rpc('unlock_balance_for_order', {
        p_user_id: withdrawal.user_id,
        p_asset_symbol: withdrawal.asset_id, // This should be asset symbol, might need adjustment
        p_amount: withdrawal.amount
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Transaction failed on blockchain',
          status: 'failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update confirmations count
    if (confirmations < REQUIRED_CONFIRMATIONS) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Awaiting confirmations: ${confirmations}/${REQUIRED_CONFIRMATIONS}`,
          status: 'processing',
          confirmations,
          required_confirmations: REQUIRED_CONFIRMATIONS
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transaction is confirmed! Update withdrawal to completed
    await supabase
      .from('withdrawals')
      .update({ 
        status: 'completed',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal_id);

    // Deduct the withdrawn amount from user's balance (locked + total)
    console.log(`[monitor-withdrawal] Deducting ${withdrawal.amount} from user balance...`);
    
    const { data: deductResult, error: deductError } = await supabase.rpc(
      'complete_withdrawal_balance_deduction',
      {
        p_user_id: withdrawal.user_id,
        p_asset_id: withdrawal.asset_id,
        p_amount: withdrawal.amount
      }
    );

    if (deductError || !deductResult) {
      console.error(`[monitor-withdrawal] CRITICAL: Failed to deduct balance:`, deductError);
      // Note: Withdrawal is already on-chain and confirmed, cannot rollback
      // This requires manual intervention to fix the balance
    } else {
      console.log(`[monitor-withdrawal] Successfully deducted ${withdrawal.amount} from balance`);
    }

    console.log(`[monitor-withdrawal] Withdrawal ${withdrawal_id} completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Withdrawal completed successfully',
        status: 'completed',
        confirmations,
        tx_hash: withdrawal.tx_hash,
        explorer_url: `https://bscscan.com/tx/${withdrawal.tx_hash}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[monitor-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
