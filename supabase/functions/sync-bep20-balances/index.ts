import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  userIds?: string[];
}

// ERC20 balanceOf ABI
const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { userIds } = body as SyncRequest;

    console.log('[sync-bep20-balances] Starting sync', { userIds });

    // Get all active BEP20 assets with contract addresses
    const { data: bep20Assets, error: assetError } = await supabase
      .from('assets')
      .select('id, symbol, name, contract_address, decimals, network')
      .eq('is_active', true)
      .eq('network', 'BEP20')
      .not('contract_address', 'is', null);

    if (assetError) {
      console.error('[sync-bep20-balances] Failed to fetch assets:', assetError);
      throw assetError;
    }

    if (!bep20Assets || bep20Assets.length === 0) {
      console.log('[sync-bep20-balances] No BEP20 assets with contract addresses found');
      return new Response(
        JSON.stringify({ synced: 0, total: 0, message: 'No BEP20 assets configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-bep20-balances] Found ${bep20Assets.length} BEP20 assets:`, 
      bep20Assets.map(a => `${a.symbol} (${a.contract_address})`));

    // Get user profiles with BSC wallet addresses (including legacy wallet_address)
    let profileQuery = supabase
      .from('profiles')
      .select('id, user_id, bsc_wallet_address, wallet_address, wallet_addresses');

    if (userIds && userIds.length > 0) {
      profileQuery = profileQuery.in('user_id', userIds);
    }

    const { data: rawProfiles, error: profileError } = await profileQuery;
    
    // Filter to profiles that have any wallet address
    const profiles = rawProfiles?.filter(p => {
      if (p.bsc_wallet_address) return true;
      if (p.wallet_address) return true;
      if (p.wallet_addresses) {
        const wa = p.wallet_addresses as Record<string, any>;
        if (wa['bsc-mainnet'] || wa['bsc'] || wa['evm']?.bsc) return true;
      }
      return false;
    }) || [];

    if (profileError) {
      console.error('[sync-bep20-balances] Failed to fetch profiles:', profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[sync-bep20-balances] No profiles with BSC wallet addresses found');
      return new Response(
        JSON.stringify({ synced: 0, total: 0, message: 'No wallets to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-bep20-balances] Found ${profiles.length} profiles with BSC wallets`);

    // Connect to BSC
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

    let syncedCount = 0;
    const errors: { userId: string; asset: string; error: string }[] = [];

    // Process each profile
    for (const profile of profiles) {
      // Resolve wallet address with fallbacks
      let walletAddress = profile.bsc_wallet_address;
      if (!walletAddress && profile.wallet_addresses) {
        const wa = profile.wallet_addresses as Record<string, any>;
        walletAddress = wa['bsc-mainnet'] || wa['bsc'] || wa['evm']?.bsc || null;
      }
      if (!walletAddress) {
        walletAddress = profile.wallet_address;
      }
      
      if (!walletAddress) continue;
      
      const userId = profile.user_id || profile.id;

      console.log(`[sync-bep20-balances] Processing wallet ${walletAddress} for user ${userId}`);

      // Check balance for each BEP20 token
      for (const asset of bep20Assets) {
        try {
          const contract = new ethers.Contract(asset.contract_address, ERC20_ABI, provider);
          const balanceRaw = await contract.balanceOf(walletAddress);
          const decimals = asset.decimals || 18;
          const balance = Number(ethers.formatUnits(balanceRaw, decimals));

          console.log(`[sync-bep20-balances] ${asset.symbol} balance for ${walletAddress}: ${balance}`);

          // Only upsert if balance > 0 to avoid cluttering the table
          if (balance > 0) {
            // CRITICAL: Preserve existing locked balance - never reset it!
            // First fetch existing record to get current locked amount
            const { data: existingBalance } = await supabase
              .from('wallet_balances')
              .select('available, locked, total')
              .eq('user_id', userId)
              .eq('asset_id', asset.id)
              .maybeSingle();

            const existingLocked = existingBalance?.locked || 0;
            const existingTotal = existingBalance?.total || 0;
            
            // Only credit the difference if on-chain is higher than what we have
            // This prevents "free" balance from appearing
            const newTotal = Math.max(balance, existingTotal);
            const newAvailable = newTotal - existingLocked;

            // Note: 'total' is a generated column, don't include it in upsert
            const { error: upsertError } = await supabase
              .from('wallet_balances')
              .upsert({
                user_id: userId,
                asset_id: asset.id,
                available: newAvailable,
                locked: existingLocked, // PRESERVE locked balance
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,asset_id'
              });

            if (upsertError) {
              console.error(`[sync-bep20-balances] Failed to upsert ${asset.symbol} for ${walletAddress}:`, upsertError);
              errors.push({ userId, asset: asset.symbol, error: upsertError.message });
            } else {
              syncedCount++;
              console.log(`[sync-bep20-balances] Synced ${asset.symbol}: available=${newAvailable}, locked=${existingLocked}, total=${newTotal} for user ${userId}`);
            }
          }
        } catch (error: any) {
          console.error(`[sync-bep20-balances] Error fetching ${asset.symbol} balance for ${walletAddress}:`, error);
          errors.push({ userId, asset: asset.symbol, error: error.message });
        }
      }
    }

    const response = {
      synced: syncedCount,
      total: profiles.length * bep20Assets.length,
      assets: bep20Assets.map(a => a.symbol),
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('[sync-bep20-balances] Sync complete:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-bep20-balances] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
