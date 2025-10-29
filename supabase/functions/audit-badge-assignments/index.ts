import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 [Badge Audit] Starting integrity check...');

    const issues = [];

    // ==========================================
    // CHECK 1: Users with badges in user_badge_status but no holdings
    // ==========================================
    const { data: statusBadges, error: statusError } = await supabase
      .from('user_badge_status')
      .select('user_id, current_badge')
      .not('current_badge', 'is', null);

    if (statusError) {
      console.error('❌ Error fetching user_badge_status:', statusError);
    }

    if (statusBadges) {
      for (const status of statusBadges) {
        const { data: holding } = await supabase
          .from('user_badge_holdings')
          .select('current_badge')
          .eq('user_id', status.user_id)
          .maybeSingle();

        if (!holding) {
          issues.push({
            type: 'QUALIFIED_NOT_PURCHASED',
            user_id: status.user_id,
            badge: status.current_badge,
            message: `User has qualified badge '${status.current_badge}' but no purchase record`
          });
        }
      }
    }

    // ==========================================
    // CHECK 2: Badge holdings without valid badge_thresholds
    // ==========================================
    const { data: holdings, error: holdingsError } = await supabase
      .from('user_badge_holdings')
      .select('user_id, current_badge');

    if (holdingsError) {
      console.error('❌ Error fetching holdings:', holdingsError);
    }

    if (holdings) {
      for (const holding of holdings) {
        const { data: threshold } = await supabase
          .from('badge_thresholds')
          .select('badge_name, is_active')
          .eq('badge_name', holding.current_badge)
          .maybeSingle();

        if (!threshold) {
          issues.push({
            type: 'INVALID_BADGE',
            user_id: holding.user_id,
            badge: holding.current_badge,
            message: `User has badge '${holding.current_badge}' which doesn't exist in badge_thresholds`
          });
        } else if (!threshold.is_active) {
          issues.push({
            type: 'INACTIVE_BADGE',
            user_id: holding.user_id,
            badge: holding.current_badge,
            message: `User has inactive badge '${holding.current_badge}'`
          });
        }
      }
    }

    // ==========================================
    // CHECK 3: Badge holdings without purchase records
    // ==========================================
    if (holdings) {
      for (const holding of holdings) {
        const { data: purchase } = await supabase
          .from('badge_purchases')
          .select('id')
          .eq('user_id', holding.user_id)
          .eq('badge_name', holding.current_badge)
          .maybeSingle();

        if (!purchase) {
          issues.push({
            type: 'NO_PURCHASE_RECORD',
            user_id: holding.user_id,
            badge: holding.current_badge,
            message: `User has badge '${holding.current_badge}' but no purchase record in badge_purchases`
          });
        }
      }
    }

    console.log(`✅ [Badge Audit] Completed. Found ${issues.length} issues.`);

    if (issues.length > 0) {
      console.warn('⚠️ [Badge Audit] Issues found:');
      issues.forEach((issue, index) => {
        console.warn(`  ${index + 1}. [${issue.type}] User ${issue.user_id}: ${issue.message}`);
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        issues_found: issues.length,
        issues,
        timestamp: new Date().toISOString()
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Audit error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Audit failed',
        details: error.message
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
