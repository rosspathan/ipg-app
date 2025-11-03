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
    if (!recipient_user_id || !amount || !balance_type || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Admin ${user.id} sending ${amount} BSK (${balance_type}) to user ${recipient_user_id}`);

    // Get current BSK balance
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', recipient_user_id)
      .single();

    const oldBalance = balance_type === 'withdrawable' 
      ? (currentBalance?.withdrawable_balance || 0)
      : (currentBalance?.holding_balance || 0);

    // Credit BSK balance
    const balanceField = balance_type === 'withdrawable' ? 'withdrawable_balance' : 'holding_balance';
    const totalEarnedField = balance_type === 'withdrawable' ? 'total_earned_withdrawable' : 'total_earned_holding';

    const { error: updateError } = await supabaseClient
      .from('user_bsk_balances')
      .upsert({
        user_id: recipient_user_id,
        [balanceField]: oldBalance + amount,
        [totalEarnedField]: (currentBalance?.[totalEarnedField] || 0) + amount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Balance update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get new balance
    const newBalance = oldBalance + amount;

    // Create transaction record in insurance_bsk_ledger (which feeds unified_bsk_transactions view)
    const { data: txData, error: txError } = await supabaseClient
      .from('insurance_bsk_ledger')
      .insert({
        user_id: recipient_user_id,
        type: 'admin_credit',
        amount_bsk: amount,
        balance_type: balance_type,
        balance_before: oldBalance,
        balance_after: newBalance,
        rate_snapshot: 1,
        created_by: user.id,
        notes: reason,
        metadata: {
          admin_user_id: user.id,
          reason: reason,
          transfer_type: 'admin_credit'
        }
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction record error:', txError);
    }

    // Create audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'admin_bsk_transfer',
        resource_type: 'bsk_transfer',
        resource_id: recipient_user_id,
        new_values: {
          recipient_user_id,
          amount,
          balance_type,
          reason,
          old_balance: oldBalance,
          new_balance: newBalance
        }
      });

    console.log(`Successfully credited ${amount} BSK to user ${recipient_user_id}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: txData?.id,
        recipient_user_id,
        amount,
        balance_type,
        old_balance: oldBalance,
        new_balance: newBalance,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin BSK transfer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
