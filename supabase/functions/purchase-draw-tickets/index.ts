import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { drawId, ticketCount } = await req.json();
    console.log('[purchase-draw-tickets] User:', user.id, 'Draw:', drawId, 'Tickets:', ticketCount);

    if (!drawId || !ticketCount || ticketCount < 1) {
      throw new Error('Invalid input');
    }

    const { data: draw, error: drawError } = await supabaseClient
      .from('draw_templates')
      .select('*')
      .eq('id', drawId)
      .eq('is_active', true)
      .single();

    if (drawError || !draw) {
      throw new Error('Draw not found or inactive');
    }

    const { count: existingTickets } = await supabaseClient
      .from('draw_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('draw_id', drawId)
      .eq('user_id', user.id);

    const maxTicketsPerUser = 10;
    if ((existingTickets || 0) + ticketCount > maxTicketsPerUser) {
      throw new Error(`Cannot purchase more than ${maxTicketsPerUser} tickets per draw`);
    }

    const totalCost = draw.ticket_price_bsk * ticketCount;

    const { data: balance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError) throw new Error('Failed to fetch balance');
    if (!balance || balance.withdrawable_balance < totalCost) {
      throw new Error('Insufficient BSK balance');
    }

    const { error: deductError } = await supabaseClient
      .from('user_bsk_balances')
      .update({ withdrawable_balance: balance.withdrawable_balance - totalCost })
      .eq('user_id', user.id);

    if (deductError) throw deductError;

    const tickets = [];
    for (let i = 0; i < ticketCount; i++) {
      tickets.push({
        draw_id: drawId,
        user_id: user.id,
        ticket_number: `${drawId.substring(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase(),
        purchase_price_bsk: draw.ticket_price_bsk,
        status: 'active'
      });
    }

    const { data: createdTickets, error: ticketError } = await supabaseClient
      .from('draw_tickets')
      .insert(tickets)
      .select();

    if (ticketError) {
      await supabaseClient
        .from('user_bsk_balances')
        .update({ withdrawable_balance: balance.withdrawable_balance })
        .eq('user_id', user.id);
      throw ticketError;
    }

    await supabaseClient.from('bsk_withdrawable_ledger').insert({
      user_id: user.id,
      amount_bsk: -totalCost,
      tx_type: 'debit',
      tx_subtype: 'lucky_draw_purchase',
      reference_id: drawId,
      balance_before: balance.withdrawable_balance,
      balance_after: balance.withdrawable_balance - totalCost,
      notes: `Purchased ${ticketCount} lucky draw tickets`
    });

    console.log('✅ Tickets purchased:', createdTickets?.length);

    return new Response(
      JSON.stringify({
        success: true,
        tickets: createdTickets,
        remaining_balance: balance.withdrawable_balance - totalCost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
