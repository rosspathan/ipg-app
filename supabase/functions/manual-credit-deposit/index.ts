import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualCreditRequest {
  txHash: string;
  assetSymbol: string;
  amount: number;
  network?: string;
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

    const { txHash, assetSymbol, amount, network = 'bsc' }: ManualCreditRequest = await req.json();

    console.log(`[manual-credit] User ${user.id} manually crediting ${amount} ${assetSymbol}, tx: ${txHash.slice(0, 10)}...`);

    // Validate inputs
    if (!txHash || !txHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash format');
    }

    if (!assetSymbol || amount <= 0) {
      throw new Error('Invalid asset symbol or amount');
    }

    // Check if transaction already exists
    const { data: existing } = await supabaseClient
      .from('deposits')
      .select('id, amount, status, asset_id')
      .eq('tx_hash', txHash.toLowerCase())
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      console.log(`[manual-credit] Transaction already exists: ${existing.id}, ensuring wallet balance...`);
      
      // Ensure wallet balance exists for this deposit
      const { data: existingBalance } = await supabaseClient
        .from('wallet_balances')
        .select('available')
        .eq('user_id', user.id)
        .eq('asset_id', existing.asset_id)
        .maybeSingle();

      if (!existingBalance) {
        // Create missing wallet balance
        const { error: createError } = await supabaseClient
          .from('wallet_balances')
          .insert({
            user_id: user.id,
            asset_id: existing.asset_id,
            available: existing.amount,
            locked: 0
          });

        if (createError) {
          console.error('[manual-credit] Failed to create wallet balance:', createError);
          throw new Error('Failed to create wallet balance');
        }

        console.log(`[manual-credit] Created missing wallet balance for deposit ${existing.id}`);
      }

      return new Response(JSON.stringify({
        success: true,
        alreadyExists: true,
        deposit: existing,
        message: `Deposit previously recorded; wallet balance ensured.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('id, symbol, decimals, name, initial_price')
      .ilike('symbol', assetSymbol)
      .eq('is_active', true)
      .maybeSingle();

    if (assetError || !asset) {
      throw new Error(`Asset ${assetSymbol} not found or not active`);
    }

    console.log(`[manual-credit] Found asset: ${asset.symbol} (${asset.name})`);

    // Create deposit record with completed status
    const { data: deposit, error: insertError } = await supabaseClient
      .from('deposits')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount,
        tx_hash: txHash.toLowerCase(),
        network,
        status: 'completed', // Mark as completed immediately
        confirmations: 999,
        required_confirmations: 2,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[manual-credit] Insert error:', insertError);
      throw new Error(`Failed to create deposit: ${insertError.message}`);
    }

    console.log(`[manual-credit] Created deposit ${deposit.id} with status: completed`);

    // Credit wallet balance directly
    const { data: existingBalance } = await supabaseClient
      .from('wallet_balances')
      .select('available')
      .eq('user_id', user.id)
      .eq('asset_id', asset.id)
      .maybeSingle();

    if (existingBalance) {
      // Update existing balance (only update available, total is generated)
      const { error: updateError } = await supabaseClient
        .from('wallet_balances')
        .update({
          available: existingBalance.available + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('asset_id', asset.id);

      if (updateError) {
        console.error('[manual-credit] Balance update error:', updateError);
        throw new Error('Failed to update wallet balance');
      }

      console.log(`[manual-credit] Updated available balance: ${existingBalance.available} -> ${existingBalance.available + amount} ${asset.symbol}`);
    } else {
      // Create new balance entry (do not set total, it's generated)
      const { error: createError } = await supabaseClient
        .from('wallet_balances')
        .insert({
          user_id: user.id,
          asset_id: asset.id,
          available: amount,
          locked: 0
        });

      if (createError) {
        console.error('[manual-credit] Balance create error:', createError);
        throw new Error('Failed to create wallet balance');
      }

      console.log(`[manual-credit] Created new balance: ${amount} ${asset.symbol}`);
    }

    const usdValue = amount * (asset.initial_price || 0);

    return new Response(JSON.stringify({
      success: true,
      amount,
      symbol: asset.symbol,
      usdValue,
      deposit,
      message: `Successfully credited ${amount} ${asset.symbol} ($${usdValue.toFixed(2)})`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[manual-credit] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
