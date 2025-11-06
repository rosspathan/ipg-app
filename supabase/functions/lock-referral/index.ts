// Supabase Edge Function: lock-referral
// Locks a user's referral to a sponsor in a secure, RLS-bypassing context
// Validates the referral code/sponsor and ensures the caller is the authenticated user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: ensure the request is from a signed-in user
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = userData.user.id;

    // Parse input
    const body = await req.json().catch(() => ({}));
    const referralCodeRaw: string | undefined = body?.referral_code;
    const sponsorIdRaw: string | undefined = body?.sponsor_id;
    const captureStage: string | undefined = body?.capture_stage || 'after_signup';

    // Resolve sponsor
    let sponsorId: string | null = null;
    let sponsorCode: string | null = null;

    if (referralCodeRaw) {
      const referralCode = String(referralCodeRaw).toUpperCase().trim();
      const { data: sponsorProfile, error } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (error || !sponsorProfile) {
        return new Response(JSON.stringify({ error: 'Invalid referral code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      sponsorId = sponsorProfile.user_id;
      sponsorCode = sponsorProfile.referral_code;
    } else if (sponsorIdRaw) {
      const candidate = String(sponsorIdRaw);
      const { data: sponsorProfile, error } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .eq('user_id', candidate)
        .maybeSingle();
      if (error || !sponsorProfile) {
        return new Response(JSON.stringify({ error: 'Invalid sponsor id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      sponsorId = sponsorProfile.user_id;
      sponsorCode = sponsorProfile.referral_code;
    } else {
      return new Response(JSON.stringify({ error: 'Missing referral_code or sponsor_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prevent self-referral
    if (sponsorId === userId) {
      return new Response(JSON.stringify({ error: 'Self-referral not allowed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check existing link
    const { data: existingLink, error: readErr } = await supabase
      .from('referral_links_new')
      .select('id, sponsor_id, locked_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (readErr) {
      return new Response(JSON.stringify({ error: 'Failed to read referral link' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date().toISOString();

    if (existingLink?.locked_at) {
      return new Response(JSON.stringify({ success: true, status: 'already_locked', sponsor_id: existingLink.sponsor_id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!existingLink) {
      const { error: insertErr } = await supabase
        .from('referral_links_new')
        .insert({
          user_id: userId,
          sponsor_id: sponsorId,
          sponsor_code_used: sponsorCode,
          locked_at: now,
          capture_stage: captureStage,
          first_touch_at: now
        });
      if (insertErr) {
        return new Response(JSON.stringify({ error: 'Failed to create referral link', details: insertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, status: 'locked', sponsor_id: sponsorId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update and lock existing row
    const { error: updateErr } = await supabase
      .from('referral_links_new')
      .update({
        sponsor_id: sponsorId,
        sponsor_code_used: sponsorCode,
        locked_at: now,
        capture_stage: captureStage
      })
      .eq('user_id', userId)
      .is('locked_at', null);

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Failed to lock referral link', details: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, status: 'locked', sponsor_id: sponsorId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[lock-referral] Unhandled error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});