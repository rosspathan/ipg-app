import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSCSCAN_API_KEY = Deno.env.get('BSCSCAN_API_KEY') || '';
const BSC_RPC_URL = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org/';

// ⛔ IMMUTABLE: Staking is EXCLUSIVELY locked to IPG. Do NOT change this.
const IPG_CONTRACT = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E';

// Forbidden contracts that must NEVER be credited to staking accounts
const FORBIDDEN_CONTRACTS = [
  '0x7437d96d2dca13525b4a6021865d41997dee1f09', // USDI — permanently forbidden
  '0x742575866c0eb1b6b6350159d536447477085cef', // BSK  — permanently forbidden
  '0x55d398326f99059ff775485246999027b3197955', // USDT — permanently forbidden
];

// ERC-20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

async function getTransfersByRPC(hotWallet: string, fromBlock: string = '0x4E00000'): Promise<any[]> {
  // Encode the recipient (to) topic — padded to 32 bytes
  const paddedTo = '0x000000000000000000000000' + hotWallet.replace('0x', '').toLowerCase();

  const rpcBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getLogs',
    params: [{
      fromBlock,
      toBlock: 'latest',
      address: IPG_CONTRACT,
      topics: [TRANSFER_TOPIC, null, paddedTo]
    }]
  };

  const resp = await fetch(BSC_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rpcBody),
  });

  const data = await resp.json();
  return data.result || [];
}

async function getTransactionDetails(txHash: string): Promise<any> {
  const resp = await fetch(BSC_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    }),
  });
  const data = await resp.json();
  return data.result;
}

async function processDeposit(
  supabase: any,
  fromAddress: string,
  amount: number,
  txHash: string,
  userId?: string
): Promise<{ success: boolean; credited: number; error?: string }> {
  // Verify tx_hash not already processed
  const { data: existingDeposit } = await supabase
    .from('crypto_staking_ledger')
    .select('id')
    .eq('tx_hash', txHash)
    .maybeSingle();

  if (existingDeposit) {
    console.log('[staking-deposit-monitor] Already processed:', txHash);
    return { success: true, credited: 0 };
  }

  // Find user by wallet address if userId not provided
  let depositUserId = userId;
  if (!depositUserId) {
    // ── Enhancement 1: Strict wallet matching — detect ambiguous senders ──
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`bsc_wallet_address.ilike.${fromAddress},wallet_address.ilike.${fromAddress}`);

    if (!matchingProfiles || matchingProfiles.length === 0) {
      // Fallback: exact case-insensitive match on bsc_wallet_address only
      const { data: strictMatches } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('bsc_wallet_address', fromAddress);

      if (!strictMatches || strictMatches.length === 0) {
        console.log('[staking-deposit-monitor] Unknown sender:', fromAddress);
        return { success: false, credited: 0, error: 'Unknown sender' };
      }

      if (strictMatches.length > 1) {
        // AMBIGUOUS: multiple users registered the same wallet — block and alert admin
        console.error(
          `[staking-deposit-monitor] ⚠️ AMBIGUOUS WALLET: ${fromAddress} is registered to ${strictMatches.length} users. Blocking deposit of ${amount} IPG (tx: ${txHash})`
        );
        // Insert an admin notification
        await supabase.from('admin_notifications').insert({
          title: '⚠️ Ambiguous Staking Deposit Blocked',
          message: `Deposit of ${amount} IPG (tx: ${txHash}) from wallet ${fromAddress} was BLOCKED because ${strictMatches.length} user accounts share this wallet address. Manual review required.`,
          type: 'security_alert',
          priority: 'critical',
          metadata: { tx_hash: txHash, from_address: fromAddress, amount, user_ids: strictMatches.map((p: any) => p.user_id) }
        });
        return { success: false, credited: 0, error: `Ambiguous wallet: ${strictMatches.length} users share address ${fromAddress}` };
      }

      depositUserId = strictMatches[0].user_id;
    } else if (matchingProfiles.length > 1) {
      // AMBIGUOUS: multiple users match this wallet — block and alert
      console.error(
        `[staking-deposit-monitor] ⚠️ AMBIGUOUS WALLET: ${fromAddress} matched ${matchingProfiles.length} profiles. Blocking deposit.`
      );
      await supabase.from('admin_notifications').insert({
        title: '⚠️ Ambiguous Staking Deposit Blocked',
        message: `Deposit of ${amount} IPG (tx: ${txHash}) from wallet ${fromAddress} was BLOCKED because ${matchingProfiles.length} user accounts share this wallet address. Manual review required.`,
        type: 'security_alert',
        priority: 'critical',
        metadata: { tx_hash: txHash, from_address: fromAddress, amount, user_ids: matchingProfiles.map((p: any) => p.user_id) }
      });
      return { success: false, credited: 0, error: `Ambiguous wallet: ${matchingProfiles.length} users share address ${fromAddress}` };
    } else {
      depositUserId = matchingProfiles[0].user_id;
    }
  }

  console.log('[staking-deposit-monitor] Processing', amount, 'IPG for user', depositUserId);

  // Get or create staking account
  let { data: account } = await supabase
    .from('user_staking_accounts')
    .select('*')
    .eq('user_id', depositUserId)
    .maybeSingle();

  if (!account) {
    const { data: newAccount, error: createError } = await supabase
      .from('user_staking_accounts')
      .insert({
        user_id: depositUserId,
        currency: 'IPG',
        available_balance: 0,
        staked_balance: 0,
        total_rewards_earned: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('[staking-deposit-monitor] Error creating account:', createError);
      return { success: false, credited: 0, error: createError.message };
    }
    account = newAccount;
    console.log('[staking-deposit-monitor] Created staking account for user', depositUserId);
  }

  const balanceBefore = parseFloat(account.available_balance) || 0;
  const balanceAfter = balanceBefore + amount;

  // Update balance
  const { error: updateError } = await supabase
    .from('user_staking_accounts')
    .update({
      available_balance: balanceAfter,
      updated_at: new Date().toISOString()
    })
    .eq('id', account.id);

  if (updateError) {
    console.error('[staking-deposit-monitor] Error updating balance:', updateError);
    return { success: false, credited: 0, error: updateError.message };
  }

  // Record in ledger
  await supabase
    .from('crypto_staking_ledger')
    .insert({
      user_id: depositUserId,
      staking_account_id: account.id,
      tx_type: 'deposit',
      amount: amount,
      fee_amount: 0,
      currency: 'IPG',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      tx_hash: txHash,
      notes: `On-chain deposit from ${fromAddress}`
    });

  console.log('[staking-deposit-monitor] ✅ Credited', amount, 'IPG to user', depositUserId);
  return { success: true, credited: amount };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    userId = body.user_id || userId;

    // Support manual tx_hash credit (for recovery)
    const manualTxHash = body.tx_hash;
    const manualAmount = body.amount;
    const manualFrom = body.from_address;

    console.log('[staking-deposit-monitor] Starting for user:', userId);

    // Get staking config
    const { data: config, error: configError } = await supabase
      .from('crypto_staking_config')
      .select('admin_hot_wallet_address')
      .single();

    if (configError || !config?.admin_hot_wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Staking not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hotWalletAddress = config.admin_hot_wallet_address.toLowerCase();

    // ── Mode 1: Manual recovery by tx_hash ──
    if (manualTxHash && manualAmount && manualFrom) {
      console.log('[staking-deposit-monitor] Manual recovery mode for tx:', manualTxHash);
      
      // Validate this is an IPG tx by checking the contract
      const contractAddr = (body.contract_address || IPG_CONTRACT).toLowerCase();
      if (contractAddr !== IPG_CONTRACT.toLowerCase() || FORBIDDEN_CONTRACTS.includes(contractAddr)) {
        return new Response(
          JSON.stringify({ error: 'Invalid contract — only IPG allowed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await processDeposit(supabase, manualFrom, manualAmount, manualTxHash, userId || undefined);
      return new Response(
        JSON.stringify({ deposited: result.credited > 0, amount: result.credited, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Mode 2: BscScan API scan ──
    let transactions: any[] = [];
    let usedRPC = false;

    if (BSCSCAN_API_KEY) {
      const apiUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${IPG_CONTRACT}&address=${hotWalletAddress}&page=1&offset=200&sort=desc&apikey=${BSCSCAN_API_KEY}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log('[staking-deposit-monitor] BscScan status:', data.status, 'message:', data.message);

      if (data.status === '1' && data.result?.length > 0) {
        // Filter strictly to IPG only
        transactions = data.result.filter((tx: any) => {
          const addr = (tx.contractAddress || '').toLowerCase();
          if (addr !== IPG_CONTRACT.toLowerCase()) return false;
          if (FORBIDDEN_CONTRACTS.includes(addr)) return false;
          return tx.to?.toLowerCase() === hotWalletAddress;
        }).map((tx: any) => ({
          hash: tx.hash,
          from: tx.from.toLowerCase(),
          amount: parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18')),
        }));
      }
    }

    // ── Mode 3: BSC RPC fallback if BscScan failed or empty ──
    if (transactions.length === 0) {
      console.log('[staking-deposit-monitor] BscScan empty, trying RPC...');
      usedRPC = true;
      try {
        // Start from a recent block (~1 week ago on BSC = ~201600 blocks)
        const currentBlockResp = await fetch(BSC_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        });
        const currentBlockData = await currentBlockResp.json();
        const currentBlock = parseInt(currentBlockData.result, 16);
        // ~7 days on BSC (3s blocks = 28800 blocks/day * 7 = 201600), but cap at last 30 days for new deposits
        const fromBlock = '0x' + Math.max(0, currentBlock - 864000).toString(16);

        const logs = await getTransfersByRPC(hotWalletAddress, fromBlock);
        console.log('[staking-deposit-monitor] RPC logs found:', logs.length);

        for (const log of logs) {
          // topics[1] = from (padded), topics[2] = to (padded)
          const from = '0x' + (log.topics[1] || '').slice(26);
          const to = '0x' + (log.topics[2] || '').slice(26);
          if (to.toLowerCase() !== hotWalletAddress) continue;

          // Parse amount from data (uint256 hex)
          const rawAmount = BigInt(log.data);
          const amount = Number(rawAmount) / 1e18;

          transactions.push({
            hash: log.transactionHash,
            from: from.toLowerCase(),
            amount,
          });
        }
      } catch (rpcErr) {
        console.error('[staking-deposit-monitor] RPC error:', rpcErr);
      }
    }

    // Filter to specific user's wallet if requested
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', userId)
        .single();

      if (profile) {
        const userWallet = (profile.bsc_wallet_address || profile.wallet_address || '').toLowerCase();
        transactions = transactions.filter(tx => tx.from === userWallet);
      }
    }

    console.log('[staking-deposit-monitor] Processing', transactions.length, 'incoming transfers (usedRPC:', usedRPC, ')');

    let totalDeposited = 0;
    let processedCount = 0;

    for (const tx of transactions) {
      const result = await processDeposit(supabase, tx.from, tx.amount, tx.hash);
      if (result.credited > 0) {
        totalDeposited += result.credited;
        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        deposited: processedCount > 0,
        amount: totalDeposited,
        count: processedCount,
        scanned: transactions.length,
        usedRPC,
        message: processedCount > 0
          ? `Credited ${processedCount} deposits totaling ${totalDeposited} IPG`
          : 'No new deposits to process'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[staking-deposit-monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
