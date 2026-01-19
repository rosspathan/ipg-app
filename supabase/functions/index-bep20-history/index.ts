import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexRequest {
  lookbackHours?: number;
  forceRefresh?: boolean;
}

interface BscScanTokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  blockNumber: string;
  timeStamp: string;
  contractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  nonce: string;
  transactionIndex: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  logo_url: string | null;
}

// Helper to decode JWT without calling auth endpoint
const decodeJwtSub = (jwt: string): string | null => {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json?.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
};

const isAddress = (val: unknown): val is string => 
  typeof val === 'string' && /^0x[a-fA-F0-9]{40}$/.test(val);

// BSC RPC Endpoints (fallback chain)
const RPC_ENDPOINTS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
];

// Transfer event signature: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Pad address to 32 bytes for topic filtering
const padAddress = (address: string): string => {
  return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
};

// Call RPC with retry
async function callRpc(method: string, params: any[], timeout = 10000): Promise<any> {
  const errors: string[] = [];
  
  for (const rpc of RPC_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        errors.push(`${rpc}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      if (data.error) {
        errors.push(`${rpc}: ${data.error.message || JSON.stringify(data.error)}`);
        continue;
      }
      
      return data.result;
    } catch (e: any) {
      errors.push(`${rpc}: ${e.message}`);
    }
  }
  
  throw new Error(`All RPC endpoints failed: ${errors.join('; ')}`);
}

// Get current block number
async function getBlockNumber(): Promise<number> {
  const hex = await callRpc('eth_blockNumber', []);
  return parseInt(hex, 16);
}

// Fetch logs with chunking to avoid "response too large"
async function fetchLogsChunked(
  fromBlock: number,
  toBlock: number,
  topics: (string | string[] | null)[],
  maxChunkSize = 5000
): Promise<any[]> {
  const allLogs: any[] = [];
  let currentFrom = fromBlock;
  
  while (currentFrom <= toBlock) {
    const currentTo = Math.min(currentFrom + maxChunkSize - 1, toBlock);
    
    try {
      const logs = await callRpc('eth_getLogs', [{
        fromBlock: '0x' + currentFrom.toString(16),
        toBlock: '0x' + currentTo.toString(16),
        topics,
      }]);
      
      if (Array.isArray(logs)) {
        allLogs.push(...logs);
      }
    } catch (e: any) {
      // If chunk too large, reduce size
      if (e.message?.includes('too large') || e.message?.includes('limit')) {
        if (maxChunkSize > 500) {
          console.log(`[index-bep20] Reducing chunk size from ${maxChunkSize} to ${Math.floor(maxChunkSize / 2)}`);
          const smallerLogs = await fetchLogsChunked(currentFrom, currentTo, topics, Math.floor(maxChunkSize / 2));
          allLogs.push(...smallerLogs);
        } else {
          console.warn(`[index-bep20] Could not fetch blocks ${currentFrom}-${currentTo}: ${e.message}`);
        }
      } else {
        console.warn(`[index-bep20] Error fetching blocks ${currentFrom}-${currentTo}: ${e.message}`);
      }
    }
    
    currentFrom = currentTo + 1;
  }
  
  return allLogs;
}

// Fetch ERC20 token info from contract
async function getTokenInfo(contractAddress: string): Promise<TokenInfo | null> {
  try {
    // symbol()
    const symbolData = await callRpc('eth_call', [{
      to: contractAddress,
      data: '0x95d89b41', // symbol()
    }, 'latest'], 5000);
    
    // decimals()
    const decimalsData = await callRpc('eth_call', [{
      to: contractAddress,
      data: '0x313ce567', // decimals()
    }, 'latest'], 5000);
    
    // name()
    const nameData = await callRpc('eth_call', [{
      to: contractAddress,
      data: '0x06fdde03', // name()
    }, 'latest'], 5000);
    
    // Decode responses
    const symbol = decodeStringResult(symbolData) || 'UNKNOWN';
    const name = decodeStringResult(nameData) || 'Unknown Token';
    const decimals = parseInt(decimalsData, 16) || 18;
    
    return { symbol, name, decimals, logo_url: null };
  } catch (e) {
    console.warn(`[index-bep20] Could not fetch token info for ${contractAddress}`);
    return null;
  }
}

// Decode string from ABI-encoded return value
function decodeStringResult(hex: string): string | null {
  if (!hex || hex === '0x' || hex.length < 66) return null;
  
  try {
    // Try as dynamic string first
    const offset = parseInt(hex.slice(2, 66), 16);
    if (offset === 32) {
      // Dynamic string
      const length = parseInt(hex.slice(66, 130), 16);
      if (length > 0 && length < 100) {
        const strHex = hex.slice(130, 130 + length * 2);
        return Buffer.from(strHex, 'hex').toString('utf8').replace(/\0/g, '');
      }
    }
    
    // Try as fixed bytes32
    const raw = hex.slice(2, 66);
    let str = '';
    for (let i = 0; i < 64; i += 2) {
      const charCode = parseInt(raw.substr(i, 2), 16);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str || null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let wallet = '';
  let provider = 'unknown';
  
  try {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized',
        error_code: 'UNAUTHORIZED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[index-bep20] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Server misconfigured',
        error_code: 'SERVER_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Use user client for auth check
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Use service role for writes (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const token = bearerMatch[1];
    const userId = decodeJwtSub(token);
    if (!userId) {
      console.error('[index-bep20] Invalid JWT: missing sub claim');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication token',
        error_code: 'INVALID_TOKEN'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { lookbackHours = 168, forceRefresh = false }: IndexRequest = await req.json().catch(() => ({}));

    console.log(`[index-bep20] User ${userId} indexing BEP-20 history, lookback: ${lookbackHours}h`);

    // Get user's wallet address
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address, wallet_addresses, bsc_wallet_address')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    let evmAddress: string | null = (
      profile?.bsc_wallet_address ||
      profile?.wallet_addresses?.['bsc-mainnet'] ||
      profile?.wallet_addresses?.['bsc'] ||
      profile?.wallet_address
    ) ?? null;

    // Fallback: user_wallets table
    if (!isAddress(evmAddress)) {
      const { data: uw } = await supabaseClient
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (isAddress(uw?.wallet_address)) evmAddress = uw!.wallet_address;
    }

    // Fallback: wallets_user table
    if (!isAddress(evmAddress)) {
      const { data: wu } = await supabaseClient
        .from('wallets_user')
        .select('address, chain, is_primary')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .limit(10);

      const preferred = (wu || []).find((w: any) => {
        const chain = String(w?.chain || '').toLowerCase();
        return isAddress(w?.address) && (chain.includes('bsc') || chain.includes('bep20') || chain.includes('evm'));
      });
      const chosen = preferred?.address || (wu || []).find((w: any) => isAddress(w?.address))?.address;
      if (isAddress(chosen)) evmAddress = chosen;
    }

    if (!isAddress(evmAddress)) {
      console.warn('[index-bep20] No wallet address found for user');
      return new Response(JSON.stringify({
        success: false,
        error_code: 'NO_WALLET_ADDRESS',
        error: 'No BSC wallet address found. Please set up your wallet first.',
        indexed: 0,
        debug: {
          checked_tables: ['profiles', 'user_wallets', 'wallets_user'],
          user_id: userId,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    wallet = evmAddress;
    console.log(`[index-bep20] Wallet: ${evmAddress.slice(0, 10)}...`);

    // Fetch active BEP-20 assets
    const { data: assets } = await supabaseClient
      .from('assets')
      .select('id, symbol, name, contract_address, decimals, network, logo_url')
      .not('contract_address', 'is', null)
      .eq('is_active', true);

    // Build asset lookup map by contract address
    const assetMap = new Map<string, any>((assets || []).map(a => [a.contract_address?.toLowerCase(), a]));
    const tokenInfoCache = new Map<string, TokenInfo>();

    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);
    
    let transfers: BscScanTokenTransfer[] = [];
    let usedProvider = 'none';

    // Try BscScan API first (if API key exists)
    if (bscscanApiKey) {
      try {
        console.log('[index-bep20] Attempting BscScan API...');
        const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${evmAddress}&startblock=0&endblock=999999999&page=1&offset=100&sort=desc&apikey=${bscscanApiKey}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const bscResponse = await fetch(bscscanUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const bscData = await bscResponse.json();
        console.log(`[index-bep20] BscScan response status: ${bscData.status}, message: ${bscData.message}`);
        
        if (bscData.status === '1' && Array.isArray(bscData.result)) {
          transfers = bscData.result;
          usedProvider = 'bscscan';
          provider = 'bscscan';
          console.log(`[index-bep20] BscScan returned ${transfers.length} transfers`);
        } else if (bscData.message === 'No transactions found') {
          // Valid response, just no transactions
          usedProvider = 'bscscan';
          provider = 'bscscan';
          console.log('[index-bep20] BscScan: No transactions found (valid response)');
        } else {
          console.warn(`[index-bep20] BscScan API error: ${bscData.message}`);
        }
      } catch (e: any) {
        console.warn(`[index-bep20] BscScan API failed: ${e.message}`);
      }
    }

    // Fallback to RPC eth_getLogs if BscScan failed or unavailable
    if (usedProvider === 'none') {
      try {
        console.log('[index-bep20] Using RPC eth_getLogs fallback...');
        provider = 'rpc';
        
        const currentBlock = await getBlockNumber();
        // ~3 seconds per block on BSC, calculate blocks for lookback hours
        const blocksPerHour = 1200;
        const lookbackBlocks = Math.min(lookbackHours * blocksPerHour, 200000); // Cap at ~7 days
        const fromBlock = Math.max(currentBlock - lookbackBlocks, 0);
        
        console.log(`[index-bep20] Fetching logs from block ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);
        
        const paddedAddress = padAddress(evmAddress);
        
        // Fetch RECEIVED transfers (where address is in topic2/to)
        console.log('[index-bep20] Fetching received transfers...');
        const receivedLogs = await fetchLogsChunked(fromBlock, currentBlock, [
          TRANSFER_TOPIC,
          null, // any from address
          paddedAddress, // to = our address
        ]);
        
        // Fetch SENT transfers (where address is in topic1/from)
        console.log('[index-bep20] Fetching sent transfers...');
        const sentLogs = await fetchLogsChunked(fromBlock, currentBlock, [
          TRANSFER_TOPIC,
          paddedAddress, // from = our address
          null, // any to address
        ]);
        
        console.log(`[index-bep20] RPC returned ${receivedLogs.length} received + ${sentLogs.length} sent logs`);
        
        // Convert RPC logs to BscScan-like format
        const allLogs = [...receivedLogs, ...sentLogs];
        
        // Get block timestamps for a few blocks (for rough timestamp estimation)
        const blockTimestamps = new Map<number, number>();
        
        for (const log of allLogs) {
          const blockNum = parseInt(log.blockNumber, 16);
          const txIndex = parseInt(log.transactionIndex || '0', 16);
          const logIndex = parseInt(log.logIndex || '0', 16);
          
          // Get block timestamp if not cached
          if (!blockTimestamps.has(blockNum)) {
            try {
              const block = await callRpc('eth_getBlockByNumber', ['0x' + blockNum.toString(16), false], 5000);
              if (block?.timestamp) {
                blockTimestamps.set(blockNum, parseInt(block.timestamp, 16));
              }
            } catch {
              // Estimate timestamp based on block number
              const secondsSinceGenesis = (currentBlock - blockNum) * 3;
              blockTimestamps.set(blockNum, Math.floor(Date.now() / 1000) - secondsSinceGenesis);
            }
          }
          
          const timestamp = blockTimestamps.get(blockNum) || Math.floor(Date.now() / 1000);
          
          // Parse Transfer event data
          const from = '0x' + log.topics[1].slice(26);
          const to = '0x' + log.topics[2].slice(26);
          const value = log.data || '0x0';
          
          transfers.push({
            hash: log.transactionHash,
            from,
            to,
            value: BigInt(value).toString(),
            tokenDecimal: '18', // Will be looked up later
            blockNumber: blockNum.toString(),
            timeStamp: timestamp.toString(),
            contractAddress: log.address,
            tokenSymbol: '',
            tokenName: '',
            gas: '0',
            gasPrice: '0',
            gasUsed: '0',
            nonce: '0',
            transactionIndex: txIndex.toString(),
          });
        }
        
        usedProvider = 'rpc';
      } catch (e: any) {
        console.error(`[index-bep20] RPC fallback failed: ${e.message}`);
        return new Response(JSON.stringify({
          success: false,
          error_code: 'RPC_ERROR',
          error: `Failed to fetch transactions: ${e.message}`,
          provider: 'rpc',
          wallet: wallet.slice(0, 10) + '...',
          duration_ms: Date.now() - startTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // Filter transfers by lookback window
    const filteredTransfers = transfers.filter((tx: BscScanTokenTransfer) => {
      const timestamp = parseInt(tx.timeStamp);
      return timestamp >= lookbackTimestamp;
    });

    console.log(`[index-bep20] ${filteredTransfers.length} transfers within lookback window`);

    if (filteredTransfers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        created: 0,
        message: 'No recent transactions found',
        provider: usedProvider,
        wallet: wallet.slice(0, 10) + '...',
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Fetch all existing tx_hashes to avoid duplicates
    const txHashes = [...new Set(filteredTransfers.map(tx => tx.hash.toLowerCase()))];
    const { data: existingTxs } = await adminClient
      .from('onchain_transactions')
      .select('tx_hash, log_index, direction')
      .eq('user_id', userId)
      .in('tx_hash', txHashes);

    const existingSet = new Set(
      (existingTxs || []).map((t: any) => `${t.tx_hash}-${t.log_index ?? 0}-${t.direction}`)
    );

    let totalIndexed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Process each transfer
    for (const tx of filteredTransfers) {
      const fromLower = tx.from.toLowerCase();
      const toLower = tx.to.toLowerCase();
      const walletLower = evmAddress.toLowerCase();
      const contractLower = tx.contractAddress?.toLowerCase();

      // Get token info from DB or fetch from chain
      let tokenInfo: TokenInfo | null = assetMap.get(contractLower);
      
      if (!tokenInfo) {
        // Check cache
        if (tokenInfoCache.has(contractLower)) {
          tokenInfo = tokenInfoCache.get(contractLower)!;
        } else {
          // Fetch from chain
          tokenInfo = await getTokenInfo(contractLower);
          if (tokenInfo) {
            tokenInfoCache.set(contractLower, tokenInfo);
          }
        }
      }

      // If still no token info, use values from tx or defaults
      if (!tokenInfo) {
        tokenInfo = {
          symbol: tx.tokenSymbol || 'UNKNOWN',
          name: tx.tokenName || 'Unknown Token',
          decimals: parseInt(tx.tokenDecimal) || 18,
          logo_url: null,
        };
      }

      const isSend = fromLower === walletLower;
      const isReceive = toLower === walletLower;
      const isSelf = isSend && isReceive;

      const direction = isSelf ? 'SELF' : (isSend ? 'SEND' : 'RECEIVE');
      const counterparty = isSend ? tx.to : tx.from;
      const logIndex = parseInt(tx.transactionIndex) || 0;
      const uniqueKey = `${tx.hash.toLowerCase()}-${logIndex}-${direction}`;

      if (existingSet.has(uniqueKey)) {
        totalSkipped++;
        continue;
      }

      // Calculate formatted amount
      const decimals = tokenInfo.decimals || parseInt(tx.tokenDecimal) || 18;
      const amountFormatted = parseFloat(tx.value) / Math.pow(10, decimals);

      // Calculate gas fee (if available)
      const gasUsed = parseInt(tx.gasUsed) || 0;
      const gasPrice = parseInt(tx.gasPrice) || 0;
      const gasFeeWei = BigInt(gasUsed) * BigInt(gasPrice);
      const gasFeeFormatted = Number(gasFeeWei) / 1e18;

      const record = {
        user_id: userId,
        wallet_address: evmAddress.toLowerCase(),
        chain_id: 56,
        token_contract: contractLower,
        token_symbol: tokenInfo.symbol || tx.tokenSymbol || 'UNKNOWN',
        token_name: tokenInfo.name || tx.tokenName || 'Unknown Token',
        token_decimals: decimals,
        token_logo_url: tokenInfo.logo_url,
        direction,
        counterparty_address: counterparty.toLowerCase(),
        amount_raw: tx.value,
        amount_formatted: amountFormatted,
        status: 'CONFIRMED', // BscScan and RPC only return confirmed txs
        confirmations: 12,
        required_confirmations: 12,
        block_number: parseInt(tx.blockNumber),
        tx_hash: tx.hash.toLowerCase(),
        log_index: logIndex,
        gas_fee_wei: gasFeeWei.toString(),
        gas_fee_formatted: gasFeeFormatted,
        nonce: parseInt(tx.nonce) || null,
        source: 'ONCHAIN',
        confirmed_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        created_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      };

      const { error: insertError } = await adminClient
        .from('onchain_transactions')
        .upsert(record, { onConflict: 'tx_hash,log_index,user_id,direction' });

      if (insertError) {
        console.error(`[index-bep20] Insert error for ${tx.hash}:`, insertError.message);
        errors.push(`${tx.hash.slice(0, 10)}...: ${insertError.message}`);
      } else {
        totalCreated++;
        console.log(`[index-bep20] Indexed ${direction} ${amountFormatted.toFixed(4)} ${tokenInfo.symbol}`);
      }

      totalIndexed++;
    }

    console.log(`[index-bep20] COMPLETE - Indexed: ${totalIndexed}, Created: ${totalCreated}, Skipped: ${totalSkipped}, Provider: ${usedProvider}`);

    return new Response(JSON.stringify({
      success: true,
      indexed: totalIndexed,
      created: totalCreated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      message: totalCreated > 0 
        ? `Indexed ${totalCreated} new transaction(s)`
        : (totalSkipped > 0 ? 'All transactions already indexed' : 'No transactions found'),
      provider: usedProvider,
      wallet: wallet.slice(0, 10) + '...',
      duration_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[index-bep20] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      error: error.message,
      provider,
      wallet: wallet ? wallet.slice(0, 10) + '...' : undefined,
      duration_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
