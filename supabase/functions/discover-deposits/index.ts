import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverRequest {
  symbol: string;
  network: string;
  lookbackHours?: number;
}

// Network aliases to handle different naming conventions
const NETWORK_ALIASES: Record<string, string[]> = {
  'bsc': ['BEP20', 'bsc', 'bep20', 'bsc-mainnet', 'BSC'],
  'ethereum': ['ERC20', 'eth', 'ethereum', 'ETH'],
};

// Asset fallbacks for common tokens
const ASSET_FALLBACKS: Record<string, { contract: string; decimals: number }> = {
  'USDT:bsc': {
    contract: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
  },
};

interface BscScanTokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  blockNumber: string;
  timeStamp: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { symbol, network, lookbackHours = 168 }: DiscoverRequest = await req.json();

    console.log(`[discover-deposits] User ${user.id} discovering ${symbol} on ${network}`);

    // Fetch user's EVM address
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address, wallet_addresses')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found. Please complete wallet setup.');
    }

    const evmAddress = profile.wallet_addresses?.['bsc-mainnet'] || 
                       profile.wallet_addresses?.['bsc'] || 
                       profile.wallet_address;

    if (!evmAddress) {
      throw new Error('No EVM wallet address found. Please set up your wallet.');
    }

    console.log(`[discover-deposits] EVM address: ${evmAddress.slice(0, 6)}...`);

    // Fetch asset details with network aliases
    const aliases = NETWORK_ALIASES[network.toLowerCase()] || [network];
    let asset: { id: string; contract_address: string; decimals: number } | null = null;
    
    // Try finding asset with any of the network aliases
    for (const alias of aliases) {
      const { data, error } = await supabaseClient
        .from('assets')
        .select('id, contract_address, decimals')
        .ilike('symbol', symbol)
        .ilike('network', alias)
        .eq('is_active', true)
        .maybeSingle();
      
      if (data?.contract_address) {
        asset = data;
        console.log(`[discover-deposits] Found asset via alias: ${alias}`);
        break;
      }
    }

    // Fallback to hardcoded values if no asset found
    if (!asset?.contract_address) {
      const fallbackKey = `${symbol.toUpperCase()}:${network.toLowerCase()}`;
      const fallback = ASSET_FALLBACKS[fallbackKey];
      
      if (fallback) {
        console.log(`[discover-deposits] Using fallback for ${fallbackKey}`);
        // Create a minimal asset object with fallback values
        // We still need the asset ID from DB for deposits table
        const { data: dbAsset } = await supabaseClient
          .from('assets')
          .select('id, decimals')
          .ilike('symbol', symbol)
          .maybeSingle();
        
        asset = {
          id: dbAsset?.id || '',
          contract_address: fallback.contract,
          decimals: fallback.decimals,
        };
      } else {
        throw new Error(`Asset ${symbol} on ${network} not found and no fallback available`);
      }
    }

    if (!asset.id) {
      throw new Error(`Asset ${symbol} has no ID in database`);
    }

    console.log(`[discover-deposits] Asset: ${symbol}, Contract: ${asset.contract_address}`);

    // Call BscScan API to fetch token transfers
    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!bscscanApiKey) {
      throw new Error('BscScan API key not configured');
    }

    // Calculate start block based on lookback hours (BSC ~3s per block)
    const blocksPerHour = 1200;
    const startBlock = Math.max(0, Date.now() / 1000 - (lookbackHours * 3600));

    const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${asset.contract_address}&address=${evmAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${bscscanApiKey}`;

    console.log(`[discover-deposits] Fetching transfers from BscScan...`);
    
    const bscResponse = await fetch(bscscanUrl);
    const bscData = await bscResponse.json();

    if (bscData.status !== '1' || !bscData.result) {
      console.warn(`[discover-deposits] BscScan returned no results`);
      return new Response(JSON.stringify({
        success: true,
        discovered: 0,
        created: 0,
        ignored: 0,
        message: 'No transfers found in the specified time range'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const transfers: BscScanTokenTransfer[] = bscData.result;
    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);

    // Filter inbound transfers within lookback period
    const inboundTransfers = transfers.filter((tx: BscScanTokenTransfer) => 
      tx.to.toLowerCase() === evmAddress.toLowerCase() &&
      parseInt(tx.timeStamp) >= lookbackTimestamp
    );

    console.log(`[discover-deposits] Lookback: ${lookbackHours}h (since ${new Date(lookbackTimestamp * 1000).toISOString()})`);
    console.log(`[discover-deposits] Total transfers from BscScan: ${transfers.length}`);
    console.log(`[discover-deposits] Inbound transfers after filter: ${inboundTransfers.length}`);

    // Fetch existing deposits to avoid duplicates
    const txHashes = inboundTransfers.map(tx => tx.hash.toLowerCase());
    const { data: existingDeposits } = await supabaseClient
      .from('deposits')
      .select('tx_hash')
      .eq('user_id', user.id)
      .in('tx_hash', txHashes);

    const existingTxSet = new Set(existingDeposits?.map(d => d.tx_hash.toLowerCase()) || []);

    const newDeposits = inboundTransfers.filter(tx => 
      !existingTxSet.has(tx.hash.toLowerCase())
    );

    console.log(`[discover-deposits] ${newDeposits.length} new deposits to create`);

    const created = [];
    for (const tx of newDeposits) {
      const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
      
      const { data: deposit, error: insertError } = await supabaseClient
        .from('deposits')
        .insert({
          user_id: user.id,
          asset_id: asset.id,
          amount,
          tx_hash: tx.hash.toLowerCase(),
          network,
          status: 'pending',
          confirmations: 0,
          required_confirmations: 2
        })
        .select()
        .single();

      if (!insertError && deposit) {
        created.push({ tx_hash: tx.hash, amount, deposit_id: deposit.id });
        console.log(`[discover-deposits] Created deposit ${deposit.id} for tx ${tx.hash.slice(0, 10)}...`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      discovered: inboundTransfers.length,
      created: created.length,
      ignored: inboundTransfers.length - created.length,
      deposits: created,
      lookbackHours,
      lookbackTimestamp: new Date(lookbackTimestamp * 1000).toISOString(),
      message: created.length > 0 
        ? `Successfully credited ${created.length} deposit(s)` 
        : `No new deposits found in the last ${lookbackHours} hours`,
      debug: {
        totalTransfers: transfers.length,
        inboundCount: inboundTransfers.length,
        existingCount: existingDeposits?.length || 0,
        recentTxHashes: inboundTransfers.slice(0, 3).map(tx => tx.hash.slice(0, 10) + '...')
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[discover-deposits] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
