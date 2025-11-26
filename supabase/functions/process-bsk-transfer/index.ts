import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  recipient_id: string;
  amount: number;
  memo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with user auth for user-specific operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Create admin client with service role for system settings (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if BSK transfers are enabled using admin client to bypass RLS
    const { data: transferSetting, error: settingError } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'bsk_transfers_enabled')
      .single();

    console.log('[BSK Transfer] Transfer setting check:', { 
      value: transferSetting?.value, 
      error: settingError,
      enabled: transferSetting?.value === 'true' 
    });

    if (transferSetting?.value !== 'true') {
      console.log('[BSK Transfer] Transfers are currently disabled');
      return new Response(
        JSON.stringify({ 
          error: 'BSK transfers are currently disabled. Please check back later or visit the one-time offers page.',
          code: 'TRANSFERS_DISABLED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recipient_id, amount, memo }: TransferRequest = await req.json();

    console.log('[BSK Transfer] Processing:', { sender_id: user.id, recipient_id, amount, memo });

    // Validation
    if (!recipient_id || !amount || amount <= 0) {
      throw new Error('Invalid transfer parameters');
    }

    if (user.id === recipient_id) {
      throw new Error('Cannot transfer to yourself');
    }

    // Fetch sender and recipient display info
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('display_name, username, email, full_name')
      .eq('user_id', user.id)
      .single();

    const { data: recipientProfile } = await supabaseClient
      .from('profiles')
      .select('display_name, username, email, full_name')
      .eq('user_id', recipient_id)
      .single();

    console.log('[BSK Transfer] User profiles fetched');

    // Use atomic RPC function for transfer
    const { data: result, error: transferError } = await supabaseClient.rpc(
      'execute_bsk_transfer',
      {
        p_sender_id: user.id,
        p_recipient_id: recipient_id,
        p_amount: amount,
      }
    );

    if (transferError) {
      console.error('[BSK Transfer] Transfer failed:', transferError);
      throw new Error(transferError.message || 'Transfer failed');
    }

    if (!result?.success) {
      throw new Error(result?.error || 'Transfer failed');
    }

    console.log('[BSK Transfer] Success:', result.transaction_ref);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_ref: result.transaction_ref,
        sender_balance_after: result.sender_balance_after,
        recipient_balance_after: result.recipient_balance_after,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BSK Transfer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
