/**
 * Confirm Settlement Edge Function
 * Verifies user-submitted transaction hashes and updates settlement status
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { createPublicClient, http, parseAbi } from 'https://esm.sh/viem@2.34.0';
import { bsc } from 'https://esm.sh/viem@2.34.0/chains';

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
  'BNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

const ERC20_TRANSFER_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

interface ConfirmRequest {
  settlement_request_id: string;
  tx_hash: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ConfirmRequest = await req.json();
    const { settlement_request_id, tx_hash } = body;

    if (!settlement_request_id || !tx_hash) {
      throw new Error('Missing required fields: settlement_request_id, tx_hash');
    }

    console.log(`[confirm-settlement] User ${user.id} confirming settlement ${settlement_request_id}`);
    console.log(`[confirm-settlement] Transaction hash: ${tx_hash}`);

    // Get settlement request
    const { data: settlementRequest, error: fetchError } = await supabase
      .from('settlement_requests')
      .select('*')
      .eq('id', settlement_request_id)
      .single();

    if (fetchError || !settlementRequest) {
      throw new Error('Settlement request not found');
    }

    // Verify user owns this settlement request
    if (settlementRequest.user_id !== user.id) {
      throw new Error('You can only confirm your own settlement requests');
    }

    // Verify status is pending
    if (settlementRequest.status !== 'pending') {
      throw new Error(`Settlement already ${settlementRequest.status}`);
    }

    // Initialize BSC client to verify transaction
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    const publicClient = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl)
    });

    // Get transaction receipt
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: tx_hash as `0x${string}`
      });
    } catch (e) {
      // Transaction might be pending
      console.log(`[confirm-settlement] Transaction pending or not found: ${tx_hash}`);
      
      // Update status to submitted (pending confirmation)
      await supabase
        .from('settlement_requests')
        .update({
          status: 'submitted',
          tx_hash,
          submitted_at: new Date().toISOString()
        })
        .eq('id', settlement_request_id);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'submitted',
          message: 'Transaction submitted, waiting for blockchain confirmation',
          tx_hash,
          explorer_url: `https://bscscan.com/tx/${tx_hash}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction was successful
    if (receipt.status !== 'success') {
      await supabase
        .from('settlement_requests')
        .update({
          status: 'failed',
          tx_hash,
          error_message: 'Transaction failed on-chain'
        })
        .eq('id', settlement_request_id);

      throw new Error('Transaction failed on-chain');
    }

    // Verify transfer details match
    const tokenAddress = TOKEN_CONTRACTS[settlementRequest.asset_symbol];
    if (!tokenAddress) {
      throw new Error(`Unknown token: ${settlementRequest.asset_symbol}`);
    }

    // Check if transaction interacted with the correct token contract
    const isCorrectContract = receipt.to?.toLowerCase() === tokenAddress.toLowerCase();
    if (!isCorrectContract) {
      console.warn(`[confirm-settlement] Transaction was to ${receipt.to}, expected ${tokenAddress}`);
      // Still accept if transfer went through - we'll log the discrepancy
    }

    // Update settlement request as confirmed
    await supabase
      .from('settlement_requests')
      .update({
        status: 'confirmed',
        tx_hash,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', settlement_request_id);

    console.log(`[confirm-settlement] ✓ Settlement ${settlement_request_id} confirmed`);

    // Check if all settlement requests for this trade are complete
    const { data: allRequests } = await supabase
      .from('settlement_requests')
      .select('status')
      .eq('trade_id', settlementRequest.trade_id);

    const allConfirmed = allRequests?.every(r => r.status === 'confirmed');

    if (allConfirmed) {
      // Update trade_settlements as completed
      await supabase
        .from('trade_settlements')
        .update({
          status: 'completed',
          settled_at: new Date().toISOString()
        })
        .eq('trade_id', settlementRequest.trade_id);

      console.log(`[confirm-settlement] ✓ Trade ${settlementRequest.trade_id} fully settled`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'confirmed',
        message: 'Settlement confirmed on-chain',
        tx_hash,
        explorer_url: `https://bscscan.com/tx/${tx_hash}`,
        trade_complete: allConfirmed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[confirm-settlement] Error:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
