import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { config_id, ticket_count, user_id } = await req.json();

    // Verify user owns this request
    if (user.id !== user_id) throw new Error('Unauthorized');

    // Get pool config
    const { data: config, error: configError } = await supabase
      .from('lucky_draw_configs')
      .select('*')
      .eq('id', config_id)
      .single();

    if (configError || !config) throw new Error('Pool not found');
    if (config.status !== 'active') throw new Error('Pool is not active');

    // Check if pool has space
    const spacesRemaining = config.pool_size - config.current_participants;
    if (ticket_count > spacesRemaining) {
      throw new Error(`Only ${spacesRemaining} tickets remaining`);
    }

    // Calculate total cost
    const totalCost = config.ticket_price_bsk * ticket_count;

    // Check user BSK balance
    const { data: balance } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user_id)
      .single();

    if (!balance || balance.withdrawable_balance < totalCost) {
      throw new Error('Insufficient BSK balance');
    }

    // Deduct BSK balance
    const { error: deductError } = await supabase
      .from('user_bsk_balances')
      .update({ 
        withdrawable_balance: balance.withdrawable_balance - totalCost 
      })
      .eq('user_id', user_id);

    if (deductError) throw deductError;

    // Create tickets
    const tickets = Array.from({ length: ticket_count }, (_, i) => ({
      user_id,
      config_id,
      ticket_number: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      ipg_paid: config.ticket_price_bsk
    }));

    const { error: ticketError } = await supabase
      .from('lucky_draw_tickets')
      .insert(tickets);

    if (ticketError) {
      // Rollback balance deduction
      await supabase
        .from('user_bsk_balances')
        .update({ 
          withdrawable_balance: balance.withdrawable_balance 
        })
        .eq('user_id', user_id);
      
      throw ticketError;
    }

    // Update pool participant count
    await supabase
      .from('lucky_draw_configs')
      .update({ 
        current_participants: config.current_participants + ticket_count 
      })
      .eq('id', config_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tickets_purchased: ticket_count,
        total_cost: totalCost 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
