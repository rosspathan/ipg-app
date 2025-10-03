import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgePurchaseRequest {
  user_id: string;
  badge_name: string;
  previous_badge?: string | null;
  bsk_amount: number;
  is_upgrade: boolean;
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

    const requestData: BadgePurchaseRequest = await req.json();
    const { user_id, badge_name, previous_badge, bsk_amount, is_upgrade } = requestData;

    console.log('Processing badge purchase:', requestData);

    // Get team referral settings to confirm 10% commission
    const { data: settings } = await supabase
      .from('team_referral_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const commissionPercent = settings?.direct_commission_percent || 10;
    const payoutDestination = settings?.payout_destination || 'WITHDRAWABLE';

    // Check user's BSK balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError || !balanceData) {
      throw new Error('User balance not found');
    }

    const totalBalance = Number(balanceData.withdrawable_balance) + Number(balanceData.holding_balance);
    if (totalBalance < bsk_amount) {
      throw new Error(`Insufficient balance. Required: ${bsk_amount}, Available: ${totalBalance}`);
    }

    // Deduct BSK from user balance (prioritize withdrawable)
    let withdrawableDeduction = Math.min(Number(balanceData.withdrawable_balance), bsk_amount);
    let holdingDeduction = bsk_amount - withdrawableDeduction;

    const { error: deductError } = await supabase
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: Number(balanceData.withdrawable_balance) - withdrawableDeduction,
        holding_balance: Number(balanceData.holding_balance) - holdingDeduction,
      })
      .eq('user_id', user_id);

    if (deductError) throw deductError;

    // Update or create badge holding record
    const { data: existingHolding } = await supabase
      .from('user_badge_holdings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingHolding) {
      await supabase
        .from('user_badge_holdings')
        .update({
          current_badge: badge_name,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);
    } else {
      await supabase
        .from('user_badge_holdings')
        .insert({
          user_id,
          current_badge: badge_name,
        });
    }

    // Get referrer
    const { data: referralData } = await supabase
      .from('referral_relationships')
      .select('referrer_id')
      .eq('referee_id', user_id)
      .single();

    let commissionPaid = 0;
    if (referralData?.referrer_id) {
      const referrerId = referralData.referrer_id;
      commissionPaid = bsk_amount * (commissionPercent / 100);

      // Credit referrer's balance
      const balanceColumn = payoutDestination === 'WITHDRAWABLE' ? 'withdrawable_balance' : 'holding_balance';
      const totalColumn = payoutDestination === 'WITHDRAWABLE' ? 'total_earned_withdrawable' : 'total_earned_holding';

      const { data: referrerBalance } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', referrerId)
        .single();

      if (referrerBalance) {
        await supabase
          .from('user_bsk_balances')
          .update({
            [balanceColumn]: Number(referrerBalance[balanceColumn]) + commissionPaid,
            [totalColumn]: Number(referrerBalance[totalColumn]) + commissionPaid,
          })
          .eq('user_id', referrerId);
      } else {
        await supabase
          .from('user_bsk_balances')
          .insert({
            user_id: referrerId,
            [balanceColumn]: commissionPaid,
            [totalColumn]: commissionPaid,
          });
      }

      // Log referral ledger entry
      await supabase.from('referral_ledger').insert({
        user_id: referrerId,
        source_user_id: user_id,
        ledger_type: 'direct_badge_bonus',
        trigger_type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
        inr_amount_snapshot: 0,
        bsk_rate_snapshot: 1,
        bsk_amount: commissionPaid,
        status: 'settled',
        tx_refs: { badge_name, bsk_paid: bsk_amount },
        notes: `${commissionPercent}% commission on ${badge_name} ${is_upgrade ? 'upgrade' : 'purchase'}`,
      });

      console.log(`Paid ${commissionPaid} BSK commission to referrer ${referrerId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        badge_name,
        bsk_spent: bsk_amount,
        commission_paid: commissionPaid,
        referrer_id: referralData?.referrer_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Badge purchase error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
