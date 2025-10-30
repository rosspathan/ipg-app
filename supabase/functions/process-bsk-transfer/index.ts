import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  recipient_id: string;
  amount: number;
}

Deno.serve(async (req) => {
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

    const { recipient_id, amount }: TransferRequest = await req.json();

    console.log('[BSK Transfer] Processing:', { sender_id: user.id, recipient_id, amount });

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

    // Update metadata with user display info and wallet types
    const senderDisplayName = senderProfile?.display_name || senderProfile?.full_name || senderProfile?.username || senderProfile?.email || 'Unknown';
    const recipientDisplayName = recipientProfile?.display_name || recipientProfile?.full_name || recipientProfile?.username || recipientProfile?.email || 'Unknown';

    // Update the transaction metadata with complete details
    await supabaseClient
      .from('unified_bsk_transactions')
      .update({
        metadata: {
          transaction_ref: result.transaction_ref,
          sender_id: user.id,
          sender_display_name: senderDisplayName,
          sender_username: senderProfile?.username,
          sender_email: senderProfile?.email,
          recipient_id: recipient_id,
          recipient_display_name: recipientDisplayName,
          recipient_username: recipientProfile?.username,
          recipient_email: recipientProfile?.email,
          from_wallet_type: 'withdrawable',
          to_wallet_type: 'withdrawable',
        }
      })
      .eq('reference_id', result.transaction_ref)
      .in('transaction_type', ['transfer_in', 'transfer_out']);

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
