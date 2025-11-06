import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualLinkRequest {
  user_id: string;
  sponsor_code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as ManualLinkRequest;
    const { user_id, sponsor_code } = body;

    if (!user_id || !sponsor_code) {
      return new Response(
        JSON.stringify({ error: 'user_id and sponsor_code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ManualLink] Linking user:', user_id, 'to sponsor code:', sponsor_code);

    // Resolve sponsor_id from code
    const { data: sponsorProfile, error: sponsorError } = await supabase
      .from('profiles')
      .select('user_id, referral_code')
      .eq('referral_code', sponsor_code.toUpperCase())
      .maybeSingle();

    if (sponsorError || !sponsorProfile) {
      return new Response(
        JSON.stringify({ error: `Invalid sponsor code: ${sponsor_code}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sponsor_id = sponsorProfile.user_id;

    // Prevent self-referral
    if (user_id === sponsor_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a locked sponsor
    const { data: existingLink } = await supabase
      .from('referral_links_new')
      .select('sponsor_id, locked_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingLink?.locked_at) {
      return new Response(
        JSON.stringify({ 
          error: `User already has a locked sponsor: ${existingLink.sponsor_id}`,
          existing_sponsor: existingLink.sponsor_id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update referral link
    const { error: upsertError } = await supabase
      .from('referral_links_new')
      .upsert({
        user_id: user_id,
        sponsor_id: sponsor_id,
        sponsor_code_used: sponsor_code.toUpperCase(),
        locked_at: new Date().toISOString(),
        capture_stage: 'admin_manual',
        first_touch_at: existingLink ? undefined : new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('[ManualLink] Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: `Failed to link referral: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ManualLink] ✓ Successfully linked user to sponsor:', sponsor_id);

    // Trigger tree rebuild
    try {
      const { error: treeError } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: user_id }
      });

      if (treeError) {
        console.error('[ManualLink] Tree rebuild failed:', treeError);
      } else {
        console.log('[ManualLink] ✓ Tree rebuilt successfully');
      }
    } catch (treeErr) {
      console.error('[ManualLink] Tree rebuild exception:', treeErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user_id,
        sponsor_id: sponsor_id,
        sponsor_code: sponsor_code.toUpperCase(),
        message: 'User successfully linked to sponsor'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ManualLink] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
