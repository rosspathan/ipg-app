import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  timestamp: string;
  checks: {
    missing_all_commissions: MissingCommission[];
    missing_multilevel_commissions: MissingCommission[];
    referral_tree_issues: TreeIssue[];
    badge_unlock_mismatches: UnlockMismatch[];
  };
  summary: {
    total_badge_purchases: number;
    purchases_without_any_commission: number;
    purchases_with_only_l1: number;
    affected_users: number;
    estimated_missing_bsk: number;
  };
}

interface MissingCommission {
  purchase_id?: string;
  user_id: string;
  badge_name: string;
  amount_bsk: number;
  purchased_at: string;
  missing_levels: string;
}

interface TreeIssue {
  user_id: string;
  issue: string;
}

interface UnlockMismatch {
  user_id: string;
  badge: string;
  expected_unlock_levels: number;
  actual_unlock_levels: number;
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

    console.log('🏥 Starting commission health check...');

    // Check 1: Badge purchases without ANY commission records
    const { data: purchasesNoCommissions, error: noCommError } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id, current_badge, price_bsk, purchased_at')
      .is('id', null)
      .order('purchased_at', { ascending: false })
      .limit(100);

    const missingAll: MissingCommission[] = [];
    if (purchasesNoCommissions) {
      for (const purchase of purchasesNoCommissions) {
        const { count } = await supabaseClient
          .from('referral_commissions')
          .select('*', { count: 'exact', head: true })
          .eq('payer_user_id', purchase.user_id)
          .gte('created_at', purchase.purchased_at);

        if (count === 0) {
          missingAll.push({
            user_id: purchase.user_id,
            badge_name: purchase.current_badge,
            amount_bsk: purchase.price_bsk,
            purchased_at: purchase.purchased_at,
            missing_levels: 'All (L1-L50)'
          });
        }
      }
    }

    // Check 2: Badge purchases with L1 but missing L2-50
    const { data: purchasesWithL1, error: l1Error } = await supabaseClient
      .from('referral_commissions')
      .select('payer_user_id, created_at')
      .eq('event_type', 'badge_purchase')
      .order('created_at', { ascending: false })
      .limit(100);

    const missingMultiLevel: MissingCommission[] = [];
    if (purchasesWithL1) {
      const uniquePurchases = new Map();
      purchasesWithL1.forEach(p => uniquePurchases.set(p.payer_user_id, p));

      for (const [userId, purchase] of uniquePurchases) {
        // Check if has L2+ commissions
        const { count: l1Count } = await supabaseClient
          .from('referral_commissions')
          .select('*', { count: 'exact', head: true })
          .eq('payer_user_id', userId)
          .eq('level', 1);

        const { count: multiLevelCount } = await supabaseClient
          .from('referral_commissions')
          .select('*', { count: 'exact', head: true })
          .eq('payer_user_id', userId)
          .gte('level', 2);

        if (l1Count && l1Count > 0 && (!multiLevelCount || multiLevelCount === 0)) {
          const { data: badge } = await supabaseClient
            .from('user_badge_holdings')
            .select('current_badge, price_bsk')
            .eq('user_id', userId)
            .single();

          if (badge) {
            missingMultiLevel.push({
              user_id: userId,
              badge_name: badge.current_badge,
              amount_bsk: badge.price_bsk,
              purchased_at: purchase.created_at,
              missing_levels: 'L2-L50'
            });
          }
        }
      }
    }

    // Check 3: Referral tree issues
    const treeIssues: TreeIssue[] = [];
    const { data: usersWithBadges } = await supabaseClient
      .from('user_badge_holdings')
      .select('user_id');

    if (usersWithBadges) {
      for (const user of usersWithBadges.slice(0, 50)) {
        const { count: ancestorCount } = await supabaseClient
          .from('referral_tree')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id);

        if (ancestorCount === 0) {
          treeIssues.push({
            user_id: user.user_id,
            issue: 'No referral tree entries'
          });
        }
      }
    }

    // Check 4: Badge unlock level mismatches
    const unlockMismatches: UnlockMismatch[] = [];
    const { data: badgeHoldings } = await supabaseClient
      .from('user_badge_holdings')
      .select(`
        user_id,
        current_badge
      `)
      .limit(50);

    if (badgeHoldings) {
      for (const holding of badgeHoldings) {
        const { data: thresholds } = await supabaseClient
          .from('badge_thresholds')
          .select('unlock_levels')
          .eq('badge_name', holding.current_badge)
          .single();

        if (thresholds) {
          // This would need actual unlock level tracking
          // Simplified for now
        }
      }
    }

    // Calculate summary
    const totalMissingUsers = new Set([
      ...missingAll.map(m => m.user_id),
      ...missingMultiLevel.map(m => m.user_id)
    ]).size;

    const estimatedMissingBSK = [...missingAll, ...missingMultiLevel]
      .reduce((sum, m) => sum + (m.amount_bsk * 0.3), 0); // Rough estimate

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      checks: {
        missing_all_commissions: missingAll,
        missing_multilevel_commissions: missingMultiLevel,
        referral_tree_issues: treeIssues,
        badge_unlock_mismatches: unlockMismatches
      },
      summary: {
        total_badge_purchases: (purchasesNoCommissions?.length || 0),
        purchases_without_any_commission: missingAll.length,
        purchases_with_only_l1: missingMultiLevel.length,
        affected_users: totalMissingUsers,
        estimated_missing_bsk: estimatedMissingBSK
      }
    };

    console.log('✅ Health check complete:', result.summary);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Health check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
