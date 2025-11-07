import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExplainRequest {
  user_id: string;
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

    const { user_id }: ExplainRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ancestors L2-L50
    const { data: ancestors, error: ancestorsError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', user_id)
      .gte('level', 2)
      .lte('level', 50)
      .order('level', { ascending: true });

    if (ancestorsError) throw ancestorsError;

    const getCommissionAmount = (level: number): number => {
      if (level >= 2 && level <= 10) return 0.5;
      if (level >= 11 && level <= 20) return 0.4;
      if (level >= 21 && level <= 30) return 0.3;
      if (level >= 31 && level <= 40) return 0.2;
      if (level >= 41 && level <= 50) return 0.1;
      return 0;
    };

    const results: any[] = [];

    for (const ancestor of (ancestors || [])) {
      const commissionAmount = getCommissionAmount(ancestor.level);
      let sponsorTierName: string | null = null;
      let unlockedLevels = 1;
      let sourceUsed: 'holdings' | 'status' | 'assigned' | 'none' = 'none';
      const tablesChecked: string[] = [];
      let sponsorBadgeError: string | null = null;

      // 1) user_badge_holdings (direct fields: current_badge, unlock_levels)
      try {
        tablesChecked.push('user_badge_holdings');
        const { data: sponsorHoldings, error: holdingsError } = await supabase
          .from('user_badge_holdings')
          .select('current_badge, unlock_levels, purchased_at')
          .eq('user_id', ancestor.ancestor_id)
          .order('unlock_levels', { ascending: false })
          .order('purchased_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (holdingsError) {
          sponsorBadgeError = `holdings_error: ${holdingsError.message}`;
        }
        if (sponsorHoldings?.current_badge) {
          sponsorTierName = sponsorHoldings.current_badge;
          unlockedLevels = sponsorHoldings.unlock_levels || 1;
          sourceUsed = 'holdings';
        }
      } catch (e: any) {
        sponsorBadgeError = `holdings_exception: ${e?.message || e}`;
      }

      // 2) user_badge_status -> badge_card_config
      if (!sponsorTierName) {
        try {
          tablesChecked.push('user_badge_status');
          const { data: statusRow, error: statusError } = await supabase
            .from('user_badge_status')
            .select('current_badge')
            .eq('user_id', ancestor.ancestor_id)
            .maybeSingle();
          if (statusError) {
            sponsorBadgeError = [sponsorBadgeError, `status_error: ${statusError.message}`].filter(Boolean).join('; ');
          }
          if (statusRow?.current_badge) {
            const { data: cfgRow, error: cfgError } = await supabase
              .from('badge_card_config')
              .select('tier_name, unlocked_levels')
              .eq('tier_name', statusRow.current_badge)
              .maybeSingle();
            if (cfgError) {
              sponsorBadgeError = [sponsorBadgeError, `config_error: ${cfgError.message}`].filter(Boolean).join('; ');
            }
            if (cfgRow) {
              sponsorTierName = cfgRow.tier_name;
              unlockedLevels = cfgRow.unlocked_levels || 1;
              sourceUsed = 'status';
            }
          }
        } catch (e: any) {
          sponsorBadgeError = [sponsorBadgeError, `status_exception: ${e?.message || e}`].filter(Boolean).join('; ');
        }
      }

      // 3) badge_cards_new
      if (!sponsorTierName) {
        try {
          tablesChecked.push('badge_cards_new');
          const { data: assignedRow, error: assignedError } = await supabase
            .from('badge_cards_new')
            .select('badge_card_config!inner(tier_name, unlocked_levels)')
            .eq('user_id', ancestor.ancestor_id)
            .order('badge_card_config.unlocked_levels', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (assignedError) {
            sponsorBadgeError = [sponsorBadgeError, `assigned_error: ${assignedError.message}`].filter(Boolean).join('; ');
          }
          if (assignedRow?.badge_card_config) {
            sponsorTierName = assignedRow.badge_card_config.tier_name;
            unlockedLevels = assignedRow.badge_card_config.unlocked_levels || 1;
            sourceUsed = 'assigned';
          }
        } catch (e: any) {
          sponsorBadgeError = [sponsorBadgeError, `assigned_exception: ${e?.message || e}`].filter(Boolean).join('; ');
        }
      }

      let decision: 'pay' | 'skip';
      let reason: string | null = null;

      if (!sponsorTierName) {
        decision = 'skip';
        reason = 'no_badge';
      } else if (ancestor.level > unlockedLevels) {
        decision = 'skip';
        reason = 'level_locked';
      } else if (commissionAmount <= 0) {
        decision = 'skip';
        reason = 'no_amount_for_level';
      } else {
        decision = 'pay';
      }

      results.push({
        level: ancestor.level,
        sponsor_id: ancestor.ancestor_id,
        commission_amount: commissionAmount,
        decision,
        reason,
        badge: sponsorTierName,
        unlocked_up_to: unlockedLevels,
        source_used: sourceUsed,
        tables_checked: tablesChecked,
        error: sponsorBadgeError,
      });
    }

    const summary = {
      total_levels: results.length,
      pay_levels: results.filter(r => r.decision === 'pay').length,
      skip_levels: results.filter(r => r.decision === 'skip').length,
      total_amount: results.filter(r => r.decision === 'pay').reduce((sum, r) => sum + (r.commission_amount || 0), 0),
    };

    return new Response(
      JSON.stringify({ success: true, user_id, summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error in explain-ml-commission:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
