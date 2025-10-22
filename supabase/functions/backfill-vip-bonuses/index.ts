import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting VIP bonus backfill process...');

    // Get VIP badge bonus amount from badge_thresholds
    const { data: vipThreshold } = await supabaseClient
      .from('badge_thresholds')
      .select('bonus_bsk_holding, badge_name')
      .ilike('badge_name', '%VIP%')
      .maybeSingle();

    if (!vipThreshold || !vipThreshold.bonus_bsk_holding) {
      return new Response(
        JSON.stringify({ 
          error: 'No VIP bonus configured in badge_thresholds',
          vipThreshold
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bonusAmount = Number(vipThreshold.bonus_bsk_holding);
    console.log(`VIP bonus amount: ${bonusAmount} BSK`);

    // Find all VIP users
    const { data: vipUsers, error: vipUsersError } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id, current_badge, purchased_at')
      .ilike('current_badge', '%VIP%');

    if (vipUsersError) {
      throw new Error(`Failed to fetch VIP users: ${vipUsersError.message}`);
    }

    if (!vipUsers || vipUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No VIP users found',
          users_processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${vipUsers.length} VIP users`);

    const results = {
      total_users: vipUsers.length,
      already_credited: 0,
      newly_credited: 0,
      errors: [] as any[]
    };

    // Process each VIP user
    for (const vipUser of vipUsers) {
      try {
        // Check if bonus was already credited
        const { data: existingBonus } = await supabaseClient
          .from('bonus_ledger')
          .select('id')
          .eq('user_id', vipUser.user_id)
          .eq('type', 'badge_bonus')
          .contains('meta_json', { source: 'badge_purchase', bonus_type: 'holding_balance' })
          .maybeSingle();

        if (existingBonus) {
          console.log(`User ${vipUser.user_id} already has bonus credited`);
          results.already_credited++;
          continue;
        }

        // Get current balance
        const { data: currentBalance } = await supabaseClient
          .from('user_bsk_balances')
          .select('holding_balance, total_earned_holding')
          .eq('user_id', vipUser.user_id)
          .single();

        if (!currentBalance) {
          results.errors.push({
            user_id: vipUser.user_id,
            error: 'No balance record found'
          });
          continue;
        }

        // Credit bonus to holding balance
        const { error: bonusUpdateError } = await supabaseClient
          .from('user_bsk_balances')
          .update({
            holding_balance: Number(currentBalance.holding_balance) + bonusAmount,
            total_earned_holding: Number(currentBalance.total_earned_holding) + bonusAmount,
          })
          .eq('user_id', vipUser.user_id);

        if (bonusUpdateError) {
          results.errors.push({
            user_id: vipUser.user_id,
            error: `Failed to update balance: ${bonusUpdateError.message}`
          });
          continue;
        }

        // Create ledger entry
        const { error: ledgerError } = await supabaseClient
          .from('bonus_ledger')
          .insert({
            user_id: vipUser.user_id,
            type: 'badge_bonus',
            amount_bsk: bonusAmount,
            meta_json: {
              badge_name: vipUser.current_badge,
              bonus_type: 'holding_balance',
              source: 'badge_purchase',
              backfilled: true,
              backfill_date: new Date().toISOString()
            },
          });

        if (ledgerError) {
          results.errors.push({
            user_id: vipUser.user_id,
            error: `Failed to create ledger entry: ${ledgerError.message}`
          });
          // Note: Balance was updated but ledger entry failed
          continue;
        }

        console.log(`✅ Credited ${bonusAmount} BSK to user ${vipUser.user_id}`);
        results.newly_credited++;

      } catch (userError) {
        results.errors.push({
          user_id: vipUser.user_id,
          error: userError.message || 'Unknown error'
        });
      }
    }

    console.log('Backfill completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        bonus_amount: bonusAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
