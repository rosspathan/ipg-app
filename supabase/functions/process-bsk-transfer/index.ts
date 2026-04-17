import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  recipient_id: string;
  amount: number;
  memo?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error(`[BSK Transfer][${requestId}] Auth failed:`, userError?.message);
      return jsonResponse({ success: false, error: 'Authentication required. Please log in again.', code: 'UNAUTHORIZED', request_id: requestId });
    }

    // KYC GATE — only fully approved users (3-pillar) may transfer BSK
    const { error: kycErr } = await supabaseAdmin.rpc('assert_kyc_approved', {
      p_user_id: user.id,
      p_action: 'BSK transfer',
    });
    if (kycErr) {
      console.warn(`[BSK Transfer][${requestId}] KYC blocked user ${user.id}:`, kycErr.message);
      return jsonResponse({
        success: false,
        error: 'KYC verification (documents, face, mobile) is required to send BSK. Please complete verification.',
        code: 'KYC_REQUIRED',
        request_id: requestId,
      }, 403);
    }

    // Check if BSK transfers are enabled
    const { data: transferSetting, error: settingError } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'bsk_transfers_enabled')
      .single();

    console.log(`[BSK Transfer][${requestId}] Transfer setting:`, { value: transferSetting?.value, error: settingError?.message });

    if (transferSetting?.value !== 'true') {
      return jsonResponse({ success: false, error: 'BSK transfers are currently disabled. Please check back later.', code: 'TRANSFERS_DISABLED', request_id: requestId });
    }

    let body: TransferRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body.', code: 'INVALID_BODY', request_id: requestId });
    }

    const { recipient_id, amount, memo } = body;

    console.log(`[BSK Transfer][${requestId}] Processing:`, { sender_id: user.id, recipient_id, amount, memo: memo?.slice(0, 20) });

    // Pre-flight: check recipient balance row integrity before attempting transfer
    const { data: recipientBalance, error: recipientBalError } = await supabaseAdmin
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', recipient_id)
      .maybeSingle();

    if (!recipientBalError && recipientBalance) {
      const rw = Number(recipientBalance.withdrawable_balance || 0);
      const rh = Number(recipientBalance.holding_balance || 0);
      if (rw < 0 || rh < 0) {
        console.error(`[BSK Transfer][${requestId}] ⚠️ Recipient balance row is corrupt:`, {
          recipient_id,
          withdrawable_balance: rw,
          holding_balance: rh,
        });
        return jsonResponse({
          success: false,
          error: 'Transfer cannot be completed because the recipient account has an invalid balance record. Please contact support.',
          code: 'RECIPIENT_BALANCE_CORRUPT',
          request_id: requestId,
          diagnostic: {
            recipient_withdrawable: rw,
            recipient_holding: rh,
          },
        });
      }
    }

    // Pre-flight: check sender balance
    const { data: senderBalance, error: senderBalError } = await supabaseAdmin
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!senderBalError && senderBalance) {
      const sw = Number(senderBalance.withdrawable_balance || 0);
      if (sw < amount) {
        console.warn(`[BSK Transfer][${requestId}] Insufficient balance pre-check:`, {
          sender_id: user.id,
          available: sw,
          requested: amount,
        });
        return jsonResponse({
          success: false,
          error: `Insufficient BSK balance. You have ${sw.toLocaleString()} BSK available but tried to send ${amount}.`,
          code: 'INSUFFICIENT_BALANCE',
          request_id: requestId,
        });
      }
    }


    // Validation
    if (!recipient_id) {
      return jsonResponse({ success: false, error: 'Recipient is required.', code: 'MISSING_RECIPIENT', request_id: requestId });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return jsonResponse({ success: false, error: 'Please enter a valid positive amount.', code: 'INVALID_AMOUNT', request_id: requestId });
    }

    if (amount < 0.01) {
      return jsonResponse({ success: false, error: 'Minimum transfer amount is 0.01 BSK.', code: 'AMOUNT_TOO_SMALL', request_id: requestId });
    }

    if (user.id === recipient_id) {
      return jsonResponse({ success: false, error: 'Cannot transfer BSK to yourself.', code: 'SELF_TRANSFER', request_id: requestId });
    }

    // Verify recipient exists
    const { data: recipientProfile, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username, email, full_name')
      .eq('user_id', recipient_id)
      .single();

    if (recipientError || !recipientProfile) {
      console.error(`[BSK Transfer][${requestId}] Recipient not found:`, recipient_id);
      return jsonResponse({ success: false, error: 'Recipient not found. Please verify and try again.', code: 'RECIPIENT_NOT_FOUND', request_id: requestId });
    }

    // Execute atomic transfer via RPC
    const { data: result, error: transferError } = await supabaseClient.rpc(
      'execute_bsk_transfer',
      {
        p_sender_id: user.id,
        p_recipient_id: recipient_id,
        p_amount: amount,
      }
    );

    if (transferError) {
      console.error(`[BSK Transfer][${requestId}] RPC error:`, {
        code: transferError.code,
        message: transferError.message,
        details: transferError.details,
        hint: transferError.hint,
        sender: user.id,
        recipient: recipient_id,
        amount,
      });

      // Map DB errors to user-friendly messages
      const msg = transferError.message || '';
      if (msg.includes('Insufficient balance')) {
        return jsonResponse({ success: false, error: 'Insufficient BSK balance for this transfer.', code: 'INSUFFICIENT_BALANCE', request_id: requestId, diagnostic: { sender: user.id, recipient: recipient_id, amount } });
      }
      if (msg.includes('check_non_negative_balances')) {
        return jsonResponse({ success: false, error: 'Transfer cannot be completed because the recipient account has a corrupted balance record. Please contact support.', code: 'RECIPIENT_BALANCE_CORRUPT', request_id: requestId, diagnostic: { sender: user.id, recipient: recipient_id, amount, db_error: msg } });
      }
      if (msg.includes('Invalid holding_balance') || msg.includes('Invalid withdrawable_balance')) {
        return jsonResponse({ success: false, error: 'Transfer cannot be completed because the recipient account has an invalid balance record. Please contact support.', code: 'RECIPIENT_BALANCE_CORRUPT', request_id: requestId, diagnostic: { sender: user.id, recipient: recipient_id, amount, db_error: msg } });
      }
      if (msg.includes('Cannot transfer to yourself')) {
        return jsonResponse({ success: false, error: 'Cannot transfer BSK to yourself.', code: 'SELF_TRANSFER', request_id: requestId });
      }
      return jsonResponse({ success: false, error: 'Transfer failed. Please try again later.', code: 'TRANSFER_RPC_ERROR', request_id: requestId, diagnostic: { sender: user.id, recipient: recipient_id, amount, db_error: msg } });
    }

    if (!result?.success) {
      console.error(`[BSK Transfer][${requestId}] RPC returned failure:`, result);
      return jsonResponse({ success: false, error: result?.error || 'Transfer could not be completed.', code: 'TRANSFER_FAILED', request_id: requestId });
    }

    console.log(`[BSK Transfer][${requestId}] ✅ Success:`, result.transaction_ref);

    return jsonResponse({
      success: true,
      transaction_ref: result.transaction_ref,
      sender_balance_after: result.sender_balance_after,
      recipient_balance_after: result.recipient_balance_after,
      request_id: requestId,
    });

  } catch (error) {
    console.error(`[BSK Transfer][${requestId}] Unhandled error:`, error);
    return jsonResponse({ success: false, error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR', request_id: requestId });
  }
});
