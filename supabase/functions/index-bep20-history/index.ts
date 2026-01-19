import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Best-effort in-memory caching/dedup to reduce repeated heavy calls (per warm worker)
const CACHE_TTL_MS = 30_000;
const lastResultCache = new Map<string, { ts: number; payload: any }>();

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let wallet = '';
  let provider = 'none';
  
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

    console.log(`[index-bep20] User ${userId} indexing BEP-20, lookback: ${lookbackHours}h`);

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
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    wallet = evmAddress.toLowerCase();
    console.log(`[index-bep20] Wallet: ${wallet.slice(0, 10)}...`);

    // Cache (avoid repeated upstream calls when the UI retries/polls)
    const cacheKey = `${userId}:${wallet}:${lookbackHours}`;
    const cached = lastResultCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log('[index-bep20] Cache hit (recent sync)');
      return new Response(JSON.stringify({
        ...cached.payload,
        cached: true,
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch active BEP-20 assets for enrichment
    const { data: assets } = await supabaseClient
      .from('assets')
      .select('id, symbol, name, contract_address, decimals, network, logo_url')
      .not('contract_address', 'is', null)
      .eq('is_active', true);

    const assetMap = new Map<string, any>((assets || []).map(a => [a.contract_address?.toLowerCase(), a]));
    
    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);
    
    let transfers: BscScanTokenTransfer[] = [];

    // === Use BscScan API only (fast + reliable) ===
    if (!bscscanApiKey) {
      console.warn('[index-bep20] No BSCSCAN_API_KEY configured');
      return new Response(JSON.stringify({
        success: false,
        error_code: 'NO_API_KEY',
        error: 'BscScan API key not configured. Please contact support.',
        indexed: 0,
        wallet: wallet.slice(0, 10) + '...',
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    try {
      console.log('[index-bep20] Fetching from BscScan API...');
      const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${wallet}&startblock=0&endblock=999999999&page=1&offset=50&sort=desc&apikey=${bscscanApiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const bscResponse = await fetch(bscscanUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const bscData = await bscResponse.json();
      console.log(`[index-bep20] BscScan status: ${bscData.status}, message: ${bscData.message}`);
      
      if (bscData.status === '1' && Array.isArray(bscData.result)) {
        transfers = bscData.result;
        provider = 'bscscan';
        console.log(`[index-bep20] Got ${transfers.length} transfers from BscScan`);
      } else if (bscData.message === 'No transactions found') {
        provider = 'bscscan';
        console.log('[index-bep20] BscScan: No transactions (valid)');
      } else if (bscData.message?.includes('rate limit') || bscData.result?.includes('rate')) {
        console.warn('[index-bep20] BscScan rate limited');
        return new Response(JSON.stringify({
          success: false,
          error_code: 'RATE_LIMITED',
          error: 'API rate limited. Please try again in a few seconds.',
          indexed: 0,
          provider: 'bscscan',
          wallet: wallet.slice(0, 10) + '...',
          duration_ms: Date.now() - startTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        console.warn(`[index-bep20] BscScan error: ${bscData.message || bscData.result}`);
        return new Response(JSON.stringify({
          success: false,
          error_code: 'API_ERROR',
          error: `BscScan API error: ${bscData.message || 'Unknown error'}`,
          indexed: 0,
          provider: 'bscscan',
          wallet: wallet.slice(0, 10) + '...',
          duration_ms: Date.now() - startTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } catch (e: any) {
      console.error(`[index-bep20] BscScan fetch failed: ${e.message}`);
      return new Response(JSON.stringify({
        success: false,
        error_code: 'NETWORK_ERROR',
        error: `Network error: ${e.name === 'AbortError' ? 'Request timed out' : e.message}`,
        indexed: 0,
        provider: 'bscscan',
        wallet: wallet.slice(0, 10) + '...',
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Filter by lookback time
    transfers = transfers.filter(tx => parseInt(tx.timeStamp) >= lookbackTimestamp);
    console.log(`[index-bep20] ${transfers.length} transfers in lookback window`);

    if (transfers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        provider,
        wallet: wallet.slice(0, 10) + '...',
        duration_ms: Date.now() - startTime,
        message: 'No transactions found in time range',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process and upsert transfers
    const records: any[] = [];
    
    for (const tx of transfers) {
      const fromAddr = tx.from.toLowerCase();
      const toAddr = tx.to.toLowerCase();
      const contractAddr = tx.contractAddress.toLowerCase();
      
      // Determine direction
      let direction: 'SEND' | 'RECEIVE' | 'SELF' = 'RECEIVE';
      if (fromAddr === wallet && toAddr === wallet) {
        direction = 'SELF';
      } else if (fromAddr === wallet) {
        direction = 'SEND';
      } else if (toAddr === wallet) {
        direction = 'RECEIVE';
      }
      
      // Get token info from asset map or use BscScan data
      const asset = assetMap.get(contractAddr);
      const decimals = asset?.decimals ?? parseInt(tx.tokenDecimal) || 18;
      const symbol = asset?.symbol || tx.tokenSymbol || 'UNKNOWN';
      const tokenName = asset?.name || tx.tokenName || 'Unknown Token';
      const logoUrl = asset?.logo_url || null;
      
      // Calculate formatted amount
      const rawValue = BigInt(tx.value || '0');
      const formattedAmount = Number(rawValue) / Math.pow(10, decimals);
      
      // Calculate gas fee in BNB
      const gasUsed = BigInt(tx.gasUsed || '0');
      const gasPrice = BigInt(tx.gasPrice || '0');
      const gasFeeWei = gasUsed * gasPrice;
      const gasFee = Number(gasFeeWei) / 1e18;
      
      // Best-effort event index for uniqueness (BscScan may not always include logIndex)
      const rawLogIndex = (tx as any).logIndex ?? (tx as any).log_index ?? tx.transactionIndex;
      const logIndex = Number.isFinite(parseInt(String(rawLogIndex))) ? parseInt(String(rawLogIndex)) : null;

      // Calculate gas fee
      const gasUsed = BigInt(tx.gasUsed || '0');
      const gasPrice = BigInt(tx.gasPrice || '0');
      const gasFeeWei = gasUsed * gasPrice;
      const gasFeeNative = Number(gasFeeWei) / 1e18;

      records.push({
        user_id: userId,
        wallet_address: wallet,
        chain_id: 56,

        token_contract: tx.contractAddress,
        token_symbol: symbol,
        token_name: tokenName,
        token_decimals: decimals,
        token_logo_url: logoUrl,

        direction,
        counterparty_address:
          direction === 'SEND' ? tx.to : direction === 'RECEIVE' ? tx.from : tx.to,

        amount_raw: tx.value,
        amount_formatted: formattedAmount,

        status: 'CONFIRMED',
        confirmations: 0,
        required_confirmations: 12,

        block_number: parseInt(tx.blockNumber) || null,
        tx_hash: tx.hash.toLowerCase(),
        log_index: logIndex,

        gas_fee_wei: gasFeeWei.toString(),
        gas_fee_formatted: gasFeeNative,
        nonce: parseInt(tx.nonce) || null,

        source: 'ONCHAIN',
        error_message: null,
        confirmed_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      });
    }

    // Upsert to database
    const { error: upsertError } = await adminClient
      .from('onchain_transactions')
      .upsert(records, {
        onConflict: 'tx_hash,log_index,user_id,direction',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error(`[index-bep20] Upsert error: ${upsertError.message}`);
      return new Response(JSON.stringify({
        success: false,
        error_code: 'DB_ERROR',
        error: `Database error: ${upsertError.message}`,
        indexed: 0,
        provider,
        wallet: wallet.slice(0, 10) + '...',
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[index-bep20] Successfully indexed ${records.length} transactions in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      indexed: records.length,
      provider,
      wallet: wallet.slice(0, 10) + '...',
      duration_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error(`[index-bep20] Unhandled error: ${e.message}`);
    return new Response(JSON.stringify({
      success: false,
      error_code: 'INTERNAL_ERROR',
      error: e.message || 'Internal server error',
      indexed: 0,
      provider,
      wallet: wallet ? wallet.slice(0, 10) + '...' : 'unknown',
      duration_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
