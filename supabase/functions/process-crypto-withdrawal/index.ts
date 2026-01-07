/**
 * Process Crypto Withdrawal Edge Function
 * HYBRID MODEL: Handles user-initiated withdrawals from internal ledger to on-chain
 * 
 * Flow:
 * 1. Validate user has sufficient internal balance
 * 2. Deduct from wallet_balances (available)
 * 3. Sign and broadcast on-chain transfer from user's Web3 wallet
 * 4. Record the withdrawal request
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSC_RPC = 'https://bsc-dataseed.binance.org';

// ERC20 Transfer ABI
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    if (!asset.withdraw_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: `Withdrawals disabled for ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const minWithdraw = asset.min_withdraw_amount || 0;
    const maxWithdraw = asset.max_withdraw_amount || Infinity;
    const withdrawFee = asset.withdraw_fee || 0;

    if (amount < minWithdraw) {
      return new Response(
        JSON.stringify({ success: false, error: `Minimum withdrawal is ${minWithdraw} ${asset_symbol}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount > maxWithdraw) {
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

    const totalRequired = amount + withdrawFee;
    if (balance.available < totalRequired) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient balance. Available: ${balance.available}, Required: ${totalRequired} (${amount} + ${withdrawFee} fee)` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet private key from encrypted storage
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

    // Decrypt private key (using env secret)
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
      // Simple XOR decryption (in production, use proper AES)
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

    // Create withdrawal request record (status: pending)
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('crypto_withdrawal_requests')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount,
        fee: withdrawFee,
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

    // Deduct from internal balance (move to locked during processing)
    const { error: deductError } = await supabase
      .from('wallet_balances')
      .update({
        available: balance.available - totalRequired,
        locked: (balance.locked || 0) + totalRequired
      })
      .eq('user_id', user.id)
      .eq('asset_id', asset.id);

    if (deductError) {
      // Rollback withdrawal request
      await supabase.from('crypto_withdrawal_requests').delete().eq('id', withdrawal.id);
      console.error('[Withdrawal] Failed to deduct balance:', deductError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process withdrawal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute on-chain transfer
    let txHash: string | null = null;
    try {
      const provider = new ethers.JsonRpcProvider(BSC_RPC);
      const wallet = new ethers.Wallet(privateKey, provider);

      const decimals = asset.decimals || 18;
      const amountWei = ethers.parseUnits(amount.toString(), decimals);

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

      // Update withdrawal request to completed
      await supabase
        .from('crypto_withdrawal_requests')
        .update({
          status: 'completed',
          tx_hash: txHash,
          completed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      // Remove from locked balance (already transferred)
      await supabase
        .from('wallet_balances')
        .update({
          locked: Math.max(0, (balance.locked || 0) + totalRequired - totalRequired)
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

      return new Response(
        JSON.stringify({
          success: true,
          withdrawal_id: withdrawal.id,
          tx_hash: txHash,
          amount,
          fee: withdrawFee,
          destination: destination_address
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (txError) {
      console.error('[Withdrawal] On-chain transfer failed:', txError);

      // Mark withdrawal as failed and unlock balance
      await supabase
        .from('crypto_withdrawal_requests')
        .update({
          status: 'failed',
          error_message: txError instanceof Error ? txError.message : 'Transfer failed'
        })
        .eq('id', withdrawal.id);

      // Return funds to available
      await supabase
        .from('wallet_balances')
        .update({
          available: balance.available,
          locked: balance.locked || 0
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

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
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
