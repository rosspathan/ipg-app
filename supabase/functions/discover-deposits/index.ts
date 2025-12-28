import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverRequest {
  symbol?: string; // Can be '*' for all tokens or specific symbol
  network?: string;
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

    const { symbol = '*', network = 'bsc', lookbackHours = 336 }: DiscoverRequest = await req.json();
    const scanAllTokens = symbol === '*';

    console.log(`[discover-deposits] User ${user.id} discovering ${scanAllTokens ? 'ALL TOKENS' : symbol} on ${network}, lookback: ${lookbackHours}h`);

    // Fetch user's EVM address
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address, wallet_addresses, bsc_wallet_address')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found. Please complete wallet setup.');
    }

    const isAddress = (val: unknown) => typeof val === 'string' && val.startsWith('0x') && val.length >= 42;

    // Check multiple possible locations for BSC wallet address (profiles)
    let evmAddress: string | null = (
      profile.bsc_wallet_address ||
      profile.wallet_addresses?.['bsc-mainnet'] ||
      profile.wallet_addresses?.['bsc'] ||
      profile.wallet_addresses?.['evm-mainnet'] ||
      profile.wallet_addresses?.evm?.mainnet ||
      profile.wallet_addresses?.evm?.bsc ||
      profile.wallet_address
    ) ?? null;

    // Fallback: user_wallets table
    if (!isAddress(evmAddress)) {
      const { data: uw } = await supabaseClient
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isAddress(uw?.wallet_address)) {
        evmAddress = uw!.wallet_address;
        console.log('[discover-deposits] Using user_wallets.wallet_address');
      }
    }

    // Fallback: wallets_user table (primary wallet)
    if (!isAddress(evmAddress)) {
      const { data: wu } = await supabaseClient
        .from('wallets_user')
        .select('address, chain, is_primary')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .limit(10);

      const preferred = (wu || []).find((w: any) => {
        const chain = String(w?.chain || '').toLowerCase();
        return isAddress(w?.address) && (chain.includes('bsc') || chain.includes('bep20') || chain.includes('evm'));
      });

      const anyWallet = (wu || []).find((w: any) => isAddress(w?.address));
      const chosen = preferred?.address || anyWallet?.address;

      if (isAddress(chosen)) {
        evmAddress = chosen;
        console.log('[discover-deposits] Using wallets_user.address');
      }
    }

    if (!isAddress(evmAddress)) {
      throw new Error('No EVM wallet address found. Please set up your wallet.');
    }

    console.log(`[discover-deposits] EVM address: ${evmAddress.slice(0, 6)}...`);

    // Fetch assets from database
    let assetsToScan: Array<{ id: string; symbol: string; contract_address: string; decimals: number; network: string }> = [];

    if (scanAllTokens) {
      const { data: assets, error: assetsError } = await supabaseClient
        .from('assets')
        .select('id, symbol, contract_address, decimals, network')
        .not('contract_address', 'is', null)
        .eq('auto_deposit_enabled', true)
        .eq('is_active', true);

      if (assetsError) {
        throw new Error('Failed to fetch assets from database');
      }

      assetsToScan = assets || [];
      console.log(`[discover-deposits] Scanning ${assetsToScan.length} tokens with contract addresses`);
    } else {
      const { data: asset, error: assetError } = await supabaseClient
        .from('assets')
        .select('id, symbol, contract_address, decimals, network')
        .ilike('symbol', symbol)
        .eq('is_active', true)
        .maybeSingle();

      if (assetError || !asset) {
        throw new Error(`Asset ${symbol} not found`);
      }

      if (!asset.contract_address) {
        throw new Error(`No contract address configured for ${symbol}. Please contact support.`);
      }

      assetsToScan = [asset];
      console.log(`[discover-deposits] Found asset: ${asset.symbol}`);
    }

    if (assetsToScan.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        discovered: 0,
        created: 0,
        ignored: 0,
        message: 'No assets configured for auto-deposit discovery'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Fetch BscScan API key
    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!bscscanApiKey) {
      throw new Error('BscScan API key not configured');
    }

    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);
    let totalDiscovered = 0;
    let totalCreated = 0;
    let totalIgnored = 0;
    const createdDeposits: any[] = [];
    const recentTxHashes: string[] = [];

    // Process each asset
    for (const asset of assetsToScan) {
      console.log(`[discover-deposits] Processing ${asset.symbol} (${asset.contract_address})...`);

      try {
        const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${asset.contract_address}&address=${evmAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${bscscanApiKey}`;

        const bscResponse = await fetch(bscscanUrl);
        const bscData = await bscResponse.json();

        if (bscData.status !== '1' || !bscData.result) {
          console.warn(`[discover-deposits] No transfers found for ${asset.symbol}`);
          continue;
        }

        const transfers: BscScanTokenTransfer[] = bscData.result;

        // Filter inbound transfers within lookback period
        const inboundTransfers = transfers.filter((tx: BscScanTokenTransfer) => 
          tx.to.toLowerCase() === evmAddress.toLowerCase() &&
          parseInt(tx.timeStamp) >= lookbackTimestamp
        );

        console.log(`[discover-deposits] ${asset.symbol}: ${inboundTransfers.length} inbound transfers`);
        totalDiscovered += inboundTransfers.length;

        if (inboundTransfers.length === 0) continue;

        // Track recent tx hashes
        inboundTransfers.slice(0, 3).forEach(tx => recentTxHashes.push(tx.hash));

        // Fetch existing deposits to avoid duplicates
        const txHashes = inboundTransfers.map(tx => tx.hash.toLowerCase());
        const { data: existingDeposits } = await supabaseClient
          .from('deposits')
          .select('tx_hash')
          .eq('user_id', user.id)
          .in('tx_hash', txHashes);

        const existingTxSet = new Set(existingDeposits?.map(d => d.tx_hash.toLowerCase()) || []);
        const newDeposits = inboundTransfers.filter(tx => !existingTxSet.has(tx.hash.toLowerCase()));

        console.log(`[discover-deposits] ${asset.symbol}: ${newDeposits.length} new deposits to create`);

        // Create new deposit records
        for (const tx of newDeposits) {
          const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
          
          const { data: deposit, error: insertError } = await supabaseClient
            .from('deposits')
            .insert({
              user_id: user.id,
              asset_id: asset.id,
              amount,
              tx_hash: tx.hash.toLowerCase(),
              network: asset.network,
              status: 'pending',
              confirmations: 0,
              required_confirmations: 2
            })
            .select()
            .single();

          if (!insertError && deposit) {
            createdDeposits.push({ 
              tx_hash: tx.hash, 
              amount, 
              deposit_id: deposit.id,
              symbol: asset.symbol 
            });
            totalCreated++;
            console.log(`[discover-deposits] Created deposit ${deposit.id} for ${asset.symbol}`);
          }
        }

        totalIgnored += (inboundTransfers.length - newDeposits.length);

      } catch (error) {
        console.error(`[discover-deposits] Error processing ${asset.symbol}:`, error);
        continue;
      }
    }

    console.log(`[discover-deposits] COMPLETE - Scanned: ${assetsToScan.length} assets, Discovered: ${totalDiscovered}, Created: ${totalCreated}, Ignored: ${totalIgnored}`);

    return new Response(JSON.stringify({
      success: true,
      discovered: totalDiscovered,
      created: totalCreated,
      ignored: totalIgnored,
      deposits: createdDeposits,
      assetsScanned: assetsToScan.length,
      message: totalCreated > 0 
        ? `Successfully discovered and recorded ${totalCreated} new deposit(s) across ${assetsToScan.length} token(s)`
        : totalDiscovered > 0
          ? `Found ${totalDiscovered} transaction(s), but all were already recorded`
          : `No deposits found in the last ${lookbackHours} hours for ${assetsToScan.length} token(s)`,
      lookbackTimestamp: new Date(lookbackTimestamp * 1000).toISOString(),
      debug: {
        recentTxHashes: recentTxHashes.slice(0, 10),
        walletAddress: evmAddress,
        assetsScanned: assetsToScan.map(a => ({ symbol: a.symbol, contract: a.contract_address }))
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
