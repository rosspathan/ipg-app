import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { asset_symbol, recipient_identifier, amount } = await req.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Transfer request: ${user.id} -> ${recipient_identifier}, ${amount} ${asset_symbol}`);

    const admin = createClient(supabaseUrl, serviceKey);

    // Find recipient by username, email, phone, or referral code
    const { data: recipientProfile, error: recipientError } = await admin
      .from('profiles')
      .select('user_id, username, email')
      .or(`username.eq.${recipient_identifier},email.eq.${recipient_identifier},phone.eq.${recipient_identifier},referral_code.eq.${recipient_identifier}`)
      .single();

    if (recipientError || !recipientProfile) {
      return new Response(
        JSON.stringify({ error: 'Recipient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (recipientProfile.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset details
    const { data: asset, error: assetError } = await admin
      .from('assets')
      .select('id, symbol, decimals')
      .eq('symbol', asset_symbol)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fee (0.1% or minimum 0.0001 in asset)
    const feePercent = 0.001;
    const minFee = 0.0001;
    const fee = Math.max(transferAmount * feePercent, minFee);
    const netAmount = transferAmount - fee;

    if (netAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount too small after fees' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute atomic transfer with FOR UPDATE row locking
    const { data: transferResult, error: transferError } = await admin.rpc(
      'execute_internal_crypto_transfer',
      {
        p_sender_id: user.id,
        p_recipient_id: recipientProfile.user_id,
        p_asset_id: asset.id,
        p_amount: transferAmount,
        p_fee: fee
      }
    );

    if (transferError || !(transferResult as any)?.success) {
      console.error('Transfer failed:', transferError || (transferResult as any)?.error);
      return new Response(
        JSON.stringify({ error: (transferResult as any)?.error || transferError?.message || 'Transfer failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    console.log(`Transfer completed: ${transactionId}, ${amount} ${asset_symbol} from ${user.id} to ${recipientProfile.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        amount: transferAmount,
        fee: fee,
        net_amount: netAmount,
        recipient: recipientProfile.username || recipientProfile.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transfer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
