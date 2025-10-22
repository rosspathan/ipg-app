import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KYCCommissionRequest {
  user_id: string;
  kyc_reward_bsk: number;
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

    const { user_id, kyc_reward_bsk } = await req.json() as KYCCommissionRequest;

    console.log(`[KYC Commission] Processing commissions for KYC approval: user=${user_id}, reward=${kyc_reward_bsk} BSK`);

    // 1. Check if user has a referral tree
    const { data: treeEntries, error: treeError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', user_id)
      .order('level', { ascending: true });

    if (treeError) {
      console.error('[KYC Commission] Error fetching referral tree:', treeError);
      throw new Error(`Failed to fetch referral tree: ${treeError.message}`);
    }

    if (!treeEntries || treeEntries.length === 0) {
      console.log('[KYC Commission] No referral tree found - user has no sponsors');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No sponsors to distribute commissions',
          commissions_distributed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get team income level settings
    const { data: levels, error: levelsError } = await supabase
      .from('team_income_levels')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (levelsError || !levels || levels.length === 0) {
      console.log('[KYC Commission] No active income levels configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No income levels configured',
          commissions_distributed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[KYC Commission] Found ${treeEntries.length} ancestors, ${levels.length} income levels configured`);

    // 3. Distribute commissions level by level
    const commissions = [];
    let totalDistributed = 0;

    for (const treeEntry of treeEntries) {
      const levelConfig = levels.find(l => l.level === treeEntry.level);
      
      if (!levelConfig || levelConfig.bsk_reward <= 0) {
        continue;
      }

      const commissionAmount = Number(levelConfig.bsk_reward);
      const destination = levelConfig.balance_type; // 'holding' or 'withdrawable'

      try {
        // Credit to appropriate balance
        if (destination === 'holding') {
          const { error: balanceError } = await supabase
            .from('user_bsk_balances')
            .upsert({
              user_id: treeEntry.ancestor_id,
              holding_balance: supabase.rpc('increment', { x: commissionAmount }),
              total_earned_holding: supabase.rpc('increment', { x: commissionAmount })
            }, { onConflict: 'user_id' });

          if (balanceError) {
            console.error(`[KYC Commission] Failed to credit holding balance to ${treeEntry.ancestor_id}:`, balanceError);
            continue;
          }
        } else {
          const { error: balanceError } = await supabase
            .from('user_bsk_balances')
            .upsert({
              user_id: treeEntry.ancestor_id,
              withdrawable_balance: supabase.rpc('increment', { x: commissionAmount }),
              total_earned_withdrawable: supabase.rpc('increment', { x: commissionAmount })
            }, { onConflict: 'user_id' });

          if (balanceError) {
            console.error(`[KYC Commission] Failed to credit withdrawable balance to ${treeEntry.ancestor_id}:`, balanceError);
            continue;
          }
        }

        // Create referral ledger entry
        await supabase
          .from('referral_ledger')
          .insert({
            sponsor_id: treeEntry.ancestor_id,
            referee_id: user_id,
            level: treeEntry.level,
            commission_bsk: commissionAmount,
            earning_type: 'kyc_reward',
            base_amount: kyc_reward_bsk,
            commission_percent: (commissionAmount / kyc_reward_bsk) * 100,
            metadata: {
              reward_type: 'kyc_approval',
              destination: destination
            }
          });

        // Create bonus ledger entry
        await supabase
          .from('bonus_ledger')
          .insert({
            user_id: treeEntry.ancestor_id,
            type: 'referral_commission',
            amount_bsk: commissionAmount,
            meta_json: {
              referee_id: user_id,
              level: treeEntry.level,
              earning_type: 'kyc_reward',
              base_amount: kyc_reward_bsk,
              destination: destination
            }
          });

        commissions.push({
          sponsor_id: treeEntry.ancestor_id,
          level: treeEntry.level,
          commission_bsk: commissionAmount,
          destination: destination
        });

        totalDistributed += commissionAmount;

        console.log(`[KYC Commission] Level ${treeEntry.level}: ${commissionAmount} BSK (${destination}) → ${treeEntry.ancestor_id}`);

      } catch (error) {
        console.error(`[KYC Commission] Error processing level ${treeEntry.level}:`, error);
      }
    }

    console.log(`[KYC Commission] SUCCESS: Distributed ${totalDistributed} BSK across ${commissions.length} levels`);

    return new Response(
      JSON.stringify({
        success: true,
        commissions_distributed: totalDistributed,
        levels_processed: commissions.length,
        commissions: commissions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[KYC Commission] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
