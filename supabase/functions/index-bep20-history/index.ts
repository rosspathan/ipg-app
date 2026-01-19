import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexRequest {
  lookbackHours?: number;
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
  typeof val === 'string' && val.startsWith('0x') && val.length >= 42;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[index-bep20] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(JSON.stringify({ success: false, error: 'Server misconfigured' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { lookbackHours = 336 }: IndexRequest = await req.json().catch(() => ({}));

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
      return new Response(JSON.stringify({
        success: false,
        error_code: 'NO_WALLET_ADDRESS',
        error: 'No EVM wallet address found. Please set up your wallet.',
        indexed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[index-bep20] Wallet: ${evmAddress.slice(0, 10)}...`);

    // Fetch active BEP-20 assets
    const { data: assets } = await supabaseClient
      .from('assets')
      .select('id, symbol, name, contract_address, decimals, network, logo_url')
      .not('contract_address', 'is', null)
      .eq('is_active', true);

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        message: 'No assets configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!bscscanApiKey) {
      throw new Error('BscScan API key not configured');
    }

    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);
    let totalIndexed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Build asset lookup map by contract address
    const assetMap = new Map(assets.map(a => [a.contract_address?.toLowerCase(), a]));

    // Fetch ALL token transfers for this address (both in and out)
    const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${evmAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${bscscanApiKey}`;
    
    console.log(`[index-bep20] Fetching transfers from BscScan...`);
    const bscResponse = await fetch(bscscanUrl);
    const bscData = await bscResponse.json();

    if (bscData.status !== '1' || !bscData.result) {
      console.warn('[index-bep20] No transfers found or API error:', bscData.message);
      return new Response(JSON.stringify({
        success: true,
        indexed: 0,
        message: bscData.message || 'No transfers found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const transfers: BscScanTokenTransfer[] = bscData.result;
    console.log(`[index-bep20] Found ${transfers.length} total transfers`);

    // Filter by lookback and known assets
    const relevantTransfers = transfers.filter((tx: BscScanTokenTransfer) => {
      const withinLookback = parseInt(tx.timeStamp) >= lookbackTimestamp;
      const isKnownAsset = assetMap.has(tx.contractAddress?.toLowerCase());
      return withinLookback && isKnownAsset;
    });

    console.log(`[index-bep20] ${relevantTransfers.length} relevant transfers within lookback`);

    // Fetch all existing tx_hashes to avoid duplicates
    const txHashes = [...new Set(relevantTransfers.map(tx => tx.hash.toLowerCase()))];
    const { data: existingTxs } = await adminClient
      .from('onchain_transactions')
      .select('tx_hash, log_index, direction')
      .eq('user_id', userId)
      .in('tx_hash', txHashes);

    const existingSet = new Set(
      (existingTxs || []).map((t: any) => `${t.tx_hash}-${t.log_index ?? 0}-${t.direction}`)
    );

    // Process each transfer
    for (const tx of relevantTransfers) {
      const fromLower = tx.from.toLowerCase();
      const toLower = tx.to.toLowerCase();
      const walletLower = evmAddress.toLowerCase();
      const contractLower = tx.contractAddress?.toLowerCase();

      const asset = assetMap.get(contractLower);
      if (!asset) continue;

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
      const decimals = parseInt(tx.tokenDecimal) || asset.decimals || 18;
      const amountFormatted = parseFloat(tx.value) / Math.pow(10, decimals);

      // Calculate gas fee
      const gasUsed = parseInt(tx.gasUsed) || 0;
      const gasPrice = parseInt(tx.gasPrice) || 0;
      const gasFeeWei = BigInt(gasUsed) * BigInt(gasPrice);
      const gasFeeFormatted = Number(gasFeeWei) / 1e18;

      const record = {
        user_id: userId,
        wallet_address: evmAddress.toLowerCase(),
        chain_id: 56,
        token_contract: contractLower,
        token_symbol: asset.symbol || tx.tokenSymbol,
        token_name: asset.name || tx.tokenName,
        token_decimals: decimals,
        token_logo_url: asset.logo_url,
        direction,
        counterparty_address: counterparty.toLowerCase(),
        amount_raw: tx.value,
        amount_formatted: amountFormatted,
        status: 'CONFIRMED', // BscScan only returns confirmed txs
        confirmations: 12, // Assume confirmed if in BscScan
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
        errors.push(`${tx.hash}: ${insertError.message}`);
      } else {
        totalCreated++;
        console.log(`[index-bep20] Indexed ${direction} ${amountFormatted.toFixed(4)} ${asset.symbol}`);
      }

      totalIndexed++;
    }

    console.log(`[index-bep20] COMPLETE - Indexed: ${totalIndexed}, Created: ${totalCreated}, Skipped: ${totalSkipped}`);

    return new Response(JSON.stringify({
      success: true,
      indexed: totalIndexed,
      created: totalCreated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      message: totalCreated > 0 
        ? `Indexed ${totalCreated} new transaction(s)`
        : 'All transactions already indexed',
      wallet: evmAddress.slice(0, 10) + '...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[index-bep20] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
