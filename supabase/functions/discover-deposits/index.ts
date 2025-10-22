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

    const { symbol, network, lookbackHours = 48 }: DiscoverRequest = await req.json();

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

    // Fetch asset details
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('id, contract_address, decimals')
      .eq('symbol', symbol)
      .eq('network', network)
      .eq('is_active', true)
      .single();

    if (assetError || !asset) {
      throw new Error(`Asset ${symbol} on ${network} not found or inactive`);
    }

    if (!asset.contract_address) {
      throw new Error(`No contract address configured for ${symbol}`);
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

    console.log(`[discover-deposits] Found ${inboundTransfers.length} inbound transfers`);

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
          required_confirmations: 12
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
      deposits: created
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
