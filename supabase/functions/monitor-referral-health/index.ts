import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[monitor-referral-health] Starting referral health check');

    // Find users with no locked sponsor (recent signups only)
    const { data: unlockedUsers, error: unlockedError } = await supabase
      .from('referral_links_new')
      .select(`
        user_id,
        sponsor_id,
        locked_at,
        created_at,
        profiles!inner(email, username)
      `)
      .is('locked_at', null)
      .not('sponsor_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (unlockedError) {
      throw unlockedError;
    }

    // Find users with no referral tree despite having locked sponsor
    const { data: noTreeUsers, error: treeError } = await supabase
      .rpc('find_users_missing_referral_tree');

    const issues = {
      unlocked_referrals: unlockedUsers?.length || 0,
      unlocked_users: unlockedUsers || [],
      missing_trees: noTreeUsers?.length || 0,
      missing_tree_users: noTreeUsers || [],
      timestamp: new Date().toISOString()
    };

    console.log('[monitor-referral-health] Health check results:', {
      unlocked_count: issues.unlocked_referrals,
      missing_tree_count: issues.missing_trees
    });

    return new Response(
      JSON.stringify({
        success: true,
        issues,
        healthy: issues.unlocked_referrals === 0 && issues.missing_trees === 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[monitor-referral-health] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
