import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  recipient_user_id: string;
  amount: number;
  balance_type: 'withdrawable' | 'holding';
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Authenticate admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: TransferRequest = await req.json();
    const { recipient_user_id, amount, balance_type, reason } = body;

    // Validation
    if (!recipient_user_id || amount === undefined || amount === null || !balance_type || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount === 0) {
      return new Response(
        JSON.stringify({ error: 'Amount cannot be zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isDebit = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Check recipient exists
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', recipient_user_id)
      .single();

    if (recipientError || !recipient) {
      return new Response(
        JSON.stringify({ error: 'Recipient user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-send-bsk] Admin ${user.id} ${isDebit ? 'debiting' : 'crediting'} ${absoluteAmount} BSK (${balance_type}) ${isDebit ? 'from' : 'to'} user ${recipient_user_id}`);

    // For debits, verify user has sufficient balance
    if (isDebit) {
      const { data: balanceData } = await supabaseClient
        .rpc('get_user_bsk_balance', { target_user_id: recipient_user_id })
        .single();
      
      const currentBalance = balance_type === 'withdrawable' 
        ? balanceData?.withdrawable_balance || 0
        : balanceData?.holding_balance || 0;
      
      if (currentBalance < absoluteAmount) {
        return new Response(
          JSON.stringify({ error: `Insufficient ${balance_type} balance. Current: ${currentBalance} BSK` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate idempotency key
    const idempotencyKey = `admin_${isDebit ? 'debit' : 'credit'}_${user.id}_${recipient_user_id}_${Date.now()}_${Math.random().toString(36)}`;

    console.log(`[admin-send-bsk] Idempotency key: ${idempotencyKey}`);

    // ATOMIC TRANSACTION: Credit/Debit BSK using record_bsk_transaction()
    try {
      const { data: creditResult, error: creditError } = await supabaseClient.rpc(
        'record_bsk_transaction',
        {
          p_user_id: recipient_user_id,
          p_idempotency_key: idempotencyKey,
          p_tx_type: isDebit ? 'debit' : 'credit',
          p_tx_subtype: isDebit ? 'admin_debit' : 'admin_credit',
          p_balance_type: balance_type,
          p_amount_bsk: absoluteAmount,
          p_notes: reason,
          p_meta_json: {
            admin_user_id: user.id,
            reason: reason,
            recipient_display_name: recipient.display_name,
            operation: isDebit ? 'debit' : 'credit',
            timestamp: new Date().toISOString(),
          },
        }
      );

      if (creditError) {
        console.error('[admin-send-bsk] Transaction error:', creditError);
        throw new Error(creditError.message || `Failed to ${isDebit ? 'debit' : 'credit'} BSK`);
      }

      if (!creditResult) {
        throw new Error(`Failed to ${isDebit ? 'debit' : 'credit'} BSK`);
      }

      console.log(`[admin-send-bsk] ✅ Atomically ${isDebit ? 'debited' : 'credited'} ${absoluteAmount} BSK (tx: ${creditResult})`);

      // Get updated balance for the recipient
      const { data: balanceData } = await supabaseClient
        .rpc('get_user_bsk_balance', { target_user_id: recipient_user_id })
        .single();

      const newBalance = balance_type === 'withdrawable' 
        ? balanceData?.withdrawable_balance || 0
        : balanceData?.holding_balance || 0;

      // Create audit log
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: isDebit ? 'admin_bsk_debit' : 'admin_bsk_credit',
          resource_type: 'bsk_balance',
          resource_id: recipient_user_id,
          new_values: {
            recipient_user_id,
            amount: isDebit ? -absoluteAmount : absoluteAmount,
            balance_type,
            reason,
            transaction_id: creditResult,
            new_balance: newBalance,
          }
        });

      console.log(`[admin-send-bsk] ✅ Successfully ${isDebit ? 'debited' : 'credited'} ${absoluteAmount} BSK ${isDebit ? 'from' : 'to'} user ${recipient_user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: creditResult,
          recipient_user_id,
          amount: isDebit ? -absoluteAmount : absoluteAmount,
          balance_type,
          new_balance: newBalance,
          operation: isDebit ? 'debit' : 'credit',
          timestamp: new Date().toISOString(),
          idempotency_key: idempotencyKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      // Check if it's an idempotency error (already processed)
      if (error.message?.includes('duplicate key') || error.message?.includes('idempotency')) {
        return new Response(
          JSON.stringify({ error: 'This transaction has already been processed' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

  } catch (error: any) {
    console.error('[admin-send-bsk] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});