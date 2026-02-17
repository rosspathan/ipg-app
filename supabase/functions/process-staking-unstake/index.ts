import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { stake_id } = await req.json();

    if (!stake_id) {
      return new Response(
        JSON.stringify({ error: 'Missing stake_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-staking-unstake] User:', user.id, 'Stake:', stake_id);

    // Get the stake
    const { data: stake, error: stakeError } = await supabase
      .from('user_crypto_stakes')
      .select('*')
      .eq('id', stake_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (stakeError || !stake) {
      return new Response(
        JSON.stringify({ error: 'Active stake not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check lock period
    const lockUntil = new Date(stake.lock_until);
    if (lockUntil > new Date()) {
      return new Response(
        JSON.stringify({ error: `Stake is locked until ${lockUntil.toISOString()}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get config for unstaking fee
    const { data: config } = await supabase
      .from('crypto_staking_config')
      .select('*')
      .single();

    const unstakingFee = config?.unstaking_fee_percent || 0.5;
    const stakeAmount = Number(stake.stake_amount);
    const totalRewards = Number(stake.total_rewards);
    const totalAmount = stakeAmount + totalRewards;
    const feeAmount = totalAmount * (unstakingFee / 100);
    const netReturn = totalAmount - feeAmount;

    // Get user's staking account
    const { data: account } = await supabase
      .from('user_staking_accounts')
      .select('*')
      .eq('id', stake.staking_account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: 'Staking account not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const availBefore = Number(account.available_balance);
    const stakedBefore = Number(account.staked_balance);

    // Update staking account: move from staked to available
    const { error: updateError } = await supabase
      .from('user_staking_accounts')
      .update({
        available_balance: availBefore + netReturn,
        staked_balance: Math.max(0, stakedBefore - stakeAmount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[process-staking-unstake] Balance update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark stake as withdrawn
    await supabase
      .from('user_crypto_stakes')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', stake.id);

    // Record in ledger
    await supabase
      .from('crypto_staking_ledger')
      .insert({
        user_id: user.id,
        staking_account_id: account.id,
        stake_id: stake.id,
        tx_type: 'unstake',
        amount: netReturn,
        fee_amount: feeAmount,
        currency: stake.currency,
        balance_before: availBefore,
        balance_after: availBefore + netReturn,
        notes: `Unstaked ${stakeAmount} + ${totalRewards} rewards (fee: ${feeAmount})`,
      });

    console.log('[process-staking-unstake] Success! Returned:', netReturn);

    return new Response(
      JSON.stringify({
        success: true,
        returned_amount: netReturn,
        fee: feeAmount,
        rewards_earned: totalRewards,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-staking-unstake] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
