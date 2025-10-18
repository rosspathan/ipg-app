import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupCommissionRequest {
  user_id: string;
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

    const { user_id } = await req.json() as SignupCommissionRequest;

    console.log(`Processing signup commissions for user: ${user_id}`);

    // Get all ancestors from referral_tree (up to 50 levels)
    const { data: ancestors, error: treeError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', user_id)
      .order('level', { ascending: true });

    if (treeError) {
      throw new Error(`Failed to fetch referral tree: ${treeError.message}`);
    }

    if (!ancestors || ancestors.length === 0) {
      console.log('No ancestors found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No ancestors to pay', commissions_paid: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${ancestors.length} ancestors`);

    let totalPaid = 0;
    let recipientsCount = 0;
    const commissions: any[] = [];

    // Process each ancestor
    for (const ancestor of ancestors) {
      const { ancestor_id, level } = ancestor;

      // Get ancestor's current badge and unlock_levels
      const { data: badge, error: badgeError } = await supabase
        .from('user_badge_holdings')
        .select('current_badge, unlock_levels')
        .eq('user_id', ancestor_id)
        .maybeSingle();

      if (badgeError) {
        console.error(`Error fetching badge for ${ancestor_id}:`, badgeError);
        continue;
      }

      const unlockLevels = badge?.unlock_levels || 1;
      const currentBadge = badge?.current_badge || 'NONE';

      // Check if this level is unlocked for the ancestor
      if (level > unlockLevels) {
        console.log(`Level ${level} not unlocked for ${ancestor_id} (has ${unlockLevels})`);
        continue;
      }

      // Get reward amount from referral_level_rewards table
      const { data: reward, error: rewardError } = await supabase
        .from('referral_level_rewards')
        .select('bsk_amount, balance_type')
        .eq('level', level)
        .eq('is_active', true)
        .single();

      if (rewardError || !reward) {
        console.error(`No active reward found for level ${level}`);
        continue;
      }

      const { bsk_amount, balance_type } = reward;

      // Determine destination: L1 = holding, L2-50 = withdrawable
      const destination = balance_type;

      // Credit ancestor's BSK balance
      if (destination === 'holding') {
        const { error: balanceError } = await supabase
          .from('user_bsk_balances')
          .upsert({
            user_id: ancestor_id,
            holding_balance: bsk_amount,
            total_earned_holding: bsk_amount
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (balanceError) {
          // Try update instead
          await supabase.rpc('increment_bsk_balance', {
            p_user_id: ancestor_id,
            p_amount: bsk_amount,
            p_balance_type: 'holding'
          });
        }
      } else {
        const { error: balanceError } = await supabase
          .from('user_bsk_balances')
          .upsert({
            user_id: ancestor_id,
            withdrawable_balance: bsk_amount,
            total_earned_withdrawable: bsk_amount
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (balanceError) {
          // Try update instead
          await supabase.rpc('increment_bsk_balance', {
            p_user_id: ancestor_id,
            p_amount: bsk_amount,
            p_balance_type: 'withdrawable'
          });
        }
      }

      // Insert into referral_commissions table
      const commission = {
        earner_id: ancestor_id,
        payer_id: user_id,
        level,
        event_type: 'signup',
        event_id: user_id, // Using user_id as event_id for signup events
        bsk_amount,
        destination,
        status: 'settled',
        earner_badge_at_event: currentBadge
      };

      commissions.push(commission);
      totalPaid += Number(bsk_amount);
      recipientsCount++;

      console.log(`Paid ${bsk_amount} BSK to ${ancestor_id} at level ${level} (${destination})`);
    }

    // Batch insert commissions
    if (commissions.length > 0) {
      const { error: commissionError } = await supabase
        .from('referral_commissions')
        .insert(commissions);

      if (commissionError) {
        console.error('Error inserting commissions:', commissionError);
      }
    }

    // Also insert into bonus_ledger for each recipient
    const ledgerEntries = commissions.map(c => ({
      user_id: c.earner_id,
      type: 'referral_signup',
      amount_bsk: c.bsk_amount,
      meta_json: {
        referee_id: user_id,
        level: c.level,
        destination: c.destination
      }
    }));

    if (ledgerEntries.length > 0) {
      await supabase.from('bonus_ledger').insert(ledgerEntries);
    }

    console.log(`Successfully paid ${totalPaid} BSK to ${recipientsCount} recipients`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        total_paid: totalPaid,
        recipients_count: recipientsCount,
        commissions_processed: commissions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error processing signup commissions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
