/**
 * Process Crypto Withdrawal Edge Function - IMPROVED
 * 
 * Flow:
 * 1. Validate user has sufficient balance
 * 2. Lock the amount (move to locked)
 * 3. Execute on-chain transfer
 * 4. On success: deduct locked
 * 5. On failure: return to available
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { ethers } from 'https://esm.sh/ethers@6.15.0';
import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSC_RPC = 'https://bsc-dataseed.binance.org';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)'
];

interface WithdrawalRequest {
  asset_symbol: string;
  amount: number;
  destination_address: string;
  network?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let withdrawalId: string | null = null;
  let lockedAmount: BigNumber | null = null;
  let userId: string | null = null;
  let assetId: string | null = null;
  let originalAvailable: number = 0;
  let originalLocked: number = 0;

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    const body: WithdrawalRequest = await req.json();
    const { asset_symbol, amount, destination_address, network = 'BEP20' } = body;

    console.log(`[Withdrawal] User ${user.id} requesting ${amount} ${asset_symbol} to ${destination_address}`);

    // Validate destination address
    if (!ethers.isAddress(destination_address)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid destination address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, symbol, contract_address, decimals, withdraw_fee, min_withdraw_amount, max_withdraw_amount, withdraw_enabled')
      .eq('symbol', asset_symbol)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ success: false, error: `Asset ${asset_symbol} not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    assetId = asset.id;

    if (!asset.withdraw_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: `Withdrawals disabled for ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const minWithdraw = asset.min_withdraw_amount || 0;
    const maxWithdraw = asset.max_withdraw_amount || Infinity;
    const withdrawFee = new BigNumber(String(asset.withdraw_fee || 0));
    const amountBN = new BigNumber(String(amount));
    const totalRequired = amountBN.plus(withdrawFee);

    if (amountBN.isLessThan(minWithdraw)) {
      return new Response(
        JSON.stringify({ success: false, error: `Minimum withdrawal is ${minWithdraw} ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amountBN.isGreaterThan(maxWithdraw)) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximum withdrawal is ${maxWithdraw} ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's internal balance
    const { data: balance, error: balanceError } = await supabase
      .from('wallet_balances')
      .select('available, locked')
      .eq('user_id', user.id)
      .eq('asset_id', asset.id)
      .single();

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ success: false, error: 'No balance found for this asset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    originalAvailable = balance.available;
    originalLocked = balance.locked || 0;

    const availableBN = new BigNumber(String(balance.available));

    if (availableBN.isLessThan(totalRequired)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient balance. Available: ${balance.available}, Required: ${totalRequired.toFixed(8)} (${amount} + ${withdrawFee.toFixed(8)} fee)` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet private key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, encrypted_private_key')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.encrypted_private_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not configured for withdrawals' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt private key
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('[Withdrawal] WALLET_ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let privateKey: string;
    try {
      const encrypted = Buffer.from(profile.encrypted_private_key, 'base64');
      const key = Buffer.from(encryptionKey, 'utf-8');
      const decrypted = Buffer.alloc(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ key[i % key.length];
      }
      privateKey = decrypted.toString('utf-8');
    } catch (decryptError) {
      console.error('[Withdrawal] Failed to decrypt private key:', decryptError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to access wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create pending withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('crypto_withdrawal_requests')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount: amountBN.toNumber(),
        fee: withdrawFee.toNumber(),
        destination_address,
        network,
        status: 'pending',
        from_address: profile.wallet_address
      })
      .select('id')
      .single();

    if (withdrawalError) {
      console.error('[Withdrawal] Failed to create request:', withdrawalError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    withdrawalId = withdrawal.id;
    lockedAmount = totalRequired;

    // Step 2: Lock the amount (move from available to locked)
    const newAvailable = availableBN.minus(totalRequired);
    const newLocked = new BigNumber(String(originalLocked)).plus(totalRequired);

    const { error: lockError } = await supabase
      .from('wallet_balances')
      .update({
        available: newAvailable.toFixed(8),
        locked: newLocked.toFixed(8),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('asset_id', asset.id);

    if (lockError) {
      // Cleanup withdrawal record
      await supabase.from('crypto_withdrawal_requests').delete().eq('id', withdrawal.id);
      console.error('[Withdrawal] Failed to lock balance:', lockError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process withdrawal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Withdrawal] Locked ${totalRequired.toFixed(8)} ${asset_symbol}`);

    // Step 3: Execute on-chain transfer
    let txHash: string | null = null;
    try {
      const provider = new ethers.JsonRpcProvider(BSC_RPC);
      const wallet = new ethers.Wallet(privateKey, provider);

      const decimals = asset.decimals || 18;
      const amountWei = ethers.parseUnits(amountBN.toFixed(decimals), decimals);

      if (asset.symbol === 'BNB' || !asset.contract_address) {
        // Native BNB transfer
        const tx = await wallet.sendTransaction({
          to: destination_address,
          value: amountWei
        });
        await tx.wait();
        txHash = tx.hash;
      } else {
        // ERC20 token transfer
        const contract = new ethers.Contract(asset.contract_address, ERC20_ABI, wallet);
        const tx = await contract.transfer(destination_address, amountWei);
        await tx.wait();
        txHash = tx.hash;
      }

      console.log(`[Withdrawal] ✓ On-chain transfer complete: ${txHash}`);

      // Step 4: Success - remove from locked balance (already transferred)
      await supabase
        .from('wallet_balances')
        .update({
          locked: Math.max(0, newLocked.minus(totalRequired).toNumber()),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

      // Update withdrawal to completed
      await supabase
        .from('crypto_withdrawal_requests')
        .update({
          status: 'completed',
          tx_hash: txHash,
          completed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      return new Response(
        JSON.stringify({
          success: true,
          withdrawal_id: withdrawal.id,
          tx_hash: txHash,
          amount: amountBN.toNumber(),
          fee: withdrawFee.toNumber(),
          destination: destination_address
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (txError) {
      console.error('[Withdrawal] On-chain transfer failed:', txError);

      // Step 5: Failure - return funds to available
      await supabase
        .from('wallet_balances')
        .update({
          available: originalAvailable,
          locked: originalLocked
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

      // Mark withdrawal as failed
      await supabase
        .from('crypto_withdrawal_requests')
        .update({
          status: 'failed',
          error_message: txError instanceof Error ? txError.message : 'Transfer failed'
        })
        .eq('id', withdrawal.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'On-chain transfer failed. Funds have been returned to your balance.',
          withdrawal_id: withdrawal.id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Withdrawal] Fatal error:', error);

    // Attempt to rollback if we have context
    if (userId && assetId && lockedAmount) {
      try {
        await supabase
          .from('wallet_balances')
          .update({
            available: originalAvailable,
            locked: originalLocked
          })
          .eq('user_id', userId)
          .eq('asset_id', assetId);
        console.log('[Withdrawal] Rolled back balance after error');
      } catch (rollbackError) {
        console.error('[Withdrawal] Rollback failed:', rollbackError);
      }
    }

    if (withdrawalId) {
      await supabase
        .from('crypto_withdrawal_requests')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', withdrawalId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
