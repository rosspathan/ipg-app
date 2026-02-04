/**
 * Monitor Custodial Deposits Edge Function
 * 
 * Scans the platform hot wallet for incoming token transfers using RPC eth_getLogs.
 * NO BSCSCAN API DEPENDENCY - uses direct RPC calls only.
 * 
 * When a deposit is detected:
 * 1. Identifies the sender (user) by matching tx.from to registered wallets
 * 2. Creates a custodial_deposits record with ACTUAL tx.from address
 * 3. Credits the user's wallet_balances (trading balance) when confirmed
 * 
 * SECURITY: Only credits deposits where tx.from EXACTLY matches a registered user wallet.
 * 
 * This function should be called periodically (e.g., every 1-2 minutes via cron)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ERC20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Default BSC RPC endpoints (public, no API key needed)
const DEFAULT_BSC_RPC_URLS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
];

interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  contractAddress: string;
  logIndex: number;
}

interface MatchedUser {
  user_id: string;
  matched_address: string;
  match_source: 'profiles_wallet' | 'profiles_bsc' | 'wallets_user';
}

const REQUIRED_CONFIRMATIONS = 15;
const BLOCKS_PER_2_HOURS = 2400; // BSC ~3 sec blocks, 2 hours ≈ 2400 blocks

function toLowerHexAddress(addr: string | null | undefined): string {
  return (addr || '').trim().toLowerCase();
}

function formatTokenAmount(rawValue: string, decimals: number): number {
  try {
    const v = BigInt(rawValue);
    const d = Math.max(0, Math.min(36, Number.isFinite(decimals) ? decimals : 18));
    if (d === 0) return Number(v);

    const s = v.toString();
    const padded = s.padStart(d + 1, '0');
    const intPart = padded.slice(0, -d);
    let fracPart = padded.slice(-d);
    fracPart = fracPart.replace(/0+$/, '');
    return parseFloat(fracPart ? `${intPart}.${fracPart}` : intPart);
  } catch {
    return Number(rawValue) / Math.pow(10, decimals || 18);
  }
}

function hexToAddress(hex: string): string {
  // Convert 32-byte padded address topic to 20-byte address
  return '0x' + hex.slice(-40).toLowerCase();
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

async function rpcCall(rpcUrl: string, method: string, params: any[]): Promise<any> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

async function tryRpcCall(rpcUrls: string[], method: string, params: any[]): Promise<any> {
  let lastError: Error | null = null;

  for (const url of rpcUrls) {
    try {
      return await rpcCall(url, method, params);
    } catch (e: any) {
      lastError = e;
      console.warn(`[RPC] ${url} failed for ${method}:`, e?.message);
    }
  }

  throw lastError || new Error('All RPC endpoints failed');
}

async function getCurrentBlockNumber(rpcUrls: string[]): Promise<number> {
  const hex = await tryRpcCall(rpcUrls, 'eth_blockNumber', []);
  return parseInt(hex, 16);
}

async function getTransactionByHash(rpcUrls: string[], txHash: string): Promise<any> {
  return await tryRpcCall(rpcUrls, 'eth_getTransactionByHash', [txHash]);
}

/**
 * Fetch ERC20 Transfer events to the hot wallet using eth_getLogs
 * This replaces BscScan API entirely
 */
async function fetchTransferEventsViaRpc(params: {
  rpcUrls: string[];
  hotWalletAddress: string;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
}): Promise<TokenTransfer[]> {
  const { rpcUrls, hotWalletAddress, contractAddresses, fromBlock, toBlock } = params;

  // Pad the hot wallet address for topic matching (32 bytes)
  const paddedTo = '0x000000000000000000000000' + hotWalletAddress.slice(2).toLowerCase();

  const transfers: TokenTransfer[] = [];

  // Query logs for each contract (could batch but safer individually for large lists)
  for (const contractAddress of contractAddresses) {
    try {
      const logs = await tryRpcCall(rpcUrls, 'eth_getLogs', [{
        address: contractAddress.toLowerCase(),
        topics: [
          TRANSFER_EVENT_TOPIC,  // Transfer event
          null,                   // from: any
          paddedTo,               // to: hot wallet
        ],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16),
      }]);

      if (!Array.isArray(logs)) continue;

      for (const log of logs) {
        if (!log.topics || log.topics.length < 3) continue;

        const transfer: TokenTransfer = {
          hash: log.transactionHash,
          from: hexToAddress(log.topics[1]),
          to: hexToAddress(log.topics[2]),
          value: hexToBigInt(log.data || '0x0').toString(),
          blockNumber: parseInt(log.blockNumber, 16),
          contractAddress: log.address.toLowerCase(),
          logIndex: parseInt(log.logIndex, 16),
        };

        transfers.push(transfer);
      }

      console.log(`[monitor-custodial-deposits] ${contractAddress.slice(0, 10)}... : ${logs.length} Transfer logs`);
    } catch (e: any) {
      console.error(`[monitor-custodial-deposits] eth_getLogs failed for ${contractAddress}:`, e?.message);
    }
  }

  return transfers;
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
    console.log('[monitor-custodial-deposits] Starting RPC-based hot wallet deposit scan...');

    // Build RPC URL list (custom first, then defaults)
    const customRpc = Deno.env.get('BSC_RPC_URL')?.trim();
    const rpcUrls = customRpc ? [customRpc, ...DEFAULT_BSC_RPC_URLS] : DEFAULT_BSC_RPC_URLS;
    console.log(`[monitor-custodial-deposits] Using ${rpcUrls.length} RPC endpoints`);

    // Get active Trading hot wallet
    let hotWallet = null;
    
    const { data: tradingWallet } = await supabase
      .from('platform_hot_wallet')
      .select('address, chain, label')
      .eq('is_active', true)
      .eq('chain', 'BSC')
      .ilike('label', '%Trading%')
      .limit(1)
      .maybeSingle();

    if (tradingWallet?.address) {
      hotWallet = tradingWallet;
      console.log(`[monitor-custodial-deposits] Using Trading Hot Wallet: ${tradingWallet.address}`);
    } else {
      const { data: anyWallet } = await supabase
        .from('platform_hot_wallet')
        .select('address, chain, label')
        .eq('is_active', true)
        .eq('chain', 'BSC')
        .limit(1)
        .maybeSingle();
      
      if (anyWallet?.address) {
        hotWallet = anyWallet;
        console.log(`[monitor-custodial-deposits] Using fallback wallet: ${anyWallet.label} - ${anyWallet.address}`);
      }
    }

    if (!hotWallet) {
      console.error('[monitor-custodial-deposits] No active BSC hot wallet found');
      return new Response(
        JSON.stringify({ success: false, error: 'No active hot wallet configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hotWalletAddress = hotWallet.address.toLowerCase();
    console.log(`[monitor-custodial-deposits] Hot wallet: ${hotWalletAddress}`);

    // Fetch assets with deposit enabled
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, contract_address, decimals')
      .eq('is_active', true)
      .eq('deposit_enabled', true)
      .not('contract_address', 'is', null);

    if (assetsError || !assets || assets.length === 0) {
      console.log('[monitor-custodial-deposits] No deposit-enabled assets found');
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to monitor', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[monitor-custodial-deposits] Monitoring ${assets.length} assets`);

    // Get current block number
    const currentBlock = await getCurrentBlockNumber(rpcUrls);
    console.log(`[monitor-custodial-deposits] Current block: ${currentBlock}`);

    // Calculate block range (last 2 hours)
    const fromBlock = Math.max(1, currentBlock - BLOCKS_PER_2_HOURS);
    console.log(`[monitor-custodial-deposits] Scanning blocks ${fromBlock} to ${currentBlock}`);

    // Get contract addresses
    const contractAddresses = assets
      .map(a => a.contract_address?.toLowerCase())
      .filter(Boolean) as string[];

    // Fetch all Transfer events via RPC
    const allTransfers = await fetchTransferEventsViaRpc({
      rpcUrls,
      hotWalletAddress,
      contractAddresses,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`[monitor-custodial-deposits] Found ${allTransfers.length} total inbound transfers`);

    // Group transfers by contract for processing
    const transfersByContract = new Map<string, TokenTransfer[]>();
    for (const tx of allTransfers) {
      const contract = tx.contractAddress.toLowerCase();
      const list = transfersByContract.get(contract) || [];
      list.push(tx);
      transfersByContract.set(contract, list);
    }

    let totalDiscovered = 0;
    let totalCredited = 0;
    let totalSkippedUnknown = 0;
    const results: any[] = [];

    // Process each asset
    for (const asset of assets) {
      try {
        const contract = toLowerHexAddress(asset.contract_address);
        const inboundTransfers = contract ? (transfersByContract.get(contract) || []) : [];

        if (inboundTransfers.length === 0) {
          continue;
        }

        console.log(`[monitor-custodial-deposits] ${asset.symbol}: ${inboundTransfers.length} inbound transfers`);
        totalDiscovered += inboundTransfers.length;

        for (const tx of inboundTransfers) {
          const txHash = tx.hash.toLowerCase();
          const actualSender = tx.from.toLowerCase();
          const decimals = asset.decimals || 18;
          const amount = formatTokenAmount(tx.value, decimals);
          const confirmations = currentBlock - tx.blockNumber;

          // Check if already processed
          const { data: existing } = await supabase
            .from('custodial_deposits')
            .select('id, status, confirmations, from_address, user_id')
            .eq('tx_hash', txHash)
            .maybeSingle();

          if (existing) {
            // SECURITY: Verify the stored from_address matches actual tx sender
            if (existing.from_address?.toLowerCase() !== actualSender) {
              console.error(`[monitor-custodial-deposits] SECURITY ALERT: from_address mismatch for ${txHash}`);
              await logDepositAudit(supabase, 'FROM_ADDRESS_MISMATCH', {
                tx_hash: txHash,
                stored_from: existing.from_address,
                actual_from: actualSender,
                user_id: existing.user_id
              });
              continue;
            }

            // Update confirmations if needed
            if (existing.status === 'pending' || existing.status === 'confirmed') {
              if (confirmations >= REQUIRED_CONFIRMATIONS && existing.status !== 'credited') {
                await creditDeposit(supabase, existing.id, asset.id, amount);
                totalCredited++;
                results.push({ tx_hash: txHash, action: 'credited', symbol: asset.symbol, amount });
              } else if (confirmations !== existing.confirmations) {
                await supabase
                  .from('custodial_deposits')
                  .update({ 
                    confirmations,
                    status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending'
                  })
                  .eq('id', existing.id);
              }
            }
            continue;
          }

          // SECURITY: Find user by ACTUAL tx.from address (strict matching)
          const matchedUser = await findUserByWalletAddress(supabase, actualSender);

          if (!matchedUser) {
            console.log(`[monitor-custodial-deposits] ⚠️ Unknown sender (not registered): ${actualSender}`);
            totalSkippedUnknown++;
            
            await logDepositAudit(supabase, 'UNKNOWN_SENDER', {
              tx_hash: txHash,
              from_address: actualSender,
              amount,
              symbol: asset.symbol
            });
            
            results.push({ 
              tx_hash: txHash, 
              action: 'skipped_unknown_sender', 
              symbol: asset.symbol, 
              amount, 
              from: actualSender 
            });
            continue;
          }

          // SECURITY: Verify the matched address is exactly the tx sender
          if (matchedUser.matched_address.toLowerCase() !== actualSender) {
            console.error(`[monitor-custodial-deposits] CRITICAL: Address match verification failed!`);
            continue;
          }

          console.log(`[monitor-custodial-deposits] ✓ Matched sender ${actualSender} to user ${matchedUser.user_id} via ${matchedUser.match_source}`);

          // Create deposit record with ACTUAL sender address
          await createDepositRecord(
            supabase, 
            matchedUser.user_id, 
            asset.id, 
            amount, 
            txHash, 
            actualSender,
            confirmations,
            matchedUser.match_source
          );

          results.push({ 
            tx_hash: txHash, 
            action: 'discovered', 
            symbol: asset.symbol, 
            amount, 
            from: actualSender,
            user_id: matchedUser.user_id
          });
        }

      } catch (assetError: any) {
        console.error(`[monitor-custodial-deposits] Error processing ${asset.symbol}:`, assetError);
      }
    }

    console.log(`[monitor-custodial-deposits] Complete. Discovered: ${totalDiscovered}, Credited: ${totalCredited}, Unknown: ${totalSkippedUnknown}`);

    return new Response(
      JSON.stringify({
        success: true,
        discovered: totalDiscovered,
        credited: totalCredited,
        skipped_unknown: totalSkippedUnknown,
        results,
        rpc_used: true,
        blocks_scanned: currentBlock - fromBlock,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[monitor-custodial-deposits] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Find a user by their registered wallet address (strict exact match)
 */
async function findUserByWalletAddress(supabase: any, address: string): Promise<MatchedUser | null> {
  const normalizedAddress = address.toLowerCase();

  // Check profiles.wallet_address
  const { data: profileWallet } = await supabase
    .from('profiles')
    .select('user_id, wallet_address')
    .ilike('wallet_address', normalizedAddress)
    .maybeSingle();

  if (profileWallet && profileWallet.wallet_address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: profileWallet.user_id,
      matched_address: profileWallet.wallet_address,
      match_source: 'profiles_wallet'
    };
  }

  // Check profiles.bsc_wallet_address
  const { data: profileBsc } = await supabase
    .from('profiles')
    .select('user_id, bsc_wallet_address')
    .ilike('bsc_wallet_address', normalizedAddress)
    .maybeSingle();

  if (profileBsc && profileBsc.bsc_wallet_address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: profileBsc.user_id,
      matched_address: profileBsc.bsc_wallet_address,
      match_source: 'profiles_bsc'
    };
  }

  // Check wallets_user table
  const { data: userWallet } = await supabase
    .from('wallets_user')
    .select('user_id, address')
    .ilike('address', normalizedAddress)
    .maybeSingle();

  if (userWallet && userWallet.address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: userWallet.user_id,
      matched_address: userWallet.address,
      match_source: 'wallets_user'
    };
  }

  return null;
}

/**
 * Log deposit audit events for security monitoring
 */
async function logDepositAudit(supabase: any, eventType: string, details: any) {
  try {
    await supabase
      .from('admin_notifications')
      .insert({
        type: 'deposit_audit',
        title: `Deposit Audit: ${eventType}`,
        message: JSON.stringify(details),
        priority: eventType === 'FROM_ADDRESS_MISMATCH' ? 'high' : 'normal',
        metadata: { event_type: eventType, ...details }
      });
  } catch (e) {
    console.error('[monitor-custodial-deposits] Failed to log audit event:', e);
  }
}

async function createDepositRecord(
  supabase: any,
  userId: string,
  assetId: string,
  amount: number,
  txHash: string,
  actualFromAddress: string,
  confirmations: number,
  matchSource: string
) {
  const status = confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending';
  
  const { error } = await supabase
    .from('custodial_deposits')
    .insert({
      user_id: userId,
      asset_id: assetId,
      amount,
      tx_hash: txHash,
      from_address: actualFromAddress,
      confirmations,
      status,
      network: 'BSC',
      credited_at: null,
      metadata: {
        match_source: matchSource,
        detected_via: 'rpc_eth_getLogs',
        detected_at: new Date().toISOString()
      }
    });

  if (error) {
    console.error('[monitor-custodial-deposits] Insert error:', error);
    throw error;
  }
}

async function creditDeposit(supabase: any, depositId: string, assetId: string, amount: number) {
  // Get deposit details
  const { data: deposit, error: depositError } = await supabase
    .from('custodial_deposits')
    .select('user_id, status')
    .eq('id', depositId)
    .single();

  if (depositError || !deposit) {
    console.error('[monitor-custodial-deposits] Failed to fetch deposit for crediting:', depositError);
    return;
  }

  if (deposit.status === 'credited') {
    console.log(`[monitor-custodial-deposits] Deposit ${depositId} already credited, skipping`);
    return;
  }

  // Update wallet balance (trading balance)
  const { data: existingBalance } = await supabase
    .from('wallet_balances')
    .select('id, balance')
    .eq('user_id', deposit.user_id)
    .eq('asset_id', assetId)
    .maybeSingle();

  if (existingBalance) {
    await supabase
      .from('wallet_balances')
      .update({ 
        balance: existingBalance.balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingBalance.id);
  } else {
    await supabase
      .from('wallet_balances')
      .insert({
        user_id: deposit.user_id,
        asset_id: assetId,
        balance: amount
      });
  }

  // Create ledger entry
  await supabase
    .from('trading_balance_ledger')
    .insert({
      user_id: deposit.user_id,
      asset_id: assetId,
      amount,
      balance_after: (existingBalance?.balance || 0) + amount,
      tx_type: 'deposit',
      reference_type: 'custodial_deposit',
      reference_id: depositId,
      notes: 'Auto-credited from on-chain deposit (RPC detected)'
    });

  // Mark deposit as credited
  await supabase
    .from('custodial_deposits')
    .update({ 
      status: 'credited',
      credited_at: new Date().toISOString()
    })
    .eq('id', depositId);

  console.log(`[monitor-custodial-deposits] ✓ Credited ${amount} to user ${deposit.user_id}`);
}
