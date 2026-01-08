/**
 * Auto-Detect Deposits Edge Function
 * Automatically monitors and credits on-chain deposits to wallet_balances
 * Run via cron job every 60 seconds
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import BigNumber from "https://esm.sh/bignumber.js@9.1.2";

BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSC_RPC = 'https://bsc-dataseed.binance.org';

interface DepositResult {
  user_id: string;
  asset_symbol: string;
  credited_amount: string;
  tx_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const results: DepositResult[] = [];
  const errors: string[] = [];

  try {
    console.log('[auto-detect-deposits] Starting deposit detection...');

    // Get active users with BSC wallets (active in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activeProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, bsc_wallet_address')
      .not('bsc_wallet_address', 'is', null)
      .gte('updated_at', sevenDaysAgo)
      .limit(100); // Process max 100 users per run

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!activeProfiles || activeProfiles.length === 0) {
      console.log('[auto-detect-deposits] No active users with wallets');
      return new Response(
        JSON.stringify({ success: true, processed: 0, deposits: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auto-detect-deposits] Processing ${activeProfiles.length} users`);

    // Get supported assets for deposit
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, contract_address, decimals, auto_deposit_enabled')
      .eq('deposit_enabled', true)
      .eq('is_active', true);

    if (assetsError) {
      throw new Error(`Failed to fetch assets: ${assetsError.message}`);
    }

    // Process each user
    for (const profile of activeProfiles) {
      if (!profile.bsc_wallet_address) continue;

      try {
        await processUserDeposits(
          supabase,
          profile.user_id,
          profile.bsc_wallet_address,
          assets || [],
          results
        );
      } catch (userError) {
        console.error(`[auto-detect-deposits] Error for user ${profile.user_id}:`, userError);
        errors.push(`User ${profile.user_id}: ${userError.message}`);
      }
    }

    console.log(`[auto-detect-deposits] Completed. Deposits: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: activeProfiles.length,
        deposits: results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-detect-deposits] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processUserDeposits(
  supabase: any,
  userId: string,
  walletAddress: string,
  assets: any[],
  results: DepositResult[]
) {
  for (const asset of assets) {
    if (!asset.auto_deposit_enabled) continue;

    try {
      // Fetch on-chain balance
      const onchainBalance = await getOnchainBalance(
        walletAddress,
        asset.symbol,
        asset.contract_address,
        asset.decimals || 18
      );

      if (onchainBalance.isLessThanOrEqualTo(0)) continue;

      // Get current DB balance (total = available + locked)
      const { data: dbBalance } = await supabase
        .from('wallet_balances')
        .select('available, locked')
        .eq('user_id', userId)
        .eq('asset_id', asset.id)
        .single();

      const dbTotal = new BigNumber(String(dbBalance?.available || 0))
        .plus(new BigNumber(String(dbBalance?.locked || 0)));

      // Calculate difference (new deposit)
      const deposit = onchainBalance.minus(dbTotal);

      // Only credit if deposit > 0.00000001 (dust threshold)
      if (deposit.isGreaterThan(new BigNumber('0.00000001'))) {
        console.log(`[auto-detect-deposits] New deposit detected: ${deposit.toFixed(8)} ${asset.symbol} for user ${userId}`);

        // Credit to wallet_balances
        if (dbBalance) {
          // Update existing balance
          const newAvailable = new BigNumber(String(dbBalance.available)).plus(deposit);
          
          const { error: updateError } = await supabase
            .from('wallet_balances')
            .update({
              available: newAvailable.toFixed(8),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('asset_id', asset.id);

          if (updateError) {
            throw new Error(`Failed to update balance: ${updateError.message}`);
          }
        } else {
          // Insert new balance
          const { error: insertError } = await supabase
            .from('wallet_balances')
            .insert({
              user_id: userId,
              asset_id: asset.id,
              available: deposit.toFixed(8),
              locked: 0
            });

          if (insertError) {
            throw new Error(`Failed to insert balance: ${insertError.message}`);
          }
        }

        // Record the deposit in ledger for audit
        await supabase
          .from('deposit_transactions')
          .insert({
            user_id: userId,
            asset_id: asset.id,
            amount: deposit.toFixed(8),
            from_address: walletAddress,
            status: 'completed',
            tx_type: 'auto_detected',
            detected_at: new Date().toISOString()
          })
          .catch((e: Error) => console.warn('[auto-detect-deposits] Failed to record deposit tx:', e));

        results.push({
          user_id: userId,
          asset_symbol: asset.symbol,
          credited_amount: deposit.toFixed(8),
          tx_type: 'auto_detected'
        });
      }
    } catch (assetError) {
      console.warn(`[auto-detect-deposits] Error checking ${asset.symbol} for user ${userId}:`, assetError);
    }
  }
}

async function getOnchainBalance(
  walletAddress: string,
  symbol: string,
  contractAddress: string | null,
  decimals: number
): Promise<BigNumber> {
  try {
    if (symbol === 'BNB' || !contractAddress) {
      // Native BNB balance
      const response = await fetch(BSC_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 1
        })
      });
      const result = await response.json();
      if (result.result) {
        return new BigNumber(result.result).dividedBy(new BigNumber(10).pow(18));
      }
    } else {
      // ERC20 token balance
      const balanceOfSelector = '0x70a08231';
      const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, '0');
      const data = balanceOfSelector + paddedAddress;
      
      const response = await fetch(BSC_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: contractAddress, data }, 'latest'],
          id: 1
        })
      });
      const result = await response.json();
      if (result.result && result.result !== '0x') {
        return new BigNumber(result.result).dividedBy(new BigNumber(10).pow(decimals));
      }
    }
  } catch (e) {
    console.error(`[getOnchainBalance] Error for ${symbol}:`, e);
  }
  
  return new BigNumber(0);
}
