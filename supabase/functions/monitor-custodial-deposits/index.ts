/**
 * Monitor Custodial Deposits Edge Function
 * 
 * Scans the platform hot wallet for incoming token transfers.
 * When a deposit is detected:
 * 1. Identifies the sender (user) by matching from_address to profiles
 * 2. Creates a custodial_deposits record
 * 3. Credits the user's wallet_balances (trading balance) when confirmed
 * 
 * This function should be called periodically (e.g., every 1-2 minutes via cron)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const REQUIRED_CONFIRMATIONS = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('[monitor-custodial-deposits] Starting hot wallet deposit scan...');

    // Get active hot wallet
    const { data: hotWallet, error: hotWalletError } = await supabase
      .from('platform_hot_wallet')
      .select('address, chain')
      .eq('is_active', true)
      .eq('chain', 'BSC')
      .single();

    if (hotWalletError || !hotWallet) {
      console.error('[monitor-custodial-deposits] No active hot wallet found');
      return new Response(
        JSON.stringify({ success: false, error: 'No active hot wallet configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hotWalletAddress = hotWallet.address.toLowerCase();
    console.log(`[monitor-custodial-deposits] Hot wallet: ${hotWalletAddress}`);

    // Get BscScan API key
    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!bscscanApiKey) {
      throw new Error('BSCSCAN_API_KEY not configured');
    }

    // Fetch assets with deposit enabled
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, contract_address, decimals')
      .eq('is_active', true)
      .eq('deposit_enabled', true)
      .not('contract_address', 'is', null);

    if (assetsError || !assets || assets.length === 0) {
      console.log('[monitor-custodial-deposits] No deposit-enabled assets found');
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to monitor', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current block number for confirmation calculation
    const blockResponse = await fetch(`https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${bscscanApiKey}`);
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    console.log(`[monitor-custodial-deposits] Current block: ${currentBlock}`);

    // Lookback 2 hours for new transactions
    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (2 * 3600);

    let totalDiscovered = 0;
    let totalCredited = 0;
    const results: any[] = [];

    // Process each asset
    for (const asset of assets) {
      try {
        console.log(`[monitor-custodial-deposits] Scanning ${asset.symbol}...`);

        // Fetch token transfers TO the hot wallet
        const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${asset.contract_address}&address=${hotWalletAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${bscscanApiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== '1' || !data.result) {
          console.log(`[monitor-custodial-deposits] No transfers found for ${asset.symbol}`);
          continue;
        }

        const transfers: BscScanTokenTransfer[] = data.result;

        // Filter inbound transfers to hot wallet within lookback period
        const inboundTransfers = transfers.filter((tx: BscScanTokenTransfer) => 
          tx.to.toLowerCase() === hotWalletAddress &&
          parseInt(tx.timeStamp) >= lookbackTimestamp
        );

        console.log(`[monitor-custodial-deposits] ${asset.symbol}: ${inboundTransfers.length} inbound transfers`);
        totalDiscovered += inboundTransfers.length;

        for (const tx of inboundTransfers) {
          const txHash = tx.hash.toLowerCase();
          const fromAddress = tx.from.toLowerCase();
          const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
          const txBlock = parseInt(tx.blockNumber);
          const confirmations = currentBlock - txBlock;

          // Check if already processed
          const { data: existing } = await supabase
            .from('custodial_deposits')
            .select('id, status, confirmations')
            .eq('tx_hash', txHash)
            .single();

          if (existing) {
            // Update confirmations if needed
            if (existing.status === 'pending' || existing.status === 'confirmed') {
              if (confirmations >= REQUIRED_CONFIRMATIONS && existing.status !== 'credited') {
                // Ready to credit
                await creditDeposit(supabase, existing.id, asset.id, amount);
                totalCredited++;
                results.push({ tx_hash: txHash, action: 'credited', symbol: asset.symbol, amount });
              } else if (confirmations !== existing.confirmations) {
                // Update confirmation count
                await supabase
                  .from('custodial_deposits')
                  .update({ 
                    confirmations,
                    status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending'
                  })
                  .eq('id', existing.id);
              }
            }
            continue;
          }

          // Find user by wallet address
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .or(`wallet_address.ilike.${fromAddress},bsc_wallet_address.ilike.${fromAddress}`)
            .single();

          if (!userProfile) {
            // Check wallets_user table
            const { data: userWallet } = await supabase
              .from('wallets_user')
              .select('user_id')
              .ilike('address', fromAddress)
              .single();

            if (!userWallet) {
              console.log(`[monitor-custodial-deposits] Unknown sender: ${fromAddress}`);
              continue;
            }

            // Use wallet user_id
            await createDepositRecord(supabase, userWallet.user_id, asset.id, amount, txHash, fromAddress, confirmations);
          } else {
            await createDepositRecord(supabase, userProfile.user_id, asset.id, amount, txHash, fromAddress, confirmations);
          }

          results.push({ tx_hash: txHash, action: 'discovered', symbol: asset.symbol, amount, from: fromAddress });
        }

      } catch (assetError: any) {
        console.error(`[monitor-custodial-deposits] Error processing ${asset.symbol}:`, assetError);
      }
    }

    console.log(`[monitor-custodial-deposits] Complete. Discovered: ${totalDiscovered}, Credited: ${totalCredited}`);

    return new Response(
      JSON.stringify({
        success: true,
        discovered: totalDiscovered,
        credited: totalCredited,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[monitor-custodial-deposits] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createDepositRecord(
  supabase: any,
  userId: string,
  assetId: string,
  amount: number,
  txHash: string,
  fromAddress: string,
  confirmations: number
) {
  const status = confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending';
  
  const { error } = await supabase
    .from('custodial_deposits')
    .insert({
      user_id: userId,
      asset_id: assetId,
      amount,
      tx_hash: txHash,
      from_address: fromAddress,
      status,
      confirmations,
      required_confirmations: REQUIRED_CONFIRMATIONS
    });

  if (error) {
    console.error('[monitor-custodial-deposits] Failed to create deposit record:', error);
    return;
  }

  console.log(`[monitor-custodial-deposits] Created deposit record for ${amount} (${confirmations} confirmations)`);

  // If already confirmed, credit immediately
  if (status === 'confirmed') {
    const { data: deposit } = await supabase
      .from('custodial_deposits')
      .select('id')
      .eq('tx_hash', txHash)
      .single();

    if (deposit) {
      await creditDeposit(supabase, deposit.id, assetId, amount);
    }
  }
}

async function creditDeposit(
  supabase: any,
  depositId: string,
  assetId: string,
  amount: number
) {
  // Get the deposit to find user_id
  const { data: deposit, error: depositError } = await supabase
    .from('custodial_deposits')
    .select('user_id, status')
    .eq('id', depositId)
    .single();

  if (depositError || !deposit) {
    console.error('[monitor-custodial-deposits] Deposit not found:', depositId);
    return;
  }

  if (deposit.status === 'credited') {
    console.log('[monitor-custodial-deposits] Deposit already credited');
    return;
  }

  // Credit to wallet_balances (the actual trading balance table)
  const { data: existingBalance } = await supabase
    .from('wallet_balances')
    .select('available, locked, total')
    .eq('user_id', deposit.user_id)
    .eq('asset_id', assetId)
    .single();

  if (existingBalance) {
    // Update existing balance (total is auto-calculated from available + locked)
    const newAvailable = (existingBalance.available || 0) + amount;
    
    await supabase
      .from('wallet_balances')
      .update({
        available: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', deposit.user_id)
      .eq('asset_id', assetId);
  } else {
    // Insert new balance record (total is auto-calculated)
    await supabase
      .from('wallet_balances')
      .insert({
        user_id: deposit.user_id,
        asset_id: assetId,
        available: amount,
        locked: 0
      });
  }

  // Mark deposit as credited
  await supabase
    .from('custodial_deposits')
    .update({
      status: 'credited',
      credited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', depositId);

  console.log(`[monitor-custodial-deposits] ✓ Credited ${amount} to user ${deposit.user_id} (wallet_balances)`);
}
