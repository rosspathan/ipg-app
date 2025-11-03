import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LockRequest {
  user_id: string;
  sponsor_code_or_id: string;
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

    const { user_id, sponsor_code_or_id } = await req.json() as LockRequest;

    console.log(`[admin-lock-referral] Locking user: ${user_id} with sponsor: ${sponsor_code_or_id}`);

    // Resolve sponsor_id from code or UUID
    let sponsor_id: string | null = null;
    let sponsor_code: string | null = null;
    
    // Check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(sponsor_code_or_id)) {
      sponsor_id = sponsor_code_or_id;
      
      // Get the sponsor's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', sponsor_id)
        .maybeSingle();
      
      sponsor_code = profile?.referral_code || sponsor_id;
    } else {
      // It's a short code, look it up
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .eq('referral_code', sponsor_code_or_id.toUpperCase())
        .maybeSingle();
      
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Sponsor not found with code: ' + sponsor_code_or_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      sponsor_id = profile.user_id;
      sponsor_code = profile.referral_code;
    }

    if (!sponsor_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sponsor code or ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prevent self-referral
    if (user_id === sponsor_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot self-refer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user already exists in referral_links_new
    const { data: existingLink } = await supabase
      .from('referral_links_new')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingLink) {
      // Update existing link
      const { error: updateError } = await supabase
        .from('referral_links_new')
        .update({
          sponsor_id,
          sponsor_code_used: sponsor_code,
          locked_at: new Date().toISOString(),
          capture_stage: 'after_email_verify'
        })
        .eq('user_id', user_id);

      if (updateError) throw updateError;
    } else {
      // Create new link
      const { error: insertError } = await supabase
        .from('referral_links_new')
        .insert({
          user_id,
          sponsor_id,
          sponsor_code_used: sponsor_code,
          locked_at: new Date().toISOString(),
          capture_stage: 'after_email_verify',
          first_touch_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    console.log(`[admin-lock-referral] ✓ Locked user ${user_id} to sponsor ${sponsor_id}`);

    // Build referral tree for this user
    console.log(`[admin-lock-referral] Building referral tree for user ${user_id}...`);
    const { error: treeError } = await supabase.functions.invoke('build-referral-tree', {
      body: { user_id, include_unlocked: false }
    });

    if (treeError) {
      console.error('[admin-lock-referral] Tree build error:', treeError);
      // Don't fail the whole operation, just warn
      return new Response(
        JSON.stringify({
          success: true,
          user_id,
          sponsor_id,
          sponsor_code,
          warning: 'User locked but tree build failed: ' + treeError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[admin-lock-referral] ✓ Tree built successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        sponsor_id,
        sponsor_code,
        message: 'User locked and tree built successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[admin-lock-referral] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
