import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    const { requestId, rejectReason } = await req.json();

    if (!rejectReason || rejectReason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    // Fetch request
    const { data: request, error: fetchError } = await supabaseClient
      .from('crypto_to_inr_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    if (request.status !== 'pending' && request.status !== 'verifying') {
      throw new Error('Request already processed');
    }

    // Update request status
    await supabaseClient
      .from('crypto_to_inr_requests')
      .update({
        status: 'rejected',
        admin_notes: rejectReason,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      })
      .eq('id', requestId);

    // Create audit log
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'crypto_inr_deposit_rejected',
      resource_type: 'crypto_to_inr_requests',
      resource_id: requestId,
      new_values: { status: 'rejected', reason: rejectReason }
    });

    console.log(`Rejected crypto-INR deposit ${requestId}, reason: ${rejectReason}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
