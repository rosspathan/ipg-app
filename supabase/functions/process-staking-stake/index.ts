import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { plan_id, amount, idempotency_key } = await req.json();

    if (!plan_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan_id or amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key if not provided
    const idemKey = idempotency_key || `stake_${user.id}_${plan_id}_${Date.now()}`;

    console.log('[process-staking-stake] User:', user.id, 'Plan:', plan_id, 'Amount:', amount, 'Idem:', idemKey);

    const { data, error } = await supabase.rpc('execute_staking_stake', {
      p_user_id: user.id,
      p_plan_id: plan_id,
      p_amount: amount,
      p_idempotency_key: idemKey,
    });

    if (error) {
      console.error('[process-staking-stake] RPC error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-staking-stake] Success:', data);

    return new Response(
      JSON.stringify({
        success: true,
        stake_id: data.stake_id,
        staked_amount: data.net_staked,
        fee: data.fee,
        lock_until: data.lock_until,
        plan_name: data.plan_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-staking-stake] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
