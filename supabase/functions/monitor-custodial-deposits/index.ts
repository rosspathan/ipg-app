/**
 * Monitor Custodial Deposits Edge Function
 *
 * Scans the platform hot wallet for incoming token transfers using RPC eth_getLogs.
 * If public RPC endpoints rate-limit, it can fall back to BscScan (requires BSCSCAN_API_KEY)
 * for the affected batch so scan state never advances past missing blocks.
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
const MAX_BLOCKS_PER_RUN = 2400; // cap normal scanning per invocation (2h) to avoid spikes
const MAX_BACKFILL_BLOCKS = 200_000; // safety cap for manual backfill (~7 days on BSC)

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

type ScanMode = 'normal' | 'backfill' | 'replay_tx';

interface MonitorRequestBody {
  // Scan controls
  backfill_lookback_blocks?: number;
  backfill_from_block?: number;
  backfill_to_block?: number;

  // Targeted recovery
  replay_tx_hashes?: string[];
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
}): Promise<{ transfers: TokenTransfer[]; lastSuccessfulBlock: number; complete: boolean }> {
  const { rpcUrls, hotWalletAddress, contractAddresses, fromBlock, toBlock } = params;
  const paddedTo = '0x000000000000000000000000' + hotWalletAddress.slice(2).toLowerCase();
  const transfers: TokenTransfer[] = [];

  // Some RPC providers support address: string[] in eth_getLogs, which drastically reduces calls.
  // We'll try it first and fall back to per-contract if not supported.
  let multiAddressSupported = true;
  let lastSuccessfulBlock = fromBlock - 1;

  async function parseAndAccumulate(logs: any[]) {
    for (const log of logs) {
      if (!log?.topics || log.topics.length < 3) continue;
      transfers.push({
        hash: log.transactionHash,
        from: hexToAddress(log.topics[1]),
        to: hexToAddress(log.topics[2]),
        value: hexToBigInt(log.data || '0x0').toString(),
        blockNumber: parseInt(log.blockNumber, 16),
        contractAddress: (log.address || '').toLowerCase(),
        logIndex: parseInt(log.logIndex, 16),
      });
    }
  }

  async function queryBatchMulti(batchFrom: number, batchTo: number): Promise<any[]> {
    const logs = await tryRpc(rpcUrls, 'eth_getLogs', [
      {
        address: contractAddresses.map((a) => a.toLowerCase()),
        topics: [TRANSFER_EVENT_TOPIC, null, paddedTo],
        fromBlock: '0x' + batchFrom.toString(16),
        toBlock: '0x' + batchTo.toString(16),
      },
    ]);
    return Array.isArray(logs) ? logs : [];
  }

  async function queryBatchSingle(contract: string, batchFrom: number, batchTo: number): Promise<any[]> {
    const logs = await tryRpc(rpcUrls, 'eth_getLogs', [
      {
        address: contract.toLowerCase(),
        topics: [TRANSFER_EVENT_TOPIC, null, paddedTo],
        fromBlock: '0x' + batchFrom.toString(16),
        toBlock: '0x' + batchTo.toString(16),
      },
    ]);
    return Array.isArray(logs) ? logs : [];
  }

  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const batchEnd = Math.min(cursor + BLOCKS_PER_BATCH - 1, toBlock);
    try {
      if (multiAddressSupported) {
        const logs = await queryBatchMulti(cursor, batchEnd);
        await parseAndAccumulate(logs);
      } else {
        for (const contract of contractAddresses) {
          const logs = await queryBatchSingle(contract, cursor, batchEnd);
          await parseAndAccumulate(logs);
        }
      }

      lastSuccessfulBlock = batchEnd;
      cursor = batchEnd + 1;
    } catch (e: any) {
      const msg = e?.message || String(e);

      // If multi-address isn't supported by the RPC provider, fall back and retry this same batch once.
      if (multiAddressSupported && /unmarshal|invalid|array|address/i.test(msg)) {
        console.warn('[monitor-custodial-deposits] RPC does not support multi-address eth_getLogs, falling back to per-contract batching');
        multiAddressSupported = false;
        continue;
      }

      console.error(
        `[monitor-custodial-deposits] eth_getLogs failed for batch [${cursor}-${batchEnd}] (${multiAddressSupported ? 'multi' : 'single'}):`,
        msg
      );

      // Attempt fallback for rate-limits using BscScan.
      if (/limit exceeded|rate limit|429/i.test(msg)) {
        const bscscanKey = Deno.env.get('BSCSCAN_API_KEY')?.trim();
        if (bscscanKey) {
          try {
            const failedFrom = cursor;
            const bscTransfers = await fetchTransferEventsViaBscScanBatch({
              apiKey: bscscanKey,
              hotWalletAddress,
              contractAddresses,
              fromBlock: failedFrom,
              toBlock: batchEnd,
            });
            transfers.push(...bscTransfers);
            lastSuccessfulBlock = batchEnd;
            cursor = batchEnd + 1;
            console.warn(
              `[monitor-custodial-deposits] BscScan fallback succeeded for batch [${failedFrom}-${batchEnd}] (${bscTransfers.length} transfers)`
            );
            continue;
          } catch (fallbackErr: any) {
            console.error(
              `[monitor-custodial-deposits] BscScan fallback failed for batch [${cursor}-${batchEnd}]:`,
              fallbackErr?.message
            );
          }
        }
      }

      // Hard stop – we must NOT advance scan state past a failed batch.
      return { transfers, lastSuccessfulBlock, complete: false };
    }
  }

  return { transfers, lastSuccessfulBlock, complete: true };
}

async function fetchTransferEventsViaBscScanBatch(params: {
  apiKey: string;
  hotWalletAddress: string;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
}): Promise<TokenTransfer[]> {
  const { apiKey, hotWalletAddress, contractAddresses, fromBlock, toBlock } = params;
  const addr = hotWalletAddress.toLowerCase();
  const contracts = new Set(contractAddresses.map((c) => c.toLowerCase()));

  const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${addr}&startblock=${fromBlock}&endblock=${toBlock}&sort=asc&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BscScan request failed: ${res.status}`);
  const data = await res.json();

  // Etherscan-style APIs return status='0' with message 'No transactions found'
  if (data?.status !== '1') {
    if ((data?.message || '').toLowerCase().includes('no transactions')) return [];
    throw new Error(data?.result || data?.message || 'BscScan error');
  }

  const result = Array.isArray(data?.result) ? data.result : [];
  const transfers: TokenTransfer[] = [];
  for (const tx of result) {
    const contract = String(tx?.contractAddress || '').toLowerCase();
    const to = String(tx?.to || '').toLowerCase();
    if (!contracts.has(contract)) continue;
    if (to !== addr) continue;
    const hash = String(tx?.hash || '').toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(hash)) continue;

    transfers.push({
      hash,
      from: String(tx?.from || '').toLowerCase(),
      to: String(tx?.to || '').toLowerCase(),
      value: String(tx?.value || '0'),
      blockNumber: parseInt(String(tx?.blockNumber || '0'), 10) || 0,
      contractAddress: contract,
      logIndex: parseInt(String(tx?.logIndex || '0'), 10) || 0,
    });
  }
  return transfers;
}

async function fetchReceiptTransfers(params: {
  rpcUrls: string[];
  hotWalletAddress: string;
  txHash: string;
}): Promise<TokenTransfer[]> {
  const { rpcUrls, hotWalletAddress, txHash } = params;
  const receipt = await tryRpc(rpcUrls, 'eth_getTransactionReceipt', [txHash]);
  if (!receipt) return [];
  const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
  const hot = hotWalletAddress.toLowerCase();
  const transfers: TokenTransfer[] = [];

  for (const log of logs) {
    const topics = log?.topics;
    if (!topics || topics.length < 3) continue;
    if ((topics[0] || '').toLowerCase() !== TRANSFER_EVENT_TOPIC) continue;
    const to = hexToAddress(topics[2]);
    if (to.toLowerCase() !== hot) continue;
    transfers.push({
      hash: (log.transactionHash || txHash) as string,
      from: hexToAddress(topics[1]),
      to,
      value: hexToBigInt(log.data || '0x0').toString(),
      blockNumber: parseInt(log.blockNumber, 16),
      contractAddress: (log.address || '').toLowerCase(),
      logIndex: parseInt(log.logIndex, 16),
    });
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

    let body: MonitorRequestBody | null = null;
    if (req.method !== 'GET') {
      try {
        body = (await req.json()) as MonitorRequestBody;
      } catch {
        body = null;
      }
    }

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
      .select('id, symbol, contract_address, decimals, auto_deposit_enabled')
      .eq('is_active', true)
      .eq('deposit_enabled', true)
      .eq('auto_deposit_enabled', true)
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

    // Determine scan mode
    const replayTxHashes = Array.isArray(body?.replay_tx_hashes)
      ? body!.replay_tx_hashes
          .map((h) => String(h).trim().toLowerCase())
          .filter((h) => /^0x[0-9a-f]{64}$/.test(h))
      : [];

    const backfillFrom =
      typeof body?.backfill_from_block === 'number' && Number.isFinite(body.backfill_from_block)
        ? Math.max(1, Math.floor(body.backfill_from_block))
        : null;
    const backfillTo =
      typeof body?.backfill_to_block === 'number' && Number.isFinite(body.backfill_to_block)
        ? Math.max(1, Math.floor(body.backfill_to_block))
        : null;
    const backfillLookback =
      typeof body?.backfill_lookback_blocks === 'number' && Number.isFinite(body.backfill_lookback_blocks)
        ? Math.max(0, Math.floor(body.backfill_lookback_blocks))
        : null;

    let mode: ScanMode = 'normal';
    if (replayTxHashes.length > 0) mode = 'replay_tx';
    else if (backfillFrom !== null || backfillTo !== null || backfillLookback !== null) mode = 'backfill';

    const { data: scanState } = await supabase
      .from('custodial_deposit_scan_state')
      .select('id, last_scanned_block')
      .eq('chain', 'BSC')
      .eq('hot_wallet_address', hotWalletAddress)
      .maybeSingle();

    let fromBlock: number;
    let toBlock: number;

    if (mode === 'backfill') {
      const lookback = Math.min(MAX_BACKFILL_BLOCKS, backfillLookback ?? BLOCKS_PER_2_HOURS);
      fromBlock = backfillFrom ?? Math.max(1, currentBlock - lookback);
      toBlock = backfillTo ?? currentBlock;
      if (toBlock > currentBlock) toBlock = currentBlock;
      if (fromBlock > toBlock) fromBlock = toBlock;
      console.log(`[monitor-custodial-deposits] Backfill scan blocks ${fromBlock} to ${toBlock}`);
    } else {
      if (scanState && scanState.last_scanned_block > 0) {
        // Continue from last scanned block + 1
        fromBlock = scanState.last_scanned_block + 1;
      } else {
        // First run – look back 2 hours
        fromBlock = Math.max(1, currentBlock - BLOCKS_PER_2_HOURS);
      }
      // Safety cap
      if (fromBlock > currentBlock) fromBlock = currentBlock;
      toBlock = Math.min(currentBlock, fromBlock + MAX_BLOCKS_PER_RUN - 1);
      console.log(`[monitor-custodial-deposits] Scanning blocks ${fromBlock} to ${toBlock}`);
    }

    const contractAddresses = assets.map((a) => a.contract_address?.toLowerCase()).filter(Boolean) as string[];

    // 4. Fetch Transfer events
    let allTransfers: TokenTransfer[] = [];
    let lastSuccessfulBlock = fromBlock - 1;
    let complete = true;

    if (mode === 'replay_tx') {
      console.log(`[monitor-custodial-deposits] Replay mode: ${replayTxHashes.length} tx hashes`);
      for (const txHash of replayTxHashes) {
        try {
          const recTransfers = await fetchReceiptTransfers({
            rpcUrls,
            hotWalletAddress,
            txHash,
          });
          allTransfers = allTransfers.concat(recTransfers);
        } catch (e: any) {
          console.error(`[monitor-custodial-deposits] Failed to fetch receipt for ${txHash}:`, e?.message);
        }
      }
      // Replay does not influence scan state.
    } else {
      const scanResult = await fetchTransferEventsViaRpc({
        rpcUrls,
        hotWalletAddress,
        contractAddresses,
        fromBlock,
        toBlock,
      });
      allTransfers = scanResult.transfers;
      lastSuccessfulBlock = scanResult.lastSuccessfulBlock;
      complete = scanResult.complete;
    }

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
    let scanStateUpdated = false;
    if (mode === 'normal') {
      // Only advance scan state to the last *successfully* scanned block.
      // NEVER advance past a failed eth_getLogs batch, or deposits will be permanently missed.
      const newLast = Math.max(0, lastSuccessfulBlock);
      if (newLast >= fromBlock) {
        if (scanState?.id) {
          await supabase
            .from('custodial_deposit_scan_state')
            .update({ last_scanned_block: newLast, updated_at: new Date().toISOString() })
            .eq('id', scanState.id);
        } else {
          await supabase.from('custodial_deposit_scan_state').insert({
            chain: 'BSC',
            hot_wallet_address: hotWalletAddress,
            last_scanned_block: newLast,
          });
        }
        scanStateUpdated = true;
      }
    }

    console.log(
      `[monitor-custodial-deposits] Complete. Discovered: ${totalDiscovered}, Credited: ${totalCredited}, Unknown: ${totalSkippedUnknown}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        discovered: totalDiscovered,
        credited: totalCredited,
        skipped_unknown: totalSkippedUnknown,
        results,
        rpc_used: true,
        complete,
        scan_state_updated: scanStateUpdated,
        scanned_from_block: fromBlock,
        scanned_to_block: mode === 'replay_tx' ? null : lastSuccessfulBlock,
        requested_to_block: mode === 'replay_tx' ? null : toBlock,
        blocks_scanned: mode === 'replay_tx' ? null : Math.max(0, lastSuccessfulBlock - fromBlock),
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
