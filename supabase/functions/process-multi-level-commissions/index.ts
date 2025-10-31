import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultiLevelCommissionRequest {
  user_id: string;
  event_type: 'badge_purchase' | 'badge_upgrade';
  base_amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_id, event_type, base_amount }: MultiLevelCommissionRequest = await req.json();

    console.log('🎯 Processing multi-level commissions:', { user_id, event_type, base_amount });

    // Check if referral system is enabled
    const { data: settings } = await supabase
      .from('team_referral_settings')
      .select('enabled')
      .single();

    if (!settings?.enabled) {
      console.log('⚠️ Multi-level referral system is disabled');
      return new Response(
        JSON.stringify({ success: false, reason: 'system_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all ancestors from L2 to L50
    const { data: ancestors, error: ancestorsError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', user_id)
      .gte('level', 2)
      .lte('level', 50)
      .order('level', { ascending: true });

    if (ancestorsError) {
      throw ancestorsError;
    }

    if (!ancestors || ancestors.length === 0) {
      console.log('ℹ️ No multi-level sponsors found for user:', user_id);
      return new Response(
        JSON.stringify({ success: true, commissions_paid: 0, message: 'No multi-level sponsors' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${ancestors.length} multi-level sponsors (L2-L50)`);

    let totalCommissionsPaid = 0;
    const commissionRecords = [];

    // Calculate commission based on level tiers
    const getCommissionAmount = (level: number): number => {
      if (level >= 2 && level <= 10) return 0.5;
      if (level >= 11 && level <= 20) return 0.4;
      if (level >= 21 && level <= 30) return 0.3;
      if (level >= 31 && level <= 40) return 0.2;
      if (level >= 41 && level <= 50) return 0.1;
      return 0;
    };

    // Process each level
    for (const ancestor of ancestors) {
      const commissionAmount = getCommissionAmount(ancestor.level);
      
      if (commissionAmount === 0) continue;

      console.log(`💰 Processing L${ancestor.level} commission for ${ancestor.ancestor_id}: ${commissionAmount} BSK`);

      try {
        // Update sponsor's withdrawable balance
        const { data: currentBalance } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance, total_earned_withdrawable')
          .eq('user_id', ancestor.ancestor_id)
          .maybeSingle();

        await supabase
          .from('user_bsk_balances')
          .upsert({
            user_id: ancestor.ancestor_id,
            withdrawable_balance: Number(currentBalance?.withdrawable_balance || 0) + commissionAmount,
            total_earned_withdrawable: Number(currentBalance?.total_earned_withdrawable || 0) + commissionAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        // Create commission record
        const { data: commissionRecord } = await supabase
          .from('referral_commissions')
          .insert({
            earner_id: ancestor.ancestor_id,
            payer_id: user_id,
            level: ancestor.level,
            event_type: event_type,
            commission_type: 'multi_level',
            bsk_amount: commissionAmount,
            destination: 'withdrawable',
            status: 'settled',
            metadata: {
              base_amount: base_amount,
              tier: Math.ceil(ancestor.level / 10),
              commission_rate: commissionAmount
            }
          })
          .select()
          .single();

        // Create bonus ledger entry
        await supabase
          .from('bonus_ledger')
          .insert({
            user_id: ancestor.ancestor_id,
            type: 'multi_level_commission',
            amount_bsk: commissionAmount,
            asset: 'BSK',
            meta_json: {
              referral_user_id: user_id,
              level: ancestor.level,
              event_type: event_type,
              base_amount: base_amount
            },
            usd_value: 0
          });

        totalCommissionsPaid += commissionAmount;
        commissionRecords.push({
          level: ancestor.level,
          sponsor_id: ancestor.ancestor_id,
          amount: commissionAmount
        });

        console.log(`✅ L${ancestor.level} commission credited successfully`);
      } catch (error) {
        console.error(`❌ Failed to process L${ancestor.level} commission:`, error);
        // Continue with other levels even if one fails
      }
    }

    console.log(`🎉 Multi-level commission processing complete. Total paid: ${totalCommissionsPaid} BSK`);

    return new Response(
      JSON.stringify({
        success: true,
        commissions_paid: totalCommissionsPaid,
        levels_processed: commissionRecords.length,
        details: commissionRecords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in multi-level commission processing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
