import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCommissionRequest {
  payer_id: string; // User who bought the badge
  badge_name: string;
  delta_amount: number; // Amount paid for THIS purchase (full price or upgrade delta)
  is_upgrade: boolean;
  previous_badge?: string;
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

    const { payer_id, badge_name, delta_amount, is_upgrade, previous_badge } = await req.json() as BadgeCommissionRequest;

    console.log(`Processing badge sale commission for user ${payer_id}: ${badge_name} (delta: ${delta_amount} BSK)`);

    // Calculate 10% commission on delta (not full price)
    const commissionAmount = delta_amount * 0.10;

    console.log(`Commission amount: ${commissionAmount} BSK (10% of ${delta_amount})`);

    // Get direct sponsor (Level 1 only) from referral_tree
    const { data: sponsor, error: sponsorError } = await supabase
      .from('referral_tree')
      .select('ancestor_id')
      .eq('user_id', payer_id)
      .eq('level', 1)
      .maybeSingle();

    if (sponsorError) {
      throw new Error(`Failed to fetch sponsor: ${sponsorError.message}`);
    }

    if (!sponsor) {
      console.log('No direct sponsor found for user - no commission to pay');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No sponsor found',
          commission_paid: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sponsorId = sponsor.ancestor_id;

    // Get sponsor's current badge
    const { data: sponsorBadge } = await supabase
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsorId)
      .maybeSingle();

    const currentBadge = sponsorBadge?.current_badge || 'NONE';

    // Credit sponsor's withdrawable balance
    await supabase
      .from('user_bsk_balances')
      .insert({
        user_id: sponsorId,
        withdrawable_balance: commissionAmount,
        total_earned_withdrawable: commissionAmount
      })
      .select()
      .single()
      .then(async ({ error: insertError }) => {
        if (insertError) {
          // Update existing balance
          const { data: existingBalance } = await supabase
            .from('user_bsk_balances')
            .select('withdrawable_balance, total_earned_withdrawable')
            .eq('user_id', sponsorId)
            .single();

          if (existingBalance) {
            await supabase
              .from('user_bsk_balances')
              .update({
                withdrawable_balance: Number(existingBalance.withdrawable_balance) + commissionAmount,
                total_earned_withdrawable: Number(existingBalance.total_earned_withdrawable) + commissionAmount
              })
              .eq('user_id', sponsorId);
          }
        }
      });

    // Insert purchase record into badge_purchases table
    const { data: purchase, error: purchaseError } = await supabase
      .from('badge_purchases')
      .insert({
        user_id: payer_id,
        badge_name,
        bsk_amount: delta_amount,
        previous_badge,
        delta_amount,
        is_upgrade
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error recording badge purchase:', purchaseError);
    }

    const eventId = purchase?.id || crypto.randomUUID();

    // Insert into referral_commissions table
    const { error: commissionError } = await supabase
      .from('referral_commissions')
      .insert({
        earner_id: sponsorId,
        payer_id,
        level: 1,
        event_type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
        event_id: eventId,
        bsk_amount: commissionAmount,
        destination: 'withdrawable',
        status: 'settled',
        earner_badge_at_event: currentBadge
      });

    if (commissionError) {
      console.error('Error inserting commission record:', commissionError);
    }

    // Insert into bonus_ledger
    await supabase.from('bonus_ledger').insert({
      user_id: sponsorId,
      type: is_upgrade ? 'referral_badge_upgrade' : 'referral_badge_purchase',
      amount_bsk: commissionAmount,
      meta_json: {
        payer_id,
        badge_name,
        delta_amount,
        commission_percent: 10,
        is_upgrade
      }
    });

    console.log(`Successfully paid ${commissionAmount} BSK commission to sponsor ${sponsorId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sponsor_id: sponsorId,
        commission_paid: commissionAmount,
        badge_name,
        is_upgrade,
        event_id: eventId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error processing badge sale commission:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
