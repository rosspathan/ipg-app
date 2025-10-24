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

    const { type, requestId } = await req.json();

    // Fetch admin users with notification enabled
    const { data: adminRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminIds = adminRoles.map(r => r.user_id);

    // Fetch notification preferences
    const { data: preferences } = await supabaseClient
      .from('admin_notification_preferences')
      .select('*')
      .in('user_id', adminIds)
      .eq('notify_crypto_inr_deposit', true)
      .eq('in_app_enabled', true);

    // Fetch request details
    const { data: request } = await supabaseClient
      .from('crypto_to_inr_requests')
      .select(`
        *,
        profiles:user_id(username, email),
        assets:crypto_asset_id(symbol, name)
      `)
      .eq('id', requestId)
      .single();

    if (!request) {
      throw new Error('Request not found');
    }

    let notifiedCount = 0;

    // If no preferences set, notify all admins
    const eligibleAdmins = preferences && preferences.length > 0
      ? preferences.filter(p => request.inr_equivalent >= (p.min_amount_threshold || 0))
      : adminIds.map(id => ({ user_id: id }));

    // Create in-app notifications for eligible admins
    for (const admin of eligibleAdmins) {
      await supabaseClient.from('notifications').insert({
        user_id: admin.user_id,
        type: 'admin_approval_required',
        title: 'New Crypto Deposit for Review',
        message: `${request.profiles?.username || 'User'} deposited ${request.crypto_amount} ${request.assets?.symbol} (₹${Math.round(request.inr_equivalent).toLocaleString()})`,
        metadata: { 
          request_id: requestId,
          amount: request.inr_equivalent,
          crypto_amount: request.crypto_amount,
          symbol: request.assets?.symbol
        }
      });
      notifiedCount++;
    }

    console.log(`Notified ${notifiedCount} admins about crypto-INR deposit ${requestId}`);

    return new Response(JSON.stringify({ success: true, notified: notifiedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
