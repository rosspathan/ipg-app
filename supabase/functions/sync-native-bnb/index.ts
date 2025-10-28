import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { ethers } from 'https://esm.sh/ethers@6.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  userIds?: string[];  // Optional: specific user IDs to sync, otherwise sync all
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: SyncRequest = await req.json().catch(() => ({}));
    const { userIds } = body;

    console.log('[sync-native-bnb] Starting sync...', { userIds });

    // Get native BNB asset
    const { data: bnbAsset, error: assetError } = await supabase
      .from('assets')
      .select('id, symbol, network')
      .eq('symbol', 'BNB')
      .eq('network', 'BNB')
      .single();

    if (assetError || !bnbAsset) {
      console.error('[sync-native-bnb] Native BNB asset not found:', assetError);
      return new Response(
        JSON.stringify({ error: 'Native BNB asset not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync-native-bnb] Found BNB asset:', bnbAsset.id);

    // Get user profiles with BSC wallet addresses
    let profileQuery = supabase
      .from('profiles')
      .select('id, bsc_wallet_address')
      .not('bsc_wallet_address', 'is', null);

    if (userIds && userIds.length > 0) {
      profileQuery = profileQuery.in('id', userIds);
    }

    const { data: profiles, error: profileError } = await profileQuery;

    if (profileError) {
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[sync-native-bnb] No profiles with BSC addresses found');
      return new Response(
        JSON.stringify({ synced: 0, message: 'No users with BSC wallets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-native-bnb] Found ${profiles.length} profiles to sync`);

    // Connect to BSC
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

    let syncedCount = 0;
    const errors: any[] = [];

    // Sync each user's native BNB balance
    for (const profile of profiles) {
      try {
        const address = profile.bsc_wallet_address;
        console.log(`[sync-native-bnb] Checking balance for ${address}`);

        // Get native BNB balance
        const balanceWei = await provider.getBalance(address);
        const balance = parseFloat(ethers.formatEther(balanceWei));

        console.log(`[sync-native-bnb] Balance for ${address}: ${balance} BNB`);

        // Upsert wallet balance
        const { error: upsertError } = await supabase
          .from('wallet_balances')
          .upsert({
            user_id: profile.id,
            asset_id: bnbAsset.id,
            total: balance,
            available: balance,
            locked: 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,asset_id'
          });

        if (upsertError) {
          console.error(`[sync-native-bnb] Failed to upsert balance for ${address}:`, upsertError);
          errors.push({ userId: profile.id, error: upsertError.message });
        } else {
          syncedCount++;
          console.log(`[sync-native-bnb] Synced ${address}: ${balance} BNB`);
        }

      } catch (error: any) {
        console.error(`[sync-native-bnb] Error syncing ${profile.bsc_wallet_address}:`, error);
        errors.push({ userId: profile.id, error: error.message });
      }
    }

    console.log(`[sync-native-bnb] Completed. Synced: ${syncedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        synced: syncedCount,
        total: profiles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-native-bnb] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
