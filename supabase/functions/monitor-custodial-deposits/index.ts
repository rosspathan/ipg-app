/**
 * Monitor Custodial Deposits Edge Function
 *
 * Scans the platform hot wallet for incoming token transfers using pure RPC eth_getLogs.
 * NO BSCSCAN API DEPENDENCY – uses direct RPC calls only.
 *
 * When a deposit is detected:
 * 1. Identifies the sender (user) by matching tx.from to registered wallets
 * 2. Creates a custodial_deposits record (pending)
 * 3. Credits the user's trading balance atomically via credit_custodial_deposit RPC
 *
 * Persistent scan state is stored in custodial_deposit_scan_state to ensure
 * no deposits are missed even if the monitor is down for a period.
 *
 * Call this function periodically (e.g. every 60s via cron).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ERC20 Transfer event signature
const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Public BSC RPC endpoints (no API key)
const DEFAULT_BSC_RPC_URLS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
];

const REQUIRED_CONFIRMATIONS = 15;
const BLOCKS_PER_2_HOURS = 2400;
const BLOCKS_PER_BATCH = 500; // Smaller batches to avoid public RPC limits

// --------------- Helpers ---------------

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

function toLower(addr: string | null | undefined): string {
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
    let fracPart = padded.slice(-d).replace(/0+$/, '');
    return parseFloat(fracPart ? `${intPart}.${fracPart}` : intPart);
  } catch {
    return Number(rawValue) / Math.pow(10, decimals || 18);
  }
}

function hexToAddress(hex: string): string {
  return '0x' + hex.slice(-40).toLowerCase();
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

async function rpcCall(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC request failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.result;
}

async function tryRpc(urls: string[], method: string, params: any[]): Promise<any> {
  let lastErr: Error | null = null;
  for (const url of urls) {
    try {
      return await rpcCall(url, method, params);
    } catch (e: any) {
      lastErr = e;
      console.warn(`[RPC] ${url} failed for ${method}:`, e?.message);
    }
  }
  throw lastErr || new Error('All RPC endpoints failed');
}

async function getCurrentBlockNumber(urls: string[]): Promise<number> {
  const hex = await tryRpc(urls, 'eth_blockNumber', []);
  return parseInt(hex, 16);
}

/**
 * Fetch ERC20 Transfer events to the hot wallet using eth_getLogs with block batching.
 * We split the range into BLOCKS_PER_BATCH-sized chunks to avoid public RPC limits.
 */
async function fetchTransferEventsViaRpc(params: {
  rpcUrls: string[];
  hotWalletAddress: string;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
}): Promise<TokenTransfer[]> {
  const { rpcUrls, hotWalletAddress, contractAddresses, fromBlock, toBlock } = params;
  const paddedTo = '0x000000000000000000000000' + hotWalletAddress.slice(2).toLowerCase();
  const transfers: TokenTransfer[] = [];

  // Helper: query single batch
  async function queryBatch(contract: string, batchFrom: number, batchTo: number): Promise<any[]> {
    try {
      const logs = await tryRpc(rpcUrls, 'eth_getLogs', [
        {
          address: contract.toLowerCase(),
          topics: [TRANSFER_EVENT_TOPIC, null, paddedTo],
          fromBlock: '0x' + batchFrom.toString(16),
          toBlock: '0x' + batchTo.toString(16),
        },
      ]);
      return Array.isArray(logs) ? logs : [];
    } catch (e: any) {
      console.error(`[monitor-custodial-deposits] eth_getLogs failed for ${contract} [${batchFrom}-${batchTo}]:`, e?.message);
      return [];
    }
  }

  for (const contract of contractAddresses) {
    let contractLogs: any[] = [];
    let cursor = fromBlock;

    while (cursor <= toBlock) {
      const batchEnd = Math.min(cursor + BLOCKS_PER_BATCH - 1, toBlock);
      const logs = await queryBatch(contract, cursor, batchEnd);
      contractLogs = contractLogs.concat(logs);
      cursor = batchEnd + 1;
    }

    for (const log of contractLogs) {
      if (!log.topics || log.topics.length < 3) continue;
      transfers.push({
        hash: log.transactionHash,
        from: hexToAddress(log.topics[1]),
        to: hexToAddress(log.topics[2]),
        value: hexToBigInt(log.data || '0x0').toString(),
        blockNumber: parseInt(log.blockNumber, 16),
        contractAddress: log.address.toLowerCase(),
        logIndex: parseInt(log.logIndex, 16),
      });
    }
    console.log(`[monitor-custodial-deposits] ${contract.slice(0, 10)}...: ${contractLogs.length} Transfer logs`);
  }
  return transfers;
}

// --------------- Main Handler ---------------

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

    const customRpc = Deno.env.get('BSC_RPC_URL')?.trim();
    const rpcUrls = customRpc ? [customRpc, ...DEFAULT_BSC_RPC_URLS] : DEFAULT_BSC_RPC_URLS;
    console.log(`[monitor-custodial-deposits] Using ${rpcUrls.length} RPC endpoints`);

    // 1. Resolve Trading hot wallet
    let hotWallet: { address: string; label?: string } | null = null;
    {
      const { data: tradingWallet } = await supabase
        .from('platform_hot_wallet')
        .select('address, label')
        .eq('is_active', true)
        .eq('chain', 'BSC')
        .ilike('label', '%Trading%')
        .limit(1)
        .maybeSingle();
      if (tradingWallet?.address) {
        hotWallet = tradingWallet;
        console.log(`[monitor-custodial-deposits] Using Trading Hot Wallet: ${tradingWallet.address}`);
      } else {
        const { data: any2 } = await supabase
          .from('platform_hot_wallet')
          .select('address, label')
          .eq('is_active', true)
          .eq('chain', 'BSC')
          .limit(1)
          .maybeSingle();
        if (any2?.address) {
          hotWallet = any2;
          console.log(`[monitor-custodial-deposits] Using fallback wallet: ${any2.label} - ${any2.address}`);
        }
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

    // 2. Assets with deposit enabled
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

    // 3. Determine block range (persisted scan state)
    const currentBlock = await getCurrentBlockNumber(rpcUrls);
    console.log(`[monitor-custodial-deposits] Current block: ${currentBlock}`);

    const { data: scanState } = await supabase
      .from('custodial_deposit_scan_state')
      .select('id, last_scanned_block')
      .eq('chain', 'BSC')
      .eq('hot_wallet_address', hotWalletAddress)
      .maybeSingle();

    let fromBlock: number;
    if (scanState && scanState.last_scanned_block > 0) {
      // Continue from last scanned block + 1
      fromBlock = scanState.last_scanned_block + 1;
    } else {
      // First run – look back 2 hours
      fromBlock = Math.max(1, currentBlock - BLOCKS_PER_2_HOURS);
    }
    // Safety cap
    if (fromBlock > currentBlock) fromBlock = currentBlock;
    console.log(`[monitor-custodial-deposits] Scanning blocks ${fromBlock} to ${currentBlock}`);

    const contractAddresses = assets.map((a) => a.contract_address?.toLowerCase()).filter(Boolean) as string[];

    // 4. Fetch Transfer events
    const allTransfers = await fetchTransferEventsViaRpc({
      rpcUrls,
      hotWalletAddress,
      contractAddresses,
      fromBlock,
      toBlock: currentBlock,
    });
    console.log(`[monitor-custodial-deposits] Found ${allTransfers.length} inbound transfers`);

    // Group by contract
    const byContract = new Map<string, TokenTransfer[]>();
    for (const tx of allTransfers) {
      const c = tx.contractAddress;
      byContract.set(c, [...(byContract.get(c) || []), tx]);
    }

    let totalDiscovered = 0;
    let totalCredited = 0;
    let totalSkippedUnknown = 0;
    const results: any[] = [];

    // 5. Process transfers per asset
    for (const asset of assets) {
      const contract = toLower(asset.contract_address);
      const inbound = byContract.get(contract) || [];
      if (inbound.length === 0) continue;
      console.log(`[monitor-custodial-deposits] ${asset.symbol}: ${inbound.length} inbound transfers`);
      totalDiscovered += inbound.length;

      for (const tx of inbound) {
        const txHash = tx.hash.toLowerCase();
        const actualSender = tx.from.toLowerCase();
        const decimals = asset.decimals || 18;
        const amount = formatTokenAmount(tx.value, decimals);
        const confirmations = currentBlock - tx.blockNumber;

        // Check existing record
        const { data: existing } = await supabase
          .from('custodial_deposits')
          .select('id, status, confirmations, from_address, user_id')
          .eq('tx_hash', txHash)
          .maybeSingle();

        if (existing) {
          // Verify from_address integrity
          if (existing.from_address?.toLowerCase() !== actualSender) {
            console.error(`[monitor-custodial-deposits] SECURITY ALERT: from_address mismatch for ${txHash}`);
            await logAudit(supabase, 'FROM_ADDRESS_MISMATCH', {
              tx_hash: txHash,
              stored_from: existing.from_address,
              actual_from: actualSender,
              user_id: existing.user_id,
            });
            continue;
          }

          // Credit if confirmed
          if (existing.status !== 'credited' && confirmations >= REQUIRED_CONFIRMATIONS) {
            const creditResult = await creditDeposit(supabase, existing.id);
            if (creditResult.success) {
              totalCredited++;
              results.push({ tx_hash: txHash, action: 'credited', symbol: asset.symbol, amount });
            }
          } else if (existing.confirmations !== confirmations && existing.status !== 'credited') {
            await supabase
              .from('custodial_deposits')
              .update({
                confirmations,
                status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          }
          continue;
        }

        // New deposit: find user by strict wallet match
        const matchedUser = await findUserByWallet(supabase, actualSender);
        if (!matchedUser) {
          console.log(`[monitor-custodial-deposits] ⚠️ Unknown sender (not registered): ${actualSender}`);
          totalSkippedUnknown++;
          await logAudit(supabase, 'UNKNOWN_SENDER', {
            tx_hash: txHash,
            from_address: actualSender,
            amount,
            symbol: asset.symbol,
          });
          results.push({
            tx_hash: txHash,
            action: 'skipped_unknown_sender',
            symbol: asset.symbol,
            amount,
            from: actualSender,
          });
          continue;
        }

        if (matchedUser.matched_address.toLowerCase() !== actualSender) {
          console.error(`[monitor-custodial-deposits] CRITICAL: Address match verification failed!`);
          continue;
        }

        console.log(`[monitor-custodial-deposits] ✓ Matched sender ${actualSender} to user ${matchedUser.user_id} via ${matchedUser.match_source}`);

        // Insert deposit record
        const { data: newDeposit, error: insertError } = await supabase
          .from('custodial_deposits')
          .insert({
            user_id: matchedUser.user_id,
            asset_id: asset.id,
            amount,
            tx_hash: txHash,
            from_address: actualSender,
            confirmations,
            status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending',
            required_confirmations: REQUIRED_CONFIRMATIONS,
            credited_at: null,
          })
          .select('id')
          .single();

        if (insertError) {
          // Unique constraint -> already recorded
          if (insertError.code === '23505') {
            console.warn(`[monitor-custodial-deposits] Duplicate insert for ${txHash}, skipping`);
          } else {
            console.error(`[monitor-custodial-deposits] Insert error for ${txHash}:`, insertError);
          }
          continue;
        }

        results.push({
          tx_hash: txHash,
          action: 'discovered',
          symbol: asset.symbol,
          amount,
          from: actualSender,
          user_id: matchedUser.user_id,
        });

        // Credit immediately if confirmed
        if (confirmations >= REQUIRED_CONFIRMATIONS && newDeposit?.id) {
          const creditResult = await creditDeposit(supabase, newDeposit.id);
          if (creditResult.success && creditResult.status === 'credited') {
            totalCredited++;
            results.push({ tx_hash: txHash, action: 'credited', symbol: asset.symbol, amount });
          }
        }
      }
    }

    // 6. Update scan state
    if (scanState?.id) {
      await supabase
        .from('custodial_deposit_scan_state')
        .update({ last_scanned_block: currentBlock, updated_at: new Date().toISOString() })
        .eq('id', scanState.id);
    } else {
      await supabase.from('custodial_deposit_scan_state').insert({
        chain: 'BSC',
        hot_wallet_address: hotWalletAddress,
        last_scanned_block: currentBlock,
      });
    }

    console.log(
      `[monitor-custodial-deposits] Complete. Discovered: ${totalDiscovered}, Credited: ${totalCredited}, Unknown: ${totalSkippedUnknown}`
    );

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
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --------------- DB Helpers ---------------

async function findUserByWallet(supabase: any, address: string): Promise<MatchedUser | null> {
  const norm = address.toLowerCase();

  // profiles.wallet_address
  const { data: p1 } = await supabase
    .from('profiles')
    .select('user_id, wallet_address')
    .ilike('wallet_address', norm)
    .maybeSingle();
  if (p1 && p1.wallet_address?.toLowerCase() === norm) {
    return { user_id: p1.user_id, matched_address: p1.wallet_address, match_source: 'profiles_wallet' };
  }

  // profiles.bsc_wallet_address
  const { data: p2 } = await supabase
    .from('profiles')
    .select('user_id, bsc_wallet_address')
    .ilike('bsc_wallet_address', norm)
    .maybeSingle();
  if (p2 && p2.bsc_wallet_address?.toLowerCase() === norm) {
    return { user_id: p2.user_id, matched_address: p2.bsc_wallet_address, match_source: 'profiles_bsc' };
  }

  // wallets_user table
  const { data: w } = await supabase
    .from('wallets_user')
    .select('user_id, address')
    .ilike('address', norm)
    .maybeSingle();
  if (w && w.address?.toLowerCase() === norm) {
    return { user_id: w.user_id, matched_address: w.address, match_source: 'wallets_user' };
  }

  return null;
}

async function logAudit(supabase: any, eventType: string, details: any) {
  try {
    await supabase.from('admin_notifications').insert({
      type: 'deposit_audit',
      title: `Deposit Audit: ${eventType}`,
      message: JSON.stringify(details),
      priority: eventType === 'FROM_ADDRESS_MISMATCH' ? 'high' : 'normal',
      metadata: { event_type: eventType, ...details },
    });
  } catch (e) {
    console.error('[monitor-custodial-deposits] Failed to log audit event:', e);
  }
}

async function creditDeposit(
  supabase: any,
  depositId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const { data, error } = await supabase.rpc('credit_custodial_deposit', { p_deposit_id: depositId });

  if (error) {
    console.error(`[monitor-custodial-deposits] credit_custodial_deposit RPC failed:`, error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; status?: string; error?: string } | null;
  if (!result) {
    return { success: false, error: 'No result from RPC' };
  }

  if (result.success) {
    console.log(`[monitor-custodial-deposits] ✓ Credited deposit ${depositId} (status: ${result.status})`);
  } else {
    console.warn(`[monitor-custodial-deposits] Credit failed for ${depositId}:`, result.error);
  }

  return result;
}
