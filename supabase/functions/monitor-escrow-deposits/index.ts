/**
 * Monitor Escrow Deposits Edge Function
 * Watches the escrow contract for Deposit events and credits user escrow_balances
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BSC RPC endpoints
const BSC_RPC = 'https://bsc-dataseed.binance.org';
const REQUIRED_CONFIRMATIONS = 12;

// Deposit event signature: Deposit(address indexed user, address indexed token, uint256 amount, uint256 newBalance)
const DEPOSIT_EVENT_TOPIC = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c';

interface DepositEvent {
  user: string;
  token: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[monitor-escrow-deposits] Starting deposit monitoring...');

    // Get escrow contract config
    const { data: config, error: configError } = await supabase
      .from('escrow_contract_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.log('[monitor-escrow-deposits] No active escrow contract configured');
      return new Response(
        JSON.stringify({ success: false, message: 'No active escrow contract' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const escrowAddress = config.contract_address.toLowerCase();
    console.log('[monitor-escrow-deposits] Escrow contract:', escrowAddress);

    // Get current block number
    const blockResponse = await fetch(BSC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    const blockResult = await blockResponse.json();
    const currentBlock = parseInt(blockResult.result, 16);
    console.log('[monitor-escrow-deposits] Current block:', currentBlock);

    // Determine from block (last 1000 blocks or last checked)
    const fromBlock = Math.max(currentBlock - 1000, 0);
    const toBlock = currentBlock - REQUIRED_CONFIRMATIONS;

    if (toBlock <= fromBlock) {
      return new Response(
        JSON.stringify({ success: true, message: 'Waiting for confirmations', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[monitor-escrow-deposits] Scanning blocks:', fromBlock, 'to', toBlock);

    // Get deposit events from the escrow contract
    const logsResponse = await fetch(BSC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16),
          address: escrowAddress,
          topics: [DEPOSIT_EVENT_TOPIC]
        }],
        id: 1
      })
    });

    const logsResult = await logsResponse.json();
    const logs = logsResult.result || [];
    console.log('[monitor-escrow-deposits] Found', logs.length, 'deposit events');

    // Get asset mapping (contract address -> symbol)
    const { data: assets } = await supabase
      .from('assets')
      .select('symbol, contract_address, decimals')
      .not('contract_address', 'is', null);

    const assetMap = new Map();
    assets?.forEach(asset => {
      if (asset.contract_address) {
        assetMap.set(asset.contract_address.toLowerCase(), {
          symbol: asset.symbol,
          decimals: asset.decimals || 18
        });
      }
    });

    let processedCount = 0;
    let creditedCount = 0;

    for (const log of logs) {
      const txHash = log.transactionHash;
      
      // Check if already processed
      const { data: existing } = await supabase
        .from('escrow_deposits')
        .select('id')
        .eq('tx_hash', txHash)
        .single();

      if (existing) {
        console.log('[monitor-escrow-deposits] Already processed:', txHash);
        continue;
      }

      try {
        // Parse event data
        // topics[1] = user address (indexed)
        // topics[2] = token address (indexed)
        // data = amount, newBalance
        const userAddress = '0x' + log.topics[1].slice(26).toLowerCase();
        const tokenAddress = '0x' + log.topics[2].slice(26).toLowerCase();
        
        // Decode data (amount is first 32 bytes)
        const amountHex = log.data.slice(0, 66);
        const amountRaw = BigInt(amountHex);
        
        const assetInfo = assetMap.get(tokenAddress);
        if (!assetInfo) {
          console.log('[monitor-escrow-deposits] Unknown token:', tokenAddress);
          continue;
        }

        const decimals = assetInfo.decimals;
        const amount = Number(amountRaw) / Math.pow(10, decimals);
        const symbol = assetInfo.symbol;

        console.log('[monitor-escrow-deposits] Deposit found:', {
          user: userAddress,
          token: symbol,
          amount,
          txHash
        });

        // Find user by wallet address
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('bsc_wallet_address', userAddress)
          .single();

        if (!profile) {
          console.log('[monitor-escrow-deposits] No user found for wallet:', userAddress);
          continue;
        }

        // Insert deposit record
        const { error: insertError } = await supabase
          .from('escrow_deposits')
          .insert({
            user_id: profile.user_id,
            asset_symbol: symbol,
            amount,
            tx_hash: txHash,
            from_address: userAddress,
            status: 'confirmed',
            confirmations: REQUIRED_CONFIRMATIONS,
            required_confirmations: REQUIRED_CONFIRMATIONS,
            credited_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[monitor-escrow-deposits] Insert error:', insertError);
          continue;
        }

        // Update or create escrow balance
        const { data: existingBalance } = await supabase
          .from('escrow_balances')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('asset_symbol', symbol)
          .single();

        if (existingBalance) {
          // Update existing balance
          const { error: updateError } = await supabase
            .from('escrow_balances')
            .update({
              deposited: existingBalance.deposited + amount,
              last_deposit_tx: txHash,
              last_deposit_at: new Date().toISOString(),
              escrow_address: escrowAddress
            })
            .eq('id', existingBalance.id);

          if (updateError) {
            console.error('[monitor-escrow-deposits] Update balance error:', updateError);
          } else {
            console.log('[monitor-escrow-deposits] Balance updated for', profile.user_id, symbol);
            creditedCount++;
          }
        } else {
          // Create new balance
          const { error: createError } = await supabase
            .from('escrow_balances')
            .insert({
              user_id: profile.user_id,
              asset_symbol: symbol,
              deposited: amount,
              locked: 0,
              escrow_address: escrowAddress,
              last_deposit_tx: txHash,
              last_deposit_at: new Date().toISOString()
            });

          if (createError) {
            console.error('[monitor-escrow-deposits] Create balance error:', createError);
          } else {
            console.log('[monitor-escrow-deposits] Balance created for', profile.user_id, symbol);
            creditedCount++;
          }
        }

        processedCount++;

      } catch (parseError) {
        console.error('[monitor-escrow-deposits] Parse error for tx:', txHash, parseError);
      }
    }

    console.log('[monitor-escrow-deposits] Complete:', { processedCount, creditedCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        credited: creditedCount,
        blockRange: { from: fromBlock, to: toBlock }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[monitor-escrow-deposits] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
