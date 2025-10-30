import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  user_id: string;
  sponsor_code: string;
  dry_run?: boolean;
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

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, sponsor_code, dry_run = false } = await req.json() as FixRequest;

    console.log(`[fix-broken-referrals] Request:`, { user_id, sponsor_code, dry_run });

    // Lookup sponsor by code
    const { data: sponsor } = await supabase
      .from('profiles')
      .select('user_id, referral_code, username')
      .eq('referral_code', sponsor_code.toUpperCase())
      .maybeSingle();

    if (!sponsor) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sponsor code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for self-referral
    if (sponsor.user_id === user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current referral link
    const { data: currentLink } = await supabase
      .from('referral_links_new')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (currentLink?.locked_at && currentLink.sponsor_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User already has locked sponsor',
          current_sponsor: currentLink.sponsor_id 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          would_update: {
            user_id,
            sponsor_id: sponsor.user_id,
            sponsor_username: sponsor.username,
            sponsor_code: sponsor.referral_code
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update referral link
    const { error: updateError } = await supabase
      .from('referral_links_new')
      .upsert({
        user_id,
        sponsor_id: sponsor.user_id,
        sponsor_code_used: sponsor.referral_code,
        locked_at: new Date().toISOString(),
        lock_stage: 'manual_fix',
        first_touch_at: currentLink?.first_touch_at || new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      throw updateError;
    }

    console.log('[fix-broken-referrals] ✓ Updated referral link');

    // Build referral tree
    const treeResponse = await supabase.functions.invoke('build-referral-tree', {
      body: { user_id, include_unlocked: false }
    });

    if (treeResponse.error) {
      console.error('[fix-broken-referrals] Tree build error:', treeResponse.error);
    }

    // Process signup commissions
    const commissionResponse = await supabase.functions.invoke('process-signup-commissions', {
      body: { user_id }
    });

    if (commissionResponse.error) {
      console.error('[fix-broken-referrals] Commission error:', commissionResponse.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        sponsor_id: sponsor.user_id,
        sponsor_username: sponsor.username,
        tree_built: !treeResponse.error,
        commissions_processed: !commissionResponse.error,
        tree_result: treeResponse.data,
        commission_result: commissionResponse.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-broken-referrals] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
