import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  user_id: string;
  badge_name: string;
  previous_badge?: string;
  bsk_amount: number;
  is_upgrade: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, badge_name, previous_badge, bsk_amount, is_upgrade }: PurchaseRequest = await req.json();

    console.log('Badge purchase request:', { user_id, badge_name, previous_badge, bsk_amount, is_upgrade });

    // 1. Verify user has sufficient BSK balance
    const { data: balance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError) {
      console.error('Balance fetch error:', balanceError);
      throw new Error('Failed to fetch balance');
    }

    const totalBalance = Number(balance.withdrawable_balance) + Number(balance.holding_balance);
    
    if (totalBalance < bsk_amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient BSK balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Deduct BSK from user's balance (prioritize withdrawable first)
    let remainingDeduction = bsk_amount;
    let withdrawableDeduction = 0;
    let holdingDeduction = 0;

    if (Number(balance.withdrawable_balance) >= remainingDeduction) {
      withdrawableDeduction = remainingDeduction;
    } else {
      withdrawableDeduction = Number(balance.withdrawable_balance);
      holdingDeduction = remainingDeduction - withdrawableDeduction;
    }

    const { error: updateBalanceError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: Number(balance.withdrawable_balance) - withdrawableDeduction,
        holding_balance: Number(balance.holding_balance) - holdingDeduction,
      })
      .eq('user_id', user_id);

    if (updateBalanceError) {
      console.error('Balance update error:', updateBalanceError);
      throw new Error('Failed to update balance');
    }

    // 3. Create or update badge holding
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id,
        current_badge: badge_name,
        previous_badge,
        bsk_paid: bsk_amount,
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (badgeError) {
      console.error('Badge holding error:', badgeError);
      // Rollback balance
      await supabaseClient
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: Number(balance.withdrawable_balance),
          holding_balance: Number(balance.holding_balance),
        })
        .eq('user_id', user_id);
      throw new Error('Failed to update badge holding');
    }

    // 4. Trigger commission processor with proper eligibility checks
    try {
      const commissionResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/badge-commission-processor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            userId: user_id,
            toBadge: badge_name,
            fromBadge: previous_badge || 'NONE',
            paidAmountBSK: bsk_amount,
            paymentRef: `purchase_${user_id}_${Date.now()}`,
            paymentMethod: 'BSK',
          }),
        }
      );

      const commissionResult = await commissionResponse.json();
      
      if (commissionResult.success) {
        console.log('Commission processed:', {
          eligible: commissionResult.eligibilityMet,
          commission: commissionResult.commissionBSK,
          capped: commissionResult.capped
        });
      } else {
        console.warn('Commission processing failed:', commissionResult.error);
      }
    } catch (commissionError) {
      console.error('Commission processor error (non-critical):', commissionError);
      // Don't fail the purchase if commission fails
    }

    // 5. Create audit log
    await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id,
        type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
        amount_bsk: -bsk_amount,
        meta_json: {
          badge_name,
          previous_badge,
          is_upgrade,
        },
      });

    console.log('Badge purchase completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Badge purchase error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
