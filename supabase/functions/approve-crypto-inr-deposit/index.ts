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

    const { requestId, adminNotes, adjustedAmount } = await req.json();

    // Fetch request
    const { data: request, error: fetchError } = await supabaseClient
      .from('crypto_to_inr_requests')
      .select('*, assets(symbol, name)')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    if (request.status !== 'pending' && request.status !== 'verifying') {
      throw new Error('Request already processed');
    }

    // Get INR asset
    const { data: inrAsset } = await supabaseClient
      .from('assets')
      .select('id')
      .eq('symbol', 'INR')
      .single();

    if (!inrAsset) throw new Error('INR asset not found');

    // Credit INR balance
    const creditAmount = adjustedAmount || request.net_inr_credit;

    // Get or create wallet balance
    const { data: existingBalance } = await supabaseClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('asset_id', inrAsset.id)
      .single();

    if (existingBalance) {
      await supabaseClient
        .from('wallet_balances')
        .update({
          available: parseFloat(existingBalance.available) + creditAmount,
          total: parseFloat(existingBalance.total) + creditAmount,
        })
        .eq('user_id', request.user_id)
        .eq('asset_id', inrAsset.id);
    } else {
      await supabaseClient
        .from('wallet_balances')
        .insert({
          user_id: request.user_id,
          asset_id: inrAsset.id,
          available: creditAmount,
          locked: 0,
          total: creditAmount,
        });
    }

    // Update request status
    await supabaseClient
      .from('crypto_to_inr_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
        net_inr_credit: creditAmount
      })
      .eq('id', requestId);

    // Create audit log
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'crypto_inr_deposit_approved',
      resource_type: 'crypto_to_inr_requests',
      resource_id: requestId,
      new_values: { status: 'approved', net_credit: creditAmount }
    });

    console.log(`Approved crypto-INR deposit ${requestId} for user ${request.user_id}, credited ₹${creditAmount}`);

    return new Response(JSON.stringify({ success: true, creditAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error approving deposit:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
