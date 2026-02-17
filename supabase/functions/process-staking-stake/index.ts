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

    const { plan_id, amount } = await req.json();

    if (!plan_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan_id or amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-staking-stake] User:', user.id, 'Plan:', plan_id, 'Amount:', amount);

    // Get staking config
    const { data: config } = await supabase
      .from('crypto_staking_config')
      .select('*')
      .single();

    if (!config || !config.is_active) {
      return new Response(
        JSON.stringify({ error: 'Staking is not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan
    const { data: plan, error: planError } = await supabase
      .from('crypto_staking_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Staking plan not found or inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount against plan limits
    if (amount < Number(plan.min_amount)) {
      return new Response(
        JSON.stringify({ error: `Minimum stake is ${plan.min_amount} ${plan.currency}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (plan.max_amount && amount > Number(plan.max_amount)) {
      return new Response(
        JSON.stringify({ error: `Maximum stake for this plan is ${plan.max_amount} ${plan.currency}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user's staking account
    let { data: account } = await supabase
      .from('user_staking_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!account) {
      const { data: newAccount, error: createError } = await supabase
        .from('user_staking_accounts')
        .insert({
          user_id: user.id,
          currency: plan.currency,
          available_balance: 0,
          staked_balance: 0,
          total_rewards_earned: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('[process-staking-stake] Error creating account:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create staking account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      account = newAccount;
    }

    // Check available balance
    if (Number(account.available_balance) < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient staking balance. Please fund your staking account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fee and net stake
    const stakingFee = config.staking_fee_percent || 0.5;
    const feeAmount = amount * (stakingFee / 100);
    const netStake = amount - feeAmount;
    const balanceBefore = Number(account.available_balance);
    const balanceAfter = balanceBefore - amount;
    const stakedBefore = Number(account.staked_balance);
    const stakedAfter = stakedBefore + netStake;

    // Lock date
    const now = new Date();
    const lockUntil = new Date(now.getTime() + plan.lock_period_days * 86400000);

    // Update staking account balances
    const { error: updateError } = await supabase
      .from('user_staking_accounts')
      .update({
        available_balance: balanceAfter,
        staked_balance: stakedAfter,
        updated_at: now.toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[process-staking-stake] Error updating account:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create stake record
    const { data: stake, error: stakeError } = await supabase
      .from('user_crypto_stakes')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        staking_account_id: account.id,
        stake_amount: netStake,
        fee_paid: feeAmount,
        monthly_reward_percent: plan.monthly_reward_percent,
        currency: plan.currency,
        status: 'active',
        staked_at: now.toISOString(),
        lock_until: lockUntil.toISOString(),
        total_rewards: 0,
      })
      .select()
      .single();

    if (stakeError) {
      console.error('[process-staking-stake] Error creating stake:', stakeError);
      // Rollback balance
      await supabase
        .from('user_staking_accounts')
        .update({
          available_balance: balanceBefore,
          staked_balance: stakedBefore,
        })
        .eq('id', account.id);

      return new Response(
        JSON.stringify({ error: 'Failed to create stake' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record in ledger
    await supabase
      .from('crypto_staking_ledger')
      .insert({
        user_id: user.id,
        staking_account_id: account.id,
        stake_id: stake.id,
        tx_type: 'stake',
        amount: -amount,
        fee_amount: feeAmount,
        currency: plan.currency,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        notes: `Staked ${netStake} ${plan.currency} in ${plan.name} plan (fee: ${feeAmount})`,
      });

    console.log('[process-staking-stake] Success! Stake ID:', stake.id);

    return new Response(
      JSON.stringify({
        success: true,
        stake_id: stake.id,
        staked_amount: netStake,
        fee: feeAmount,
        lock_until: lockUntil.toISOString(),
        plan_name: plan.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-staking-stake] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
