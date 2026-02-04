/**
 * Monitor Custodial Deposits Edge Function
 * 
 * Scans the platform hot wallet for incoming token transfers.
 * When a deposit is detected:
 * 1. Identifies the sender (user) by matching tx.from to registered wallets
 * 2. Creates a custodial_deposits record with ACTUAL tx.from address
 * 3. Credits the user's wallet_balances (trading balance) when confirmed
 * 
 * SECURITY: Only credits deposits where tx.from EXACTLY matches a registered user wallet.
 * 
 * This function should be called periodically (e.g., every 1-2 minutes via cron)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

interface MatchedUser {
  user_id: string;
  matched_address: string;
  match_source: 'profiles_wallet' | 'profiles_bsc' | 'wallets_user';
}

const REQUIRED_CONFIRMATIONS = 15;

async function getCurrentBlockNumber(params: {
  bscRpcUrl: string | null;
  bscscanApiKey: string;
}): Promise<number> {
  const { bscRpcUrl, bscscanApiKey } = params;

  // 1) Prefer RPC
  if (bscRpcUrl) {
    try {
      const rpc = bscRpcUrl.trim();
      const rpcResp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      const rpcJson = await rpcResp.json();
      const hex = rpcJson?.result;
      if (typeof hex === 'string' && hex.startsWith('0x')) {
        const n = parseInt(hex, 16);
        if (Number.isFinite(n)) return n;
      }
      console.warn('[monitor-custodial-deposits] RPC eth_blockNumber returned invalid result:', rpcJson);
    } catch (e: any) {
      console.warn('[monitor-custodial-deposits] RPC eth_blockNumber failed, falling back to BscScan:', e?.message || e);
    }
  }

  // 2) Fallback: BscScan proxy
  const blockResponse = await fetch(
    `https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${bscscanApiKey}`
  );
  const blockData = await blockResponse.json();
  const result = blockData?.result;

  if (typeof result === 'string' && result.startsWith('0x')) {
    const n = parseInt(result, 16);
    if (Number.isFinite(n)) return n;
  }

  // BscScan may return NOTOK with a non-hex string in result
  throw new Error(`Unable to determine current block. BscScan response: ${JSON.stringify(blockData)}`);
}

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

    // Get active Trading hot wallet (prioritize wallets with "Trading" in label)
    let hotWallet = null;
    
    // First try to get the Trading Hot Wallet specifically
    const { data: tradingWallet } = await supabase
      .from('platform_hot_wallet')
      .select('address, chain, label')
      .eq('is_active', true)
      .eq('chain', 'BSC')
      .ilike('label', '%Trading%')
      .limit(1)
      .maybeSingle();

    if (tradingWallet?.address) {
      hotWallet = tradingWallet;
      console.log(`[monitor-custodial-deposits] Using Trading Hot Wallet: ${tradingWallet.address}`);
    } else {
      // Fallback: get any active BSC wallet
      const { data: anyWallet } = await supabase
        .from('platform_hot_wallet')
        .select('address, chain, label')
        .eq('is_active', true)
        .eq('chain', 'BSC')
        .limit(1)
        .maybeSingle();
      
      if (anyWallet?.address) {
        hotWallet = anyWallet;
        console.log(`[monitor-custodial-deposits] Using fallback wallet: ${anyWallet.label} - ${anyWallet.address}`);
      }
    }

    if (!hotWallet) {
      console.error('[monitor-custodial-deposits] No active BSC hot wallet found');
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
    const currentBlock = await getCurrentBlockNumber({
      bscRpcUrl: Deno.env.get('BSC_RPC_URL'),
      bscscanApiKey,
    });
    console.log(`[monitor-custodial-deposits] Current block: ${currentBlock}`);

    // Lookback 2 hours for new transactions
    const lookbackTimestamp = Math.floor(Date.now() / 1000) - (2 * 3600);

    let totalDiscovered = 0;
    let totalCredited = 0;
    let totalSkippedUnknown = 0;
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
          const actualSender = tx.from.toLowerCase(); // ACTUAL blockchain sender
          const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
          const txBlock = parseInt(tx.blockNumber);
          const confirmations = currentBlock - txBlock;

          // Check if already processed
          const { data: existing } = await supabase
            .from('custodial_deposits')
            .select('id, status, confirmations, from_address, user_id')
            .eq('tx_hash', txHash)
            .single();

          if (existing) {
            // SECURITY: Verify the stored from_address matches actual tx sender
            if (existing.from_address?.toLowerCase() !== actualSender) {
              console.error(`[monitor-custodial-deposits] SECURITY ALERT: from_address mismatch for ${txHash}`);
              console.error(`  Stored: ${existing.from_address}, Actual: ${actualSender}`);
              // Log this security event
              await logDepositAudit(supabase, 'FROM_ADDRESS_MISMATCH', {
                tx_hash: txHash,
                stored_from: existing.from_address,
                actual_from: actualSender,
                user_id: existing.user_id
              });
              continue;
            }

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

          // SECURITY: Find user by ACTUAL tx.from address (strict matching)
          const matchedUser = await findUserByWalletAddress(supabase, actualSender);

          if (!matchedUser) {
            console.log(`[monitor-custodial-deposits] ⚠️ Unknown sender (not registered): ${actualSender}`);
            console.log(`  TX: ${txHash}, Amount: ${amount} ${asset.symbol}`);
            totalSkippedUnknown++;
            
            // Log unknown deposit for admin review
            await logDepositAudit(supabase, 'UNKNOWN_SENDER', {
              tx_hash: txHash,
              from_address: actualSender,
              amount,
              symbol: asset.symbol
            });
            
            results.push({ 
              tx_hash: txHash, 
              action: 'skipped_unknown_sender', 
              symbol: asset.symbol, 
              amount, 
              from: actualSender 
            });
            continue;
          }

          // SECURITY: Verify the matched address is exactly the tx sender
          if (matchedUser.matched_address.toLowerCase() !== actualSender) {
            console.error(`[monitor-custodial-deposits] CRITICAL: Address match verification failed!`);
            console.error(`  Expected: ${actualSender}, Matched: ${matchedUser.matched_address}`);
            continue;
          }

          console.log(`[monitor-custodial-deposits] ✓ Matched sender ${actualSender} to user ${matchedUser.user_id} via ${matchedUser.match_source}`);

          // Create deposit record with ACTUAL sender address
          await createDepositRecord(
            supabase, 
            matchedUser.user_id, 
            asset.id, 
            amount, 
            txHash, 
            actualSender, // Store the ACTUAL tx.from, not the user's registered wallet
            confirmations,
            matchedUser.match_source
          );

          results.push({ 
            tx_hash: txHash, 
            action: 'discovered', 
            symbol: asset.symbol, 
            amount, 
            from: actualSender,
            user_id: matchedUser.user_id
          });
        }

      } catch (assetError: any) {
        console.error(`[monitor-custodial-deposits] Error processing ${asset.symbol}:`, assetError);
      }
    }

    console.log(`[monitor-custodial-deposits] Complete. Discovered: ${totalDiscovered}, Credited: ${totalCredited}, Unknown: ${totalSkippedUnknown}`);

    return new Response(
      JSON.stringify({
        success: true,
        discovered: totalDiscovered,
        credited: totalCredited,
        skipped_unknown: totalSkippedUnknown,
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

/**
 * Find a user by their registered wallet address (strict exact match)
 */
async function findUserByWalletAddress(supabase: any, address: string): Promise<MatchedUser | null> {
  const normalizedAddress = address.toLowerCase();

  // Check profiles.wallet_address
  const { data: profileWallet } = await supabase
    .from('profiles')
    .select('user_id, wallet_address')
    .ilike('wallet_address', normalizedAddress)
    .single();

  if (profileWallet && profileWallet.wallet_address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: profileWallet.user_id,
      matched_address: profileWallet.wallet_address,
      match_source: 'profiles_wallet'
    };
  }

  // Check profiles.bsc_wallet_address
  const { data: profileBsc } = await supabase
    .from('profiles')
    .select('user_id, bsc_wallet_address')
    .ilike('bsc_wallet_address', normalizedAddress)
    .single();

  if (profileBsc && profileBsc.bsc_wallet_address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: profileBsc.user_id,
      matched_address: profileBsc.bsc_wallet_address,
      match_source: 'profiles_bsc'
    };
  }

  // Check wallets_user table
  const { data: userWallet } = await supabase
    .from('wallets_user')
    .select('user_id, address')
    .ilike('address', normalizedAddress)
    .single();

  if (userWallet && userWallet.address?.toLowerCase() === normalizedAddress) {
    return {
      user_id: userWallet.user_id,
      matched_address: userWallet.address,
      match_source: 'wallets_user'
    };
  }

  return null;
}

/**
 * Log deposit audit events for security monitoring
 */
async function logDepositAudit(supabase: any, eventType: string, details: any) {
  try {
    await supabase
      .from('admin_notifications')
      .insert({
        type: 'deposit_audit',
        title: `Deposit Audit: ${eventType}`,
        message: JSON.stringify(details),
        priority: eventType === 'FROM_ADDRESS_MISMATCH' ? 'high' : 'normal',
        metadata: { event_type: eventType, ...details }
      });
  } catch (e) {
    console.error('[monitor-custodial-deposits] Failed to log audit event:', e);
  }
}

async function createDepositRecord(
  supabase: any,
  userId: string,
  assetId: string,
  amount: number,
  txHash: string,
  actualFromAddress: string, // This MUST be the actual tx.from
  confirmations: number,
  matchSource: string
) {
  const status = confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending';
  
  const { error } = await supabase
    .from('custodial_deposits')
    .insert({
      user_id: userId,
      asset_id: assetId,
      amount,
      tx_hash: txHash,
      from_address: actualFromAddress, // Store ACTUAL sender, not registered wallet
      status,
      confirmations,
      required_confirmations: REQUIRED_CONFIRMATIONS
    });

  if (error) {
    console.error('[monitor-custodial-deposits] Failed to create deposit record:', error);
    return;
  }

  console.log(`[monitor-custodial-deposits] Created deposit record: ${amount} from ${actualFromAddress} (${matchSource}, ${confirmations} confirmations)`);

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
  // Get the deposit to find user_id and verify from_address
  const { data: deposit, error: depositError } = await supabase
    .from('custodial_deposits')
    .select('user_id, status, from_address')
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

  // SECURITY: Final verification - ensure from_address matches a registered wallet for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address, bsc_wallet_address')
    .eq('user_id', deposit.user_id)
    .single();

  const { data: userWallets } = await supabase
    .from('wallets_user')
    .select('address')
    .eq('user_id', deposit.user_id);

  const registeredAddresses = [
    profile?.wallet_address?.toLowerCase(),
    profile?.bsc_wallet_address?.toLowerCase(),
    ...(userWallets || []).map((w: any) => w.address?.toLowerCase())
  ].filter(Boolean);

  const fromAddressLower = deposit.from_address?.toLowerCase();
  
  if (!registeredAddresses.includes(fromAddressLower)) {
    console.error(`[monitor-custodial-deposits] SECURITY: from_address ${fromAddressLower} not in user's registered wallets!`);
    console.error(`  Registered: ${registeredAddresses.join(', ')}`);
    
    // Mark as suspicious and don't credit
    await supabase
      .from('custodial_deposits')
      .update({
        status: 'suspicious',
        updated_at: new Date().toISOString()
      })
      .eq('id', depositId);

    await logDepositAudit(supabase, 'CREDIT_BLOCKED_UNREGISTERED_ADDRESS', {
      deposit_id: depositId,
      user_id: deposit.user_id,
      from_address: deposit.from_address,
      registered_addresses: registeredAddresses
    });

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
