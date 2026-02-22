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

    // Get user's internal balance (read-only check for UX feedback)
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

    // P0 FIX: Circuit breaker - validate withdrawal request
    const { data: circuitCheck, error: circuitError } = await supabase.rpc(
      'validate_withdrawal_request',
      { p_user_id: user.id, p_amount_usd: amount, p_withdrawal_type: 'crypto' }
    );
    if (circuitError) {
      console.error('[Withdrawal] Circuit breaker error:', circuitError);
      return new Response(
        JSON.stringify({ success: false, error: 'Withdrawal validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (circuitCheck && !circuitCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: circuitCheck.reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // P0 FIX: Replace XOR with AES-256-GCM decryption
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
      // Parse the stored encrypted data (format: base64(iv):base64(ciphertext))
      const parts = profile.encrypted_private_key.split(':');
      if (parts.length === 2) {
        // New AES-256-GCM format: iv:ciphertext
        const ivBytes = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
        const ciphertextBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
        
        // Derive key from encryption key using SHA-256
        const keyMaterial = new TextEncoder().encode(encryptionKey);
        const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
        const cryptoKey = await crypto.subtle.importKey(
          'raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBytes },
          cryptoKey,
          ciphertextBytes
        );
        privateKey = new TextDecoder().decode(decrypted);
      } else {
        // Legacy XOR format - log warning but still support for migration
        console.warn('[Withdrawal] WARNING: Legacy XOR encryption detected. Keys should be re-encrypted with AES-256-GCM.');
        const encrypted = Uint8Array.from(atob(profile.encrypted_private_key), c => c.charCodeAt(0));
        const key = new TextEncoder().encode(encryptionKey);
        const decrypted = new Uint8Array(encrypted.length);
        for (let i = 0; i < encrypted.length; i++) {
          decrypted[i] = encrypted[i] ^ key[i % key.length];
        }
        privateKey = new TextDecoder().decode(decrypted);
      }
    } catch (decryptError) {
      console.error('[Withdrawal] Failed to decrypt private key:', decryptError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to access wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL FIX: Atomically validate ledger + deduct balance + record in ledger
    const { data: ledgerCheck, error: ledgerError } = await supabase.rpc('validate_and_record_withdrawal', {
      p_user_id: user.id,
      p_asset_symbol: asset_symbol,
      p_asset_id: asset.id,
      p_amount: amountBN.toNumber(),
      p_fee: withdrawFee.toNumber(),
      p_reference_type: 'crypto_withdrawal',
      p_notes: `Crypto withdrawal to ${destination_address}`
    });

    if (ledgerError) {
      console.error('[Withdrawal] Ledger validation error:', ledgerError);
      return new Response(
        JSON.stringify({ success: false, error: 'Balance verification failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!ledgerCheck?.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: ledgerCheck?.reason || 'Withdrawal not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Withdrawal] Ledger validated: debited=${ledgerCheck.debited}, new_available=${ledgerCheck.new_available}`);

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
      // Refund via ledger
      await supabase.rpc('refund_failed_withdrawal', {
        p_user_id: user.id,
        p_asset_symbol: asset_symbol,
        p_asset_id: asset.id,
        p_amount: amountBN.toNumber(),
        p_fee: withdrawFee.toNumber(),
        p_reference_type: 'withdrawal_record_failed',
        p_notes: 'Failed to create withdrawal request record'
      });
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

    // Step 2: Execute on-chain transfer
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

      // Refund via ledger
      await supabase.rpc('refund_failed_withdrawal', {
        p_user_id: user.id,
        p_asset_symbol: asset_symbol,
        p_asset_id: asset.id,
        p_amount: amountBN.toNumber(),
        p_fee: withdrawFee.toNumber(),
        p_reference_type: 'blockchain_failure',
        p_reference_id: withdrawal.id,
        p_notes: `On-chain transfer failed: ${txError instanceof Error ? txError.message : 'Unknown'}`
      });

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

    // Attempt to rollback via ledger if we have context
    if (userId && assetId && lockedAmount) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseAdmin.rpc('refund_failed_withdrawal', {
          p_user_id: userId,
          p_asset_symbol: '', // Will be resolved from asset_id
          p_asset_id: assetId,
          p_amount: lockedAmount.toNumber(),
          p_fee: 0,
          p_reference_type: 'fatal_error_refund',
          p_notes: `Fatal error rollback: ${error instanceof Error ? error.message : 'Unknown'}`
        });
        console.log('[Withdrawal] Rolled back balance via ledger after error');
      } catch (rollbackError) {
        console.error('[Withdrawal] Rollback failed:', rollbackError);
      }
    }

    if (withdrawalId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseAdmin
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
