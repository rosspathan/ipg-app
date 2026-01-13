import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceAdjustmentRequest {
  user_identifier: string;  // username or user_id
  asset_symbol: string;     // e.g. "USDT"
  amount: number;           // positive = credit, negative = debit
  reason: string;           // audit trail
  related_tx_hash?: string; // optional reference
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get admin user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Admin role check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: BalanceAdjustmentRequest = await req.json();
    const { user_identifier, asset_symbol, amount, reason, related_tx_hash } = body;

    // Validate inputs
    if (!user_identifier || !asset_symbol || amount === undefined || !reason) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_identifier, asset_symbol, amount, reason' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount === 0) {
      return new Response(JSON.stringify({ error: 'Amount cannot be zero' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ADMIN] Balance adjustment request by ${user.email}:`, {
      user_identifier,
      asset_symbol,
      amount,
      reason,
    });

    // Find target user by username or user_id
    let targetUserId: string;
    let targetUsername: string;

    // Try UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier);
    
    if (isUUID) {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('user_id, username')
        .eq('user_id', user_identifier)
        .single();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: `User not found: ${user_identifier}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = profile.user_id;
      targetUsername = profile.username || 'unknown';
    } else {
      // Try by username
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('user_id, username')
        .eq('username', user_identifier)
        .single();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: `User not found: ${user_identifier}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = profile.user_id;
      targetUsername = profile.username || 'unknown';
    }

    // Find asset
    const { data: asset, error: assetError } = await adminClient
      .from('assets')
      .select('id, symbol, name')
      .eq('symbol', asset_symbol.toUpperCase())
      .single();

    if (assetError || !asset) {
      return new Response(JSON.stringify({ error: `Asset not found: ${asset_symbol}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current balance
    const { data: currentBalance } = await adminClient
      .from('wallet_balances')
      .select('available, locked')
      .eq('user_id', targetUserId)
      .eq('asset_id', asset.id)
      .single();

    const beforeAvailable = currentBalance?.available || 0;
    const beforeLocked = currentBalance?.locked || 0;

    // For debit, check if sufficient balance
    if (amount < 0 && beforeAvailable < Math.abs(amount)) {
      return new Response(JSON.stringify({ 
        error: `Insufficient balance. Available: ${beforeAvailable} ${asset_symbol}, Requested debit: ${Math.abs(amount)}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const afterAvailable = beforeAvailable + amount;

    // Update balance
    const { error: updateError } = await adminClient
      .from('wallet_balances')
      .upsert({
        user_id: targetUserId,
        asset_id: asset.id,
        available: afterAvailable,
        locked: beforeLocked,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,asset_id',
      });

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log to trading_ledger
    const { error: ledgerError } = await adminClient
      .from('trading_ledger')
      .insert({
        user_id: targetUserId,
        asset_id: asset.id,
        entry_type: amount > 0 ? 'credit' : 'debit',
        amount: Math.abs(amount),
        balance_before: beforeAvailable,
        balance_after: afterAvailable,
        reference_type: 'admin_adjustment',
        reference_id: related_tx_hash || null,
        notes: `Admin adjustment by ${user.email}: ${reason}`,
      });

    if (ledgerError) {
      console.error('Failed to log to trading_ledger:', ledgerError);
      // Continue anyway, the balance was updated
    }

    // Log to admin_notifications for audit
    await adminClient
      .from('admin_notifications')
      .insert({
        type: 'balance_adjustment',
        title: `Balance Adjustment: ${targetUsername}`,
        message: `${amount > 0 ? 'Credited' : 'Debited'} ${Math.abs(amount)} ${asset_symbol} ${amount > 0 ? 'to' : 'from'} ${targetUsername}. Reason: ${reason}`,
        priority: 'high',
        related_user_id: targetUserId,
        metadata: {
          admin_user_id: user.id,
          admin_email: user.email,
          target_user_id: targetUserId,
          target_username: targetUsername,
          asset_symbol: asset_symbol,
          amount: amount,
          before_balance: beforeAvailable,
          after_balance: afterAvailable,
          reason: reason,
          related_tx_hash: related_tx_hash,
          timestamp: new Date().toISOString(),
        },
      });

    console.log(`[ADMIN] Balance adjustment successful:`, {
      admin: user.email,
      target: targetUsername,
      asset: asset_symbol,
      amount,
      before: beforeAvailable,
      after: afterAvailable,
    });

    return new Response(JSON.stringify({
      success: true,
      adjustment: {
        user_id: targetUserId,
        username: targetUsername,
        asset: asset_symbol,
        amount,
        before_balance: beforeAvailable,
        after_balance: afterAvailable,
        reason,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Admin balance adjustment error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
