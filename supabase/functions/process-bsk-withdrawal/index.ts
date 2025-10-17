import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

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

    const { 
      amount_bsk, 
      withdrawal_type,
      // Bank details
      bank_name,
      account_number,
      ifsc_code,
      account_holder_name,
      // Crypto details
      crypto_symbol,
      crypto_address,
      crypto_network
    } = await req.json();

    // Validate inputs
    if (!amount_bsk || !withdrawal_type) {
      throw new Error('Missing required fields');
    }

    const amountNum = parseFloat(amount_bsk);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    // Check BSK settings
    const { data: settings } = await supabase
      .from('bsk_admin_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settings) {
      if (!settings.withdrawal_enabled) {
        throw new Error('BSK withdrawals are currently disabled');
      }
      if (amountNum < parseFloat(settings.min_withdrawal_amount)) {
        throw new Error(`Minimum withdrawal is ${settings.min_withdrawal_amount} BSK`);
      }
      if (amountNum > parseFloat(settings.max_withdrawal_amount)) {
        throw new Error(`Maximum withdrawal is ${settings.max_withdrawal_amount} BSK`);
      }
    }

    // Check user's withdrawable BSK balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balance) throw new Error('Balance not found');
    if (balance.withdrawable_balance < amountNum) {
      throw new Error('Insufficient withdrawable BSK balance');
    }

    // Validate type-specific fields
    if (withdrawal_type === 'bank') {
      if (!bank_name || !account_number || !ifsc_code || !account_holder_name) {
        throw new Error('Missing bank details');
      }
    } else if (withdrawal_type === 'crypto') {
      if (!crypto_symbol || !crypto_address || !crypto_network) {
        throw new Error('Missing crypto details');
      }
    } else {
      throw new Error('Invalid withdrawal type');
    }

    // Deduct from withdrawable balance (lock it)
    const { error: deductError } = await supabase
      .from('user_bsk_balances')
      .update({ 
        withdrawable_balance: balance.withdrawable_balance - amountNum 
      })
      .eq('user_id', user.id);

    if (deductError) throw new Error('Failed to lock balance: ' + deductError.message);

    // Create withdrawal request
    const requestData: any = {
      user_id: user.id,
      amount_bsk: amountNum,
      withdrawal_type,
      status: 'pending'
    };

    if (withdrawal_type === 'bank') {
      requestData.bank_name = bank_name;
      requestData.account_number = account_number;
      requestData.ifsc_code = ifsc_code;
      requestData.account_holder_name = account_holder_name;
    } else {
      requestData.crypto_symbol = crypto_symbol;
      requestData.crypto_address = crypto_address;
      requestData.crypto_network = crypto_network;
    }

    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('bsk_withdrawal_requests')
      .insert(requestData)
      .select()
      .single();

    if (withdrawalError) {
      // Rollback balance
      await supabase
        .from('user_bsk_balances')
        .update({ 
          withdrawable_balance: balance.withdrawable_balance 
        })
        .eq('user_id', user.id);
      throw withdrawalError;
    }

    console.log(`[process-bsk-withdrawal] Created BSK withdrawal ${withdrawal.id} for user ${user.id}: ${amountNum} BSK`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawal_id: withdrawal.id,
        status: 'pending',
        amount_bsk: amountNum,
        withdrawal_type,
        message: 'BSK withdrawal request submitted. Admin will process within 1-3 business days.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-bsk-withdrawal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
