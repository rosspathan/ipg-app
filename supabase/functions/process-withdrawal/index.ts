import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { asset_symbol, network, to_address, amount } = await req.json();

    // Validate inputs
    if (!asset_symbol || !network || !to_address || !amount) {
      throw new Error('Missing required fields');
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    // Validate address format
    const trimmedAddress = to_address.trim();
    
    // EVM networks (BEP20, Ethereum)
    if (network === 'BEP20' || network === 'Ethereum') {
      if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
        throw new Error('Invalid EVM address format');
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
        throw new Error('Invalid EVM address characters');
      }
    }
    // Bitcoin
    else if (network === 'Bitcoin') {
      if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmedAddress)) {
        throw new Error('Invalid Bitcoin address format');
      }
    }
    // Tron
    else if (network === 'Tron') {
      if (!trimmedAddress.startsWith('T') || trimmedAddress.length !== 34) {
        throw new Error('Invalid Tron address format');
      }
    }

    // Check daily withdrawal limit (5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayWithdrawals, error: countError } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (countError) {
      console.error('[process-withdrawal] Error checking withdrawal limit:', countError);
    }

    if (todayWithdrawals && todayWithdrawals >= 5) {
      throw new Error('Daily withdrawal limit reached (5 withdrawals per day)');
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', asset_symbol)
      .single();

    if (assetError || !asset) throw new Error('Asset not found');
    if (!asset.withdraw_enabled) throw new Error('Withdrawals are disabled for this asset');

    // Check balance
    const { data: balance, error: balanceError } = await supabase
      .from('wallet_balances')
      .select('available')
      .eq('user_id', user.id)
      .eq('asset_id', asset.id)
      .single();

    if (balanceError || !balance) throw new Error('Balance not found');
    if (balance.available < amountNum) throw new Error('Insufficient balance');

    // Validate amount limits
    if (amountNum < parseFloat(asset.min_withdraw_amount)) {
      throw new Error(`Minimum withdrawal is ${asset.min_withdraw_amount} ${asset_symbol}`);
    }
    if (amountNum > parseFloat(asset.max_withdraw_amount)) {
      throw new Error(`Maximum withdrawal is ${asset.max_withdraw_amount} ${asset_symbol}`);
    }

    // Calculate fees
    const withdrawFee = parseFloat(asset.withdraw_fee) || 0;
    const netAmount = amountNum - withdrawFee;

    if (netAmount <= 0) throw new Error('Amount too small to cover fees');

    // Lock the withdrawal amount (deduct from available, add to locked)
    const { error: lockError } = await supabase.rpc('lock_balance_for_order', {
      p_user_id: user.id,
      p_asset_symbol: asset_symbol,
      p_amount: amountNum
    });

    if (lockError) throw new Error('Failed to lock balance: ' + lockError.message);

    // Simulate blockchain transaction (in production, use Web3 provider)
    const tx_hash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    
    // Create withdrawal record with processing status (auto-process, no admin approval)
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount: amountNum,
        fee: withdrawFee,
        net_amount: netAmount,
        to_address,
        network,
        status: 'processing',
        tx_hash: tx_hash
      })
      .select()
      .single();

    if (withdrawalError) {
      // Rollback: unlock balance
      await supabase.rpc('unlock_balance_for_order', {
        p_user_id: user.id,
        p_asset_symbol: asset_symbol,
        p_amount: amountNum
      });
      throw withdrawalError;
    }

    console.log(`[process-withdrawal] Created withdrawal ${withdrawal.id} for user ${user.id}: ${amountNum} ${asset_symbol}`);

    // Auto-complete withdrawal (simulate blockchain confirmation)
    // In production, this would be done by a background job after blockchain confirmation
    setTimeout(async () => {
      await supabase
        .from('withdrawals')
        .update({ 
          status: 'completed',
          approved_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);
    }, 2000);

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawal_id: withdrawal.id,
        status: 'processing',
        amount: amountNum,
        fee: withdrawFee,
        net_amount: netAmount,
        tx_hash: tx_hash,
        message: 'Withdrawal is being processed. Funds will be sent to blockchain shortly.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
